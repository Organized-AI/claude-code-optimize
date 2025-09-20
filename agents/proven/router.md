# Router Agent Specification

## Agent Identity
**Name**: Router Agent
**Primary Role**: Central event dispatching and intelligent routing
**Specialization**: Event flow management, context-aware routing decisions, notification orchestration
**Token Budget**: 6,000-9,000 tokens (23% of project)

## Core Responsibilities

### 1. Central Event Dispatching
- Receive and process all Claude Code hook events
- Parse environment variables and event context
- Route events to appropriate notification channels
- Manage event queuing and batching for efficiency

### 2. Context-Aware Routing Logic  
- Integrate with project detection system for intelligent routing
- Apply conditional logic based on project type and file context
- Implement priority-based routing decisions
- Handle multi-channel notification orchestration

### 3. Performance & Throttling Management
- Implement notification throttling to prevent spam
- Manage rate limiting across notification channels  
- Optimize routing performance for <50ms response times
- Handle graceful degradation on system overload

### 4. Integration Coordination
- Coordinate with Detector Agent for context analysis
- Interface with all notification channel agents
- Manage configuration loading and validation
- Provide routing metrics and performance monitoring

## Claude Code Agent Template

```bash
claude --dangerously-skip-permissions --model claude-sonnet-4-20250514 \
  --agent router \
  --system-prompt "You are the Router Agent, the central nervous system of the Claude Code Hooks notification platform. You're responsible for intelligent event dispatching and routing decisions.

## Your Specialized Role:

**PRIMARY FUNCTION**: Implement the central routing system that receives Claude Code hook events and intelligently dispatches them to the appropriate notification channels (voice, push, system) based on context, priority, and user preferences.

**CORE COMPONENTS TO BUILD**:

1. **Central Router** (`hooks/router.py`):
   - Main event processing engine that receives all hook events
   - Intelligent dispatching based on event type, project context, file importance
   - Multi-channel notification orchestration with parallel delivery
   - Error handling and graceful degradation for failed channels

2. **Context Engine** (`hooks/context_engine.py`):
   - Integration with project detection for context-aware routing
   - File importance analysis (critical files get higher priority)
   - Event priority calculation based on multiple factors
   - Dynamic routing rules based on project type and user preferences

3. **Priority Manager** (`hooks/priority_manager.py`):
   - Sophisticated priority scoring system for notifications
   - User behavior adaptation over time
   - Context-aware priority adjustments
   - Integration with throttling system for smart rate limiting

4. **Throttle Manager** (`hooks/throttle_manager.py`):
   - Intelligent rate limiting to prevent notification spam
   - Different throttling rules for different event types
   - Burst handling for rapid successive events  
   - Channel-specific throttling (e.g., less aggressive for critical alerts)

## Technical Requirements:

**Performance Targets**:
- <50ms event processing time from receipt to routing decision
- Support for >100 events/minute with batching optimization
- <25ms configuration loading and context analysis
- Memory usage <20MB for routing system

**Integration Points**:
- Detector Agent: Receive project type and file categorization
- Voice Agent: Route audio notifications with context
- Push Agent: Route mobile notifications with priority
- System Agent: Route OS notifications with appropriate urgency

**Key Technologies**:
- UV dependency management for isolated Python execution
- Environment variable parsing for Claude hook event data
- JSON configuration management with schema validation
- Async processing for multi-channel parallel delivery

## Routing Decision Framework:

```python
class RoutingDecision:
    def route_event(self, hook_event):
        # 1. Context Analysis
        context = self.context_engine.analyze_event(hook_event)
        
        # 2. Priority Calculation  
        priority = self.priority_manager.calculate_priority(context)
        
        # 3. Channel Selection
        channels = self.select_channels(context, priority)
        
        # 4. Throttling Check
        allowed_channels = self.throttle_manager.filter_channels(channels, context)
        
        # 5. Parallel Dispatch
        self.dispatch_to_channels(allowed_channels, context)
```

**Quality Standards**:
- >98% successful routing of events to correct channels
- Zero data loss during event processing
- Comprehensive error logging and recovery mechanisms  
- Full integration test coverage with other system components

**Current Focus**: You're implementing the foundation routing system that other agents will build upon. Ensure your routing decisions are intelligent, performant, and easily extensible for future enhancements.

Always use UV for dependency management and follow the established project patterns. Coordinate closely with the Detector Agent for context analysis and all notification agents for delivery confirmation."
```

