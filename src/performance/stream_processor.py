"""
Stream Processor - Handles real-time data stream processing
"""
import queue
import threading
from typing import Callable, Any, Optional


class StreamProcessor:
    """Processes real-time data streams"""
    
    def __init__(self, buffer_size: int = 1000):
        self.buffer_size = buffer_size
        self.data_queue = queue.Queue(maxsize=buffer_size)
        self.processors = []
        self.running = False
        self.worker_thread = None
    
    def add_processor(self, processor_func: Callable[[Any], Any]):
        """Add a data processing function"""
        self.processors.append(processor_func)
    
    def start(self):
        """Start the stream processor"""
        if not self.running:
            self.running = True
            self.worker_thread = threading.Thread(target=self._process_loop)
            self.worker_thread.start()
    
    def stop(self):
        """Stop the stream processor"""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join()
    
    def push_data(self, data: Any) -> bool:
        """Push data to the processing queue"""
        try:
            self.data_queue.put_nowait(data)
            return True
        except queue.Full:
            return False
    
    def _process_loop(self):
        """Main processing loop"""
        while self.running:
            try:
                data = self.data_queue.get(timeout=1.0)
                for processor in self.processors:
                    try:
                        data = processor(data)
                    except Exception as e:
                        print(f"Processor error: {e}")
                self.data_queue.task_done()
            except queue.Empty:
                continue
    
    def get_queue_size(self) -> int:
        """Get current queue size"""
        return self.data_queue.qsize()