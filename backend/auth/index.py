'''
Business: User authentication - register and login
Args: event - dict with httpMethod, body containing username/password
      context - object with request_id attribute
Returns: HTTP response with user data or error
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
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if method == 'POST':
        body = json.loads(event.get('body', '{}'))
        action = body.get('action')
        username = body.get('username', '').strip()
        password = body.get('password', '')
        
        if action == 'register':
            nickname = body.get('nickname', username)
            cur.execute(
                "SELECT id FROM users WHERE username = %s",
                (username,)
            )
            if cur.fetchone():
                conn.close()
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username already exists'})
                }
            
            cur.execute(
                "INSERT INTO users (username, password, nickname) VALUES (%s, %s, %s) RETURNING id, username, nickname, avatar_url",
                (username, password, nickname)
            )
            user = cur.fetchone()
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(user))
            }
        
        elif action == 'login':
            cur.execute(
                "SELECT id, username, nickname, avatar_url FROM users WHERE username = %s AND password = %s",
                (username, password)
            )
            user = cur.fetchone()
            
            if not user:
                conn.close()
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid credentials'})
                }
            
            cur.execute(
                "UPDATE users SET is_online = true WHERE id = %s",
                (user['id'],)
            )
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(dict(user))
            }
    
    conn.close()
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