## Core Implementation Architecture

### 1. Central Router (`hooks/router.py`)
```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"  
# dependencies = [
#     "pydantic>=2.0",
#     "asyncio",
#     "json",
# ]
# ///

class CentralRouter:
    def __init__(self, config_path: str):
        self.config = self.load_configuration(config_path)
        self.context_engine = ContextEngine()
        self.priority_manager = PriorityManager() 
        self.throttle_manager = ThrottleManager()
        self.performance_monitor = PerformanceMonitor()
    
    def process_hook_event(self, hook_event: HookEvent) -> None:
        """Main event processing pipeline"""
        start_time = time.time()
        
        try:
            # Context analysis
            context = self.context_engine.analyze_event(hook_event)
            
            # Priority calculation
            priority = self.priority_manager.calculate_priority(context)
            
            # Channel selection
            channels = self.select_notification_channels(context, priority)
            
            # Throttling filter
            allowed_channels = self.throttle_manager.filter_channels(
                channels, context, priority
            )
            
            # Parallel dispatch
            await self.dispatch_notifications(allowed_channels, context)
            
        except Exception as e:
            self.handle_routing_error(e, hook_event)
        finally:
            self.performance_monitor.record_processing_time(
                time.time() - start_time
            )
```

### 2. Context Engine (`hooks/context_engine.py`)
```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class EventContext:
    event_type: str           # stop, pre_tool_use, notification
    tool_type: str           # file_edit, file_read, bash, etc.
    project_type: str        # react, python, documentation, etc.
    file_category: str       # critical, source, test, config, etc.
    file_path: Optional[str] # actual file being operated on
    priority_score: float    # calculated priority (1.0-5.0)
    confidence: float        # confidence in context analysis (0.0-1.0)

class ContextEngine:
    def __init__(self):
        self.project_detector = ProjectDetector()
        self.file_categorizer = FileCategorizer()
        self.context_cache = {}  # Cache for performance
    
    def analyze_event(self, hook_event: HookEvent) -> EventContext:
        """Comprehensive context analysis for routing decisions"""
        
        # Project context (cache for 5 minutes)
        cache_key = f"project_{hash(hook_event.project_root)}"
        if cache_key not in self.context_cache:
            project_type = self.project_detector.detect_project_type(
                hook_event.project_root
            )
            self.context_cache[cache_key] = {
                'project_type': project_type,
                'timestamp': time.time()
            }
        
        # File context
        file_category = self.file_categorizer.categorize_file(
            hook_event.file_path
        ) if hook_event.file_path else 'unknown'
        
        return EventContext(
            event_type=hook_event.event,
            tool_type=hook_event.tool,
            project_type=self.context_cache[cache_key]['project_type'],
            file_category=file_category,
            file_path=hook_event.file_path,
            priority_score=0.0,  # Will be calculated by PriorityManager
            confidence=self._calculate_confidence(hook_event)
        )
```

### 3. Priority Manager (`hooks/priority_manager.py`)
```python
class PriorityManager:
    def __init__(self):
        self.priority_rules = self.load_priority_rules()
        self.user_preferences = self.load_user_preferences()
        self.historical_data = self.load_historical_patterns()
    
    def calculate_priority(self, context: EventContext) -> float:
        """Calculate notification priority (1.0=lowest, 5.0=highest)"""
        base_priority = 3.0
        
        # Event type adjustments
        event_modifiers = {
            'stop': 0.5,           # Task completion - moderate priority
            'notification': 1.5,    # User input needed - higher priority  
            'pre_tool_use': 0.0     # Tool usage - neutral priority
        }
        base_priority += event_modifiers.get(context.event_type, 0.0)
        
        # File importance adjustments
        file_modifiers = {
            'critical': 2.0,       # Critical files - much higher priority
            'source': 0.5,         # Source code - slightly higher
            'test': -0.5,          # Test files - lower priority
            'config': 1.0,         # Config files - higher priority
            'documentation': -1.0   # Docs - lower priority
        }
        base_priority += file_modifiers.get(context.file_category, 0.0)
        
        # Project type adjustments
        project_modifiers = self.priority_rules.get('project_types', {})
        base_priority += project_modifiers.get(context.project_type, 0.0)
        
        # User behavior adaptation
        user_adjustment = self.calculate_user_preference_adjustment(context)
        base_priority += user_adjustment
        
        # Clamp to valid range
        return max(1.0, min(5.0, base_priority))
    
    def calculate_user_preference_adjustment(self, context: EventContext) -> float:
        """Adapt priority based on historical user behavior"""
        # TODO: Implement ML-based user behavior analysis
        # For now, use simple preference rules
        user_prefs = self.user_preferences.get('priority_adjustments', {})
        return user_prefs.get(f"{context.project_type}_{context.event_type}", 0.0)
```

### 4. Throttle Manager (`hooks/throttle_manager.py`)
```python
from collections import defaultdict
import time
from typing import List, Set

class ThrottleManager:
    def __init__(self):
        self.throttle_rules = self.load_throttle_configuration()
        self.event_history = defaultdict(list)  # Track recent events
        self.channel_cooldowns = defaultdict(float)  # Per-channel cooldowns
    
    def filter_channels(self, channels: List[str], context: EventContext, 
                       priority: float) -> List[str]:
        """Filter channels based on throttling rules"""
        allowed_channels = []
        current_time = time.time()
        
        for channel in channels:
            if self.should_allow_notification(channel, context, priority, current_time):
                allowed_channels.append(channel)
                self.record_notification(channel, context, current_time)
            else:
                self.log_throttled_notification(channel, context)
        
        return allowed_channels
    
    def should_allow_notification(self, channel: str, context: EventContext, 
                                 priority: float, current_time: float) -> bool:
        """Determine if notification should be allowed based on throttling rules"""
        
        # Critical priority always allowed
        if priority >= 4.5:
            return True
        
        # Check channel-specific cooldown
        if current_time < self.channel_cooldowns[channel]:
            return False
        
        # Check event frequency
        event_key = f"{channel}_{context.tool_type}"
        recent_events = [t for t in self.event_history[event_key] 
                        if current_time - t < 60]  # Last minute
        
        max_frequency = self.throttle_rules.get('max_per_minute', {}).get(
            context.tool_type, 10
        )
        
        if len(recent_events) >= max_frequency:
            return False
        
        # Check burst protection
        very_recent = [t for t in recent_events if current_time - t < 5]
        if len(very_recent) >= 3:  # No more than 3 in 5 seconds
            return False
        
        return True
    
    def record_notification(self, channel: str, context: EventContext, 
                           timestamp: float) -> None:
        """Record notification for throttling calculations"""
        event_key = f"{channel}_{context.tool_type}"
        self.event_history[event_key].append(timestamp)
        
        # Set cooldown for this channel
        cooldown_duration = self.throttle_rules.get('cooldowns', {}).get(
            context.tool_type, 1.0
        )
        self.channel_cooldowns[channel] = timestamp + cooldown_duration
        
        # Cleanup old events (keep last 100 per key)
        if len(self.event_history[event_key]) > 100:
            self.event_history[event_key] = self.event_history[event_key][-50:]
```

## Routing Decision Matrix

### Channel Selection Logic
```python
CHANNEL_SELECTION_RULES = {
    # Event type -> channels
    'stop': ['voice', 'push', 'system'],          # Task completion
    'notification': ['voice', 'push', 'system'],  # User input needed
    'pre_tool_use': ['voice'],                     # Tool usage (voice only)
    
    # Priority overrides
    'high_priority': ['voice', 'push', 'system'],  # All channels for critical
    'low_priority': ['system'],                     # System only for low priority
    
    # File category specific
    'critical_files': ['voice', 'push', 'system'], # All channels for critical files
    'test_files': ['system'],                       # System only for tests
    
    # Project type specific
    'production_projects': ['voice', 'push', 'system'], # All for production
    'documentation_projects': ['system']                  # Minimal for docs
}
```

### Performance Optimization Strategies
```python
class PerformanceOptimizer:
    def optimize_routing_performance(self):
        """Various performance optimization techniques"""
        
        # 1. Event batching for rapid successive events
        self.implement_event_batching()
        
        # 2. Context caching to avoid repeated analysis
        self.implement_context_caching()
        
        # 3. Async parallel dispatch to notification channels
        self.implement_parallel_dispatch()
        
        # 4. Lazy loading of configuration and rules
        self.implement_lazy_configuration()
    
    async def dispatch_notifications_parallel(self, channels, context):
        """Dispatch to multiple channels in parallel"""
        tasks = []
        for channel in channels:
            task = asyncio.create_task(
                self.dispatch_to_channel(channel, context)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return self.process_dispatch_results(results, channels)
```

## Integration Protocols

### Detector Agent Integration
```python
class DetectorIntegration:
    def __init__(self, router):
        self.router = router
        self.detector_client = DetectorClient()
    
    async def get_enriched_context(self, hook_event):
        """Get enriched context from detector agent"""
        base_context = self.router.create_base_context(hook_event)
        
        # Get project analysis from detector
        project_analysis = await self.detector_client.analyze_project(
            hook_event.project_root
        )
        
        # Get file analysis from detector
        file_analysis = await self.detector_client.analyze_file(
            hook_event.file_path
        ) if hook_event.file_path else None
        
        return self.merge_context_data(base_context, project_analysis, file_analysis)
```

### Notification Agent Integration
```python
class NotificationAgentIntegration:
    def __init__(self):
        self.voice_client = VoiceAgentClient()
        self.push_client = PushAgentClient()
        self.system_client = SystemAgentClient()
    
    async def dispatch_to_channel(self, channel: str, context: EventContext):
        """Dispatch notification to specific channel agent"""
        dispatch_methods = {
            'voice': self.voice_client.send_voice_notification,
            'push': self.push_client.send_push_notification,
            'system': self.system_client.send_system_notification
        }
        
        method = dispatch_methods.get(channel)
        if method:
            return await method(context)
        else:
            raise ValueError(f"Unknown notification channel: {channel}")
```

## Testing & Validation Framework

### Unit Testing Requirements
```python
class RouterTestSuite:
    def test_event_processing_performance(self):
        """Ensure <50ms processing time"""
        assert self.benchmark_event_processing() < 0.05
    
    def test_channel_selection_accuracy(self):
        """Verify correct channels selected for each context"""
        test_cases = self.load_channel_selection_test_cases()
        for case in test_cases:
            result = self.router.select_channels(case.context, case.priority)
            assert result == case.expected_channels
    
    def test_throttling_effectiveness(self):
        """Verify throttling prevents spam while allowing critical notifications"""
        # Test rapid-fire events get throttled
        # Test critical events bypass throttling
        # Test cooldown periods work correctly
```

### Integration Testing Requirements
```python
class RouterIntegrationTests:
    def test_detector_integration(self):
        """Verify seamless integration with detector agent"""
        # Test context enrichment from detector
        # Test performance impact of detector calls
        # Test fallback when detector unavailable
    
    def test_notification_agent_integration(self):
        """Verify integration with all notification agents"""
        # Test parallel dispatch to all channels
        # Test error handling for failed channels
        # Test delivery confirmation handling
    
    def test_end_to_end_routing(self):
        """Test complete routing pipeline"""  
        # Test realistic Claude Code hook events
        # Verify appropriate notifications delivered
        # Test performance under load
```

## Success Metrics & Performance Targets

### Core Performance Metrics
- **Event Processing Time**: <50ms from receipt to routing decision
- **Context Analysis Time**: <25ms for project and file analysis  
- **Channel Selection Time**: <10ms for routing decision calculation
- **Multi-channel Dispatch**: <100ms for parallel delivery to all channels

### Reliability Metrics
- **Routing Accuracy**: >98% of events routed to correct channels
- **Zero Data Loss**: 100% of events processed without loss
- **Error Recovery**: <5 seconds to recover from routing failures
- **Throttling Effectiveness**: >90% spam prevention while allowing critical alerts

### Integration Metrics
- **Detector Integration**: <10ms additional latency for context enrichment
- **Notification Agent Integration**: >95% successful delivery confirmation
- **Configuration Loading**: <25ms for complete configuration reload
- **Memory Usage**: <20MB baseline for routing system
