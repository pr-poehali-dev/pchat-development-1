'''
Business: Chat operations - get chats, create chats, send messages
Args: event - dict with httpMethod, queryStringParameters, body
      context - object with request_id attribute
Returns: HTTP response with chat data or messages
'''
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'})
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {}) or {}
        chat_id = query_params.get('chatId')
        
        if chat_id:
            cur.execute("""
                SELECT m.id, m.content, m.file_url, m.is_read, m.created_at, m.is_edited,
                       m.sender_id, u.nickname as sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.created_at ASC
            """, (chat_id,))
            messages = cur.fetchall()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps([dict(m) for m in messages], default=str)
            }
        else:
            cur.execute("""
                SELECT DISTINCT c.id, 
                       CASE 
                         WHEN c.is_group THEN c.name
                         ELSE (SELECT u.nickname FROM users u 
                               JOIN chat_members cm2 ON u.id = cm2.user_id 
                               WHERE cm2.chat_id = c.id AND u.id != %s LIMIT 1)
                       END as name,
                       c.avatar_url, c.is_group, c.creator_id,
                       (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
                FROM chats c
                JOIN chat_members cm ON c.id = cm.chat_id
                WHERE cm.user_id = %s
                ORDER BY last_message_time DESC NULLS LAST
            """, (user_id, user_id))
            chats = cur.fetchall()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps([dict(c) for c in chats], default=str)
            }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'create_chat':
            other_username = body.get('username')
            
            cur.execute("SELECT id FROM users WHERE username = %s", (other_username,))
            other_user = cur.fetchone()
            
            if not other_user:
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'})
                }
            
            cur.execute("""
                INSERT INTO chats (is_group, creator_id) 
                VALUES (false, %s) RETURNING id
            """, (user_id,))
            chat = cur.fetchone()
            chat_id = chat['id']
            
            cur.execute(
                "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                (chat_id, user_id, chat_id, other_user['id'])
            )
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chat_id': chat_id})
            }
        
        elif action == 'create_group':
            group_name = body.get('name')
            avatar_url = body.get('avatar_url')
            member_usernames = body.get('members', [])
            
            cur.execute("""
                INSERT INTO chats (name, avatar_url, is_group, creator_id)
                VALUES (%s, %s, true, %s) RETURNING id
            """, (group_name, avatar_url, user_id))
            chat = cur.fetchone()
            chat_id = chat['id']
            
            cur.execute(
                "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
                (chat_id, user_id)
            )
            
            for username in member_usernames:
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                member = cur.fetchone()
                if member:
                    cur.execute(
                        "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
                        (chat_id, member['id'])
                    )
            
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chat_id': chat_id})
            }
        
        elif action == 'leave_group':
            chat_id = body.get('chat_id')
            
            cur.execute("SELECT nickname FROM users WHERE id = %s", (user_id,))
            user_data = cur.fetchone()
            nickname = user_data['nickname'] if user_data else 'Пользователь'
            
            cur.execute(
                "INSERT INTO messages (chat_id, sender_id, content) VALUES (%s, %s, %s)",
                (chat_id, user_id, f"[Системное] {nickname} покинул(а) группу")
            )
            
            cur.execute(
                "DELETE FROM chat_members WHERE chat_id = %s AND user_id = %s",
                (chat_id, user_id)
            )
            
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'get_group_members':
            chat_id = body.get('chat_id')
            
            cur.execute("""
                SELECT u.id, u.username, u.nickname, u.avatar_url,
                       c.creator_id
                FROM users u
                JOIN chat_members cm ON u.id = cm.user_id
                JOIN chats c ON c.id = cm.chat_id
                WHERE cm.chat_id = %s
            """, (chat_id,))
            members = cur.fetchall()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps([dict(m) for m in members], default=str)
            }
        
        elif action == 'update_group':
            chat_id = body.get('chat_id')
            group_name = body.get('name')
            avatar_url = body.get('avatar_url')
            
            cur.execute("""
                UPDATE chats SET name = %s, avatar_url = %s
                WHERE id = %s AND creator_id = %s
            """, (group_name, avatar_url, chat_id, user_id))
            
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'remove_member':
            chat_id = body.get('chat_id')
            member_id = body.get('member_id')
            
            cur.execute(
                "SELECT creator_id FROM chats WHERE id = %s",
                (chat_id,)
            )
            chat_data = cur.fetchone()
            
            if chat_data and str(chat_data['creator_id']) == str(user_id):
                cur.execute(
                    "DELETE FROM chat_members WHERE chat_id = %s AND user_id = %s",
                    (chat_id, member_id)
                )
                conn.commit()
            
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'update_group_avatar':
            chat_id = body.get('chat_id')
            avatar_url = body.get('avatar_url')
            
            cur.execute("""
                UPDATE chats SET avatar_url = %s
                WHERE id = %s AND creator_id = %s
            """, (avatar_url, chat_id, user_id))
            
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'send_message':
            chat_id = body.get('chat_id')
            content = body.get('content', '')
            file_url = body.get('file_url')
            
            cur.execute("""
                INSERT INTO messages (chat_id, sender_id, content, file_url)
                VALUES (%s, %s, %s, %s) RETURNING id, created_at
            """, (chat_id, user_id, content, file_url))
            message = cur.fetchone()
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(message), default=str)
            }
        
        elif action == 'edit_message':
            message_id = body.get('message_id')
            new_content = body.get('content')
            
            cur.execute("""
                UPDATE messages 
                SET content = %s, is_edited = true 
                WHERE id = %s AND sender_id = %s
                RETURNING id
            """, (new_content, message_id, user_id))
            
            result = cur.fetchone()
            conn.commit()
            conn.close()
            
            if result:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
            else:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Cannot edit this message'})
                }
        
        elif action == 'delete_message':
            message_id = body.get('message_id')
            
            cur.execute("""
                DELETE FROM messages 
                WHERE id = %s AND sender_id = %s
                RETURNING id
            """, (message_id, user_id))
            
            result = cur.fetchone()
            conn.commit()
            conn.close()
            
            if result:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True})
                }
            else:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Cannot delete this message'})
                }
    
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }