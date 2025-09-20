"""
Webhook Manager - Handles webhook registration and delivery
"""
import requests
import json
from typing import Dict, List, Any, Optional
import threading
import time


class WebhookManager:
    """Manages webhook endpoints and delivery"""
    
    def __init__(self):
        self.webhooks = {}
        self.delivery_queue = []
        self.retry_attempts = 3
        self.timeout = 10
    
    def register_webhook(self, name: str, url: str, events: List[str], 
                        secret: Optional[str] = None):
        """Register a webhook endpoint"""
        self.webhooks[name] = {
            'url': url,
            'events': events,
            'secret': secret,
            'active': True,
            'created_at': time.time()
        }
    
    def unregister_webhook(self, name: str):
        """Unregister a webhook endpoint"""
        self.webhooks.pop(name, None)
    
    def send_webhook(self, event_type: str, payload: Dict[str, Any]) -> Dict[str, bool]:
        """Send webhook to all registered endpoints for event type"""
        results = {}
        
        for name, webhook in self.webhooks.items():
            if webhook['active'] and event_type in webhook['events']:
                success = self._deliver_webhook(webhook, event_type, payload)
                results[name] = success
        
        return results
    
    def _deliver_webhook(self, webhook: Dict[str, Any], event_type: str, 
                        payload: Dict[str, Any]) -> bool:
        """Deliver webhook to a single endpoint"""
        webhook_payload = {
            'event': event_type,
            'data': payload,
            'timestamp': time.time()
        }
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Claude-Code-Webhook/1.0'
        }
        
        if webhook.get('secret'):
            # Add signature header for security
            headers['X-Webhook-Signature'] = self._generate_signature(
                webhook['secret'], json.dumps(webhook_payload)
            )
        
        for attempt in range(self.retry_attempts):
            try:
                response = requests.post(
                    webhook['url'],
                    json=webhook_payload,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code in [200, 201, 202]:
                    return True
                elif response.status_code >= 500:
                    # Server error, retry
                    time.sleep(2 ** attempt)
                    continue
                else:
                    # Client error, don't retry
                    return False
                    
            except requests.exceptions.RequestException:
                time.sleep(2 ** attempt)
                continue
        
        return False
    
    def _generate_signature(self, secret: str, payload: str) -> str:
        """Generate webhook signature for security"""
        import hmac
        import hashlib
        
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"sha256={signature}"
    
    def get_webhooks(self) -> Dict[str, Dict[str, Any]]:
        """Get all registered webhooks"""
        return self.webhooks.copy()
    
    def toggle_webhook(self, name: str, active: bool):
        """Enable or disable a webhook"""
        if name in self.webhooks:
            self.webhooks[name]['active'] = active
    
    def test_webhook(self, name: str) -> bool:
        """Test a webhook endpoint with ping event"""
        if name not in self.webhooks:
            return False
        
        test_payload = {'message': 'webhook test', 'timestamp': time.time()}
        return self._deliver_webhook(self.webhooks[name], 'ping', test_payload)