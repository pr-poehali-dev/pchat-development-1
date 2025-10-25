'''
Business: File upload handler for images
Args: event - dict with httpMethod, body containing base64 image
      context - object with request_id attribute
Returns: HTTP response with file URL
'''
import json
import os
import base64
import uuid
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        body_str = event.get('body', '')
        
        if event.get('isBase64Encoded'):
            try:
                body_bytes = base64.b64decode(body_str)
                
                file_id = str(uuid.uuid4())
                file_base64 = base64.b64encode(body_bytes).decode('utf-8')
                
                content_type = event.get('headers', {}).get('content-type', 'application/octet-stream')
                if 'audio' in content_type or body_str.startswith('AAAAHGZ'):
                    file_url = f"data:audio/webm;base64,{file_base64}"
                elif 'image' in content_type or content_type.startswith('image/'):
                    file_url = f"data:image/png;base64,{file_base64}"
                else:
                    file_url = f"data:application/octet-stream;base64,{file_base64}"
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'url': file_url})
                }
            except Exception as e:
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': str(e)})
                }
        
        try:
            body = json.loads(body_str) if body_str else {}
            file_data = body.get('file')
            
            if not file_data:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'isBase64Encoded': False,
                    'body': json.dumps({'error': 'No file provided'})
                }
            
            if ',' in file_data:
                file_data = file_data.split(',')[1]
            
            file_bytes = base64.b64decode(file_data)
            file_id = str(uuid.uuid4())
            file_url = f"data:image/png;base64,{file_data}"
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'url': file_url})
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'isBase64Encoded': False,
                'body': json.dumps({'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }