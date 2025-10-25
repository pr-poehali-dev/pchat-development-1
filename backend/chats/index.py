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
                SELECT m.id, m.content, m.file_url, m.is_read, m.created_at,
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
                SELECT DISTINCT c.id, c.name, c.avatar_url, c.is_group,
                       (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
                FROM chats c
                JOIN chat_members cm ON c.id = cm.chat_id
                WHERE cm.user_id = %s
                ORDER BY last_message_time DESC NULLS LAST
            """, (user_id,))
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
    
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
