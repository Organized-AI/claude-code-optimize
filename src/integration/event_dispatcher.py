"""
Event Dispatcher - Manages event routing and handling
"""
import asyncio
from typing import Dict, Callable, Any, List


class EventDispatcher:
    """Dispatches events to registered handlers"""
    
    def __init__(self):
        self.handlers = {}
        self.middleware = []
        self.event_queue = asyncio.Queue()
        self.running = False
    
    def register_handler(self, event_type: str, handler: Callable[[Dict[str, Any]], Any]):
        """Register an event handler"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
    
    def unregister_handler(self, event_type: str, handler: Callable[[Dict[str, Any]], Any]):
        """Unregister an event handler"""
        if event_type in self.handlers:
            try:
                self.handlers[event_type].remove(handler)
            except ValueError:
                pass
    
    def add_middleware(self, middleware_func: Callable[[Dict[str, Any]], Dict[str, Any]]):
        """Add middleware to process events before handling"""
        self.middleware.append(middleware_func)
    
    async def dispatch(self, event_type: str, event_data: Dict[str, Any]):
        """Dispatch an event to registered handlers"""
        event = {
            'type': event_type,
            'data': event_data,
            'timestamp': asyncio.get_event_loop().time()
        }
        
        # Apply middleware
        for middleware in self.middleware:
            try:
                event = middleware(event)
            except Exception as e:
                print(f"Middleware error: {e}")
        
        await self.event_queue.put(event)
    
    async def start(self):
        """Start the event dispatcher"""
        self.running = True
        while self.running:
            try:
                event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                await self._handle_event(event)
            except asyncio.TimeoutError:
                continue
    
    def stop(self):
        """Stop the event dispatcher"""
        self.running = False
    
    async def _handle_event(self, event: Dict[str, Any]):
        """Handle a single event"""
        event_type = event['type']
        event_data = event['data']
        
        if event_type in self.handlers:
            for handler in self.handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event_data)
                    else:
                        handler(event_data)
                except Exception as e:
                    print(f"Handler error for {event_type}: {e}")
    
    def get_registered_events(self) -> List[str]:
        """Get list of registered event types"""
        return list(self.handlers.keys())
    
    def get_handler_count(self, event_type: str) -> int:
        """Get number of handlers for an event type"""
        return len(self.handlers.get(event_type, []))