'''
Business: User profile management - update nickname, avatar, settings
Args: event - dict with httpMethod, body containing profile updates
      context - object with request_id attribute
Returns: HTTP response with updated user data
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
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
        cur.execute("""
            SELECT id, username, nickname, avatar_url, hide_online_status
            FROM users WHERE id = %s
        """, (user_id,))
        user = cur.fetchone()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(dict(user) if user else {})
        }
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        
        if action == 'update_profile':
            nickname = body.get('nickname')
            avatar_url = body.get('avatar_url')
            hide_online_status = body.get('hide_online_status')
            
            updates = []
            params = []
            
            if nickname is not None:
                updates.append("nickname = %s")
                params.append(nickname)
            
            if avatar_url is not None:
                updates.append("avatar_url = %s")
                params.append(avatar_url)
            
            if hide_online_status is not None:
                updates.append("hide_online_status = %s")
                params.append(hide_online_status)
            
            if updates:
                params.append(user_id)
                query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, username, nickname, avatar_url, hide_online_status"
                cur.execute(query, params)
                user = cur.fetchone()
                conn.commit()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(dict(user) if user else {})
                }
            
            conn.close()
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'logout':
            cur.execute("UPDATE users SET is_online = false WHERE id = %s", (user_id,))
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
        
        elif action == 'delete_account':
            cur.execute("DELETE FROM messages WHERE sender_id = %s", (user_id,))
            cur.execute("DELETE FROM chat_members WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM chats WHERE creator_id = %s", (user_id,))
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True})
            }
    
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }