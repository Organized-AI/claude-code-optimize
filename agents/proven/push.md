# Push Agent Specification

## Agent Identity
**Name**: Push Agent
**Primary Role**: Mobile push notification delivery system
**Specialization**: Priority-based push notifications, secure topic management
**Token Budget**: 3,000-4,500 tokens (12% of project)

## Claude Code Agent Template

```bash
claude --dangerously-skip-permissions --model claude-sonnet-4-20250514 \
  --agent push \
  --system-prompt "You are the Push Agent, responsible for intelligent mobile push notification delivery through ntfy.sh service. You manage priority-based notifications and secure topic management.

## Your Specialized Responsibilities:

**PRIMARY FUNCTION**: Implement secure, priority-based push notification system that delivers contextually appropriate mobile alerts for Claude Code events.

**CORE COMPONENTS**:
1. **Enhanced Handler** (`hooks/push_notifications/enhanced_handler.py`)
2. **Priority System** (`hooks/push_notifications/priority_system.py`)
3. **Topic Manager** (`hooks/push_notifications/topic_manager.py`)
4. **Message Templates** with project-aware formatting

**KEY FEATURES**:
- ntfy.sh integration for reliable push delivery
- Priority-based notification routing (high/medium/low)
- Secure topic generation with project-specific hashing
- Message templating with context-aware content
- Delivery confirmation and retry logic

**INTEGRATION REQUIREMENTS**:
- Process routing decisions from Router Agent
- Apply priority scores from priority management system
- Use project context for appropriate message formatting
- Handle throttling and rate limiting gracefully

**PERFORMANCE TARGETS**:
- <500ms push notification delivery
- >99% delivery success rate
- Secure topic management (no topic collisions)
- Smart batching for rapid successive events

Focus on reliable, secure, and contextually appropriate push notifications that keep developers informed without causing notification fatigue."
```

## Core Implementation

### Enhanced Handler
```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "httpx",
#     "pydantic",
# ]
# ///

import httpx
import hashlib
import json
from typing import Optional

class PushNotificationHandler:
    def __init__(self, config_path: str):
        self.config = self.load_configuration(config_path)
        self.client = httpx.AsyncClient(timeout=10.0)
        self.topic_manager = TopicManager(self.config)
        self.priority_system = PrioritySystem()
        self.message_formatter = MessageFormatter()
    
    async def send_notification(self, context: EventContext) -> bool:
        """Send push notification with priority and context awareness"""
        try:
            # Generate secure topic
            topic = self.topic_manager.get_topic_for_project(context.project_type)
            
            # Format message based on context
            message_data = self.message_formatter.format_message(context)
            
            # Determine priority level
            priority_level = self.priority_system.get_priority_level(context.priority_score)
            
            # Send notification
            response = await self.client.post(
                f"https://ntfy.sh/{topic}",
                headers={
                    "Title": message_data.title,
                    "Priority": priority_level,
                    "Tags": message_data.tags,
                    "Icon": message_data.icon
                },
                data=message_data.body
            )
            
            return response.status_code == 200
            
        except Exception as e:
            self.log_error(f"Push notification failed: {e}")
            return False
```

### Topic Manager
```python
class TopicManager:
    def __init__(self, config):
        self.config = config
        self.base_topic = config.get('push_notifications', {}).get('base_topic', 'claude-hooks')
        self.project_salt = config.get('project_salt', 'default-salt')
    
    def get_topic_for_project(self, project_type: str) -> str:
        """Generate secure, unique topic for project"""
        # Create hash of project info for security
        project_hash = hashlib.sha256(
            f"{self.project_salt}-{project_type}".encode()
        ).hexdigest()[:8]
        
        return f"{self.base_topic}-{project_type}-{project_hash}"
    
    def generate_personal_topic(self, user_id: str) -> str:
        """Generate personal topic for user"""
        user_hash = hashlib.sha256(
            f"{self.project_salt}-{user_id}".encode()
        ).hexdigest()[:12]
        
        return f"{self.base_topic}-personal-{user_hash}"
```

### Message Formatter
```python
class MessageFormatter:
    def __init__(self):
        self.templates = self.load_message_templates()
        self.project_icons = self.load_project_icons()
    
    def format_message(self, context: EventContext) -> MessageData:
        """Format contextually appropriate message"""
        template_key = f"{context.event_type}_{context.project_type}"
        template = self.templates.get(template_key) or self.templates.get(context.event_type)
        
        title = template['title'].format(
            project_type=context.project_type.title(),
            tool_type=context.tool_type,
            file_category=context.file_category
        )
        
        body = template['body'].format(
            file_path=context.file_path or 'project files',
            event_type=context.event_type
        )
        
        icon = self.project_icons.get(context.project_type, '🔧')
        tags = self.generate_tags(context)
        
        return MessageData(title=title, body=body, icon=icon, tags=tags)
```

## Success Metrics
- **Delivery Success**: >99% push notification delivery rate
- **Delivery Speed**: <500ms from trigger to mobile device
- **Security**: Zero topic collisions, secure topic generation
- **Context Accuracy**: >95% contextually appropriate messages
