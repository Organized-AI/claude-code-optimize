"""
Real-time Updater - Handles real-time data updates
"""
import asyncio
import time
from typing import Dict, Callable, Any, List


class RealtimeUpdater:
    """Manages real-time data updates and notifications"""
    
    def __init__(self):
        self.subscribers = {}
        self.update_queue = asyncio.Queue()
        self.running = False
    
    def subscribe(self, channel: str, callback: Callable[[Any], None]):
        """Subscribe to real-time updates for a channel"""
        if channel not in self.subscribers:
            self.subscribers[channel] = []
        self.subscribers[channel].append(callback)
    
    def unsubscribe(self, channel: str, callback: Callable[[Any], None]):
        """Unsubscribe from a channel"""
        if channel in self.subscribers:
            try:
                self.subscribers[channel].remove(callback)
            except ValueError:
                pass
    
    async def publish(self, channel: str, data: Any):
        """Publish data to a channel"""
        update = {
            'channel': channel,
            'data': data,
            'timestamp': time.time()
        }
        await self.update_queue.put(update)
    
    async def start(self):
        """Start the real-time updater"""
        self.running = True
        while self.running:
            try:
                update = await asyncio.wait_for(self.update_queue.get(), timeout=1.0)
                await self._process_update(update)
            except asyncio.TimeoutError:
                continue
    
    def stop(self):
        """Stop the real-time updater"""
        self.running = False
    
    async def _process_update(self, update: Dict[str, Any]):
        """Process an update and notify subscribers"""
        channel = update['channel']
        data = update['data']
        
        if channel in self.subscribers:
            for callback in self.subscribers[channel]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    print(f"Update callback error: {e}")
    
    def get_channels(self) -> List[str]:
        """Get list of active channels"""
        return list(self.subscribers.keys())