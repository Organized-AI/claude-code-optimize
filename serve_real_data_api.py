#!/usr/bin/env python3
"""
Simple API server to serve real Claude Code session data
"""
import sqlite3
import json
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse as urlparse

class RealDataHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse the path
        parsed_path = urlparse.urlparse(self.path)
        path = parsed_path.path
        
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        try:
            if path == '/api/sessions/active':
                self.serve_active_sessions()
            elif path == '/api/analytics/current':
                self.serve_current_analytics()
            elif path == '/get_session_details':
                self.serve_session_details()
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            self.send_error(500, str(e))
    
    def serve_active_sessions(self):
        """Serve real active sessions from database"""
        conn = sqlite3.connect('claude_usage.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, session_type, real_total_tokens, models_used, 
                   project_path, is_active, start_time
            FROM real_sessions 
            WHERE session_type = 'claude_code'
            ORDER BY start_time DESC
        """)
        
        sessions = []
        for row in cursor.fetchall():
            session_id, session_type, tokens, model, project, active, start_time = row
            sessions.append({
                'id': session_id,
                'type': session_type,
                'tokens': tokens,
                'model': model,
                'project': project,
                'active': bool(active),
                'start_time': start_time,
                'real_data': True
            })
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(sessions).encode())
    
    def serve_current_analytics(self):
        """Serve current analytics with real data"""
        conn = sqlite3.connect('claude_usage.db')
        cursor = conn.cursor()
        
        # Get total tokens
        cursor.execute("SELECT SUM(real_total_tokens) FROM real_sessions WHERE session_type = 'claude_code'")
        total_tokens = cursor.fetchone()[0] or 0
        
        # Get session count
        cursor.execute("SELECT COUNT(*) FROM real_sessions WHERE session_type = 'claude_code'")
        session_count = cursor.fetchone()[0] or 0
        
        conn.close()
        
        analytics = {
            'total_tokens': total_tokens,
            'session_count': session_count,
            'data_source': 'real_jsonl_extraction',
            'last_updated': datetime.now().isoformat()
        }
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(analytics).encode())
    
    def serve_session_details(self):
        """Serve detailed session information"""
        conn = sqlite3.connect('claude_usage.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT models_used, token_extraction_method, metadata
            FROM real_sessions 
            WHERE session_type = 'claude_code'
            ORDER BY start_time DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        if result:
            model, method, metadata = result
            details = {
                'model': model,
                'method': method,
                'metadata': metadata
            }
        else:
            details = {
                'model': 'N/A',
                'method': 'N/A',
                'metadata': '{}'
            }
        
        conn.close()
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(details).encode())

def run_server(port=3002):
    server = HTTPServer(('localhost', port), RealDataHandler)
    print(f"🌐 Real Data API Server running on http://localhost:{port}")
    print("📊 Endpoints:")
    print(f"   • http://localhost:{port}/api/sessions/active")
    print(f"   • http://localhost:{port}/api/analytics/current") 
    print(f"   • http://localhost:{port}/get_session_details")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    run_server()
