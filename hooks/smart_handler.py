#!/usr/bin/env python3
"""
Claude Code Hooks - Smart Notification Handler
Intelligent, context-aware notification system for Claude Code
"""

import os
import sys
import json
import time
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

# Optional imports with fallbacks
try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    from plyer import notification as plyer_notification
    PLYER_AVAILABLE = True
except ImportError:
    PLYER_AVAILABLE = False


class ProjectType(Enum):
    REACT = "react"
    PYTHON = "python"
    DJANGO = "django"
    NEXTJS = "nextjs"
    DOCUMENTATION = "documentation"
    GENERIC = "generic"


class FileCategory(Enum):
    CRITICAL = "critical"      # package.json, requirements.txt, main configs
    SOURCE = "source"          # main source code files
    TEST = "test"             # test files
    CONFIG = "config"         # configuration files
    DOCS = "docs"             # documentation
    BUILD = "build"           # build/compiled files


class Priority(Enum):
    CRITICAL = 3  # All channels
    HIGH = 2      # Voice + System
    MEDIUM = 1    # System only
    LOW = 0       # Optional/minimal


@dataclass
class NotificationContext:
    event_type: str
    file_path: Optional[str]
    tool_name: Optional[str]
    project_type: ProjectType
    file_category: FileCategory
    priority: Priority
    message: str
    voice_pack: str


class SmartNotificationHandler:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.sounds_dir = project_root / "sounds"
        self.claude_dir = project_root / ".claude"
        
        # Throttling state
        self.last_notification_time = 0
        self.last_notification_hash = ""
        self.min_interval = 5.0  # 5 second minimum between similar notifications
        
        # Initialize audio if available
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.init()
                self.audio_initialized = True
            except:
                self.audio_initialized = False
        else:
            self.audio_initialized = False
        
        # Project detection cache
        self._project_type_cache = None
        
    def detect_project_type(self) -> ProjectType:
        """Detect project type based on files and structure"""
        if self._project_type_cache:
            return self._project_type_cache
            
        current_dir = Path.cwd()
        
        # Check for React/Next.js
        if (current_dir / "package.json").exists():
            try:
                with open(current_dir / "package.json") as f:
                    package_data = json.load(f)
                    dependencies = {**package_data.get("dependencies", {}), 
                                  **package_data.get("devDependencies", {})}
                    
                    if "next" in dependencies:
                        self._project_type_cache = ProjectType.NEXTJS
                    elif any(dep in dependencies for dep in ["react", "@types/react"]):
                        self._project_type_cache = ProjectType.REACT
                    else:
                        self._project_type_cache = ProjectType.GENERIC
                        
            except (json.JSONDecodeError, FileNotFoundError):
                self._project_type_cache = ProjectType.GENERIC
                
        # Check for Django
        elif (current_dir / "manage.py").exists():
            self._project_type_cache = ProjectType.DJANGO
            
        # Check for Python
        elif any((current_dir / f).exists() for f in ["requirements.txt", "pyproject.toml", "setup.py"]):
            self._project_type_cache = ProjectType.PYTHON
            
        # Check for documentation
        elif any((current_dir / f).exists() for f in ["mkdocs.yml", "docs/", "documentation/"]):
            self._project_type_cache = ProjectType.DOCUMENTATION
            
        else:
            self._project_type_cache = ProjectType.GENERIC
            
        return self._project_type_cache
    
    def categorize_file(self, file_path: str) -> FileCategory:
        """Categorize file by importance and type"""
        if not file_path:
            return FileCategory.CONFIG
            
        path = Path(file_path).name.lower()
        
        # Critical files
        critical_files = {
            "package.json", "requirements.txt", "pyproject.toml", "setup.py",
            "manage.py", "dockerfile", "docker-compose.yml", ".env"
        }
        if path in critical_files:
            return FileCategory.CRITICAL
            
        # Test files
        if any(pattern in path for pattern in ["test_", "_test", ".test.", "spec.", ".spec"]):
            return FileCategory.TEST
            
        # Documentation
        if any(pattern in path for pattern in [".md", ".rst", "readme", "changelog", "license"]):
            return FileCategory.DOCS
            
        # Configuration
        config_extensions = {".json", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf"}
        if any(path.endswith(ext) for ext in config_extensions):
            return FileCategory.CONFIG
            
        # Build files
        build_patterns = {"dist/", "build/", ".next/", "__pycache__/", "node_modules/"}
        if any(pattern in file_path for pattern in build_patterns):
            return FileCategory.BUILD
            
        # Source files (default)
        return FileCategory.SOURCE
    
    def calculate_priority(self, event_type: str, file_category: FileCategory) -> Priority:
        """Calculate notification priority based on context"""
        
        # Critical events always get high priority
        critical_events = {"user_input_needed", "error", "failure"}
        if event_type in critical_events:
            return Priority.CRITICAL
            
        # File-based priority
        if file_category == FileCategory.CRITICAL:
            return Priority.HIGH
        elif file_category == FileCategory.SOURCE:
            return Priority.MEDIUM
        elif file_category in [FileCategory.TEST, FileCategory.BUILD]:
            return Priority.LOW
        else:  # CONFIG, DOCS
            return Priority.MEDIUM
    
    def get_voice_pack(self, project_type: ProjectType) -> str:
        """Select voice pack based on project type"""
        voice_mapping = {
            ProjectType.PYTHON: "alfred",      # Formal, professional
            ProjectType.DJANGO: "alfred",
            ProjectType.REACT: "jarvis",       # Casual, modern
            ProjectType.NEXTJS: "jarvis",
            ProjectType.DOCUMENTATION: "cortana",  # Clear, professional
            ProjectType.GENERIC: "alfred"
        }
        return voice_mapping.get(project_type, "alfred")
    
    def should_throttle(self, context: NotificationContext) -> bool:
        """Check if notification should be throttled"""
        current_time = time.time()
        
        # Create hash of notification content for deduplication
        content_hash = hashlib.md5(
            f"{context.event_type}:{context.file_path}:{context.message}".encode()
        ).hexdigest()
        
        # Check if enough time has passed and content is different
        time_passed = current_time - self.last_notification_time
        is_different = content_hash != self.last_notification_hash
        
        if time_passed < self.min_interval and not is_different:
            return True  # Throttle
            
        # Update throttling state
        self.last_notification_time = current_time
        self.last_notification_hash = content_hash
        return False  # Don't throttle
    
    def generate_message(self, context: NotificationContext) -> str:
        """Generate contextual notification message"""
        project_name = self.project_root.name
        
        # Event-specific messages
        if context.event_type == "stop":
            if context.file_path:
                return f"Claude completed work on {Path(context.file_path).name} in {project_name}"
            else:
                return f"Claude session completed in {project_name}"
                
        elif context.event_type == "pre_tool_use":
            tool_messages = {
                "Edit": f"Editing {Path(context.file_path).name if context.file_path else 'file'}",
                "Write": f"Creating new file in {project_name}",
                "Bash": "Running command",
                "Read": f"Reading {Path(context.file_path).name if context.file_path else 'file'}",
                "Grep": "Searching codebase",
                "Task": "Starting specialized task"
            }
            return tool_messages.get(context.tool_name, f"Using {context.tool_name} tool")
            
        elif context.event_type == "notification":
            return f"Claude notification in {project_name}"
            
        return context.message or f"Claude activity in {project_name}"
    
    async def send_push_notification(self, context: NotificationContext) -> bool:
        """Send push notification via ntfy.sh"""
        if not HTTPX_AVAILABLE:
            return False
            
        try:
            # Generate secure topic based on project
            project_hash = hashlib.sha256(str(self.project_root).encode()).hexdigest()[:16]
            topic = f"claude-{project_hash}"
            
            # Priority mapping for ntfy
            ntfy_priority = {
                Priority.CRITICAL: 5,
                Priority.HIGH: 4,
                Priority.MEDIUM: 3,
                Priority.LOW: 2
            }.get(context.priority, 3)
            
            # Project-specific emojis
            emoji_map = {
                ProjectType.REACT: "⚛️",
                ProjectType.NEXTJS: "▲",
                ProjectType.PYTHON: "🐍",
                ProjectType.DJANGO: "🌱",
                ProjectType.DOCUMENTATION: "📚",
                ProjectType.GENERIC: "⚡"
            }
            emoji = emoji_map.get(context.project_type, "⚡")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://ntfy.sh/{topic}",
                    json={
                        "message": context.message,
                        "title": f"{emoji} Claude Code",
                        "priority": ntfy_priority,
                        "tags": [context.project_type.value, context.event_type]
                    },
                    timeout=5.0
                )
                return response.status_code == 200
                
        except Exception as e:
            print(f"Push notification failed: {e}", file=sys.stderr)
            return False
    
    def send_system_notification(self, context: NotificationContext) -> bool:
        """Send native system notification"""
        if not PLYER_AVAILABLE:
            # Fallback to macOS native osascript
            try:
                # Use subprocess with list to avoid shell escaping issues
                result = subprocess.run([
                    "osascript", "-e",
                    f'display notification "{context.message}" with title "Claude Code"'
                ], check=True, capture_output=False, text=True)
                return True
            except subprocess.CalledProcessError as e:
                print(f"AppleScript error: {e.stderr}", file=sys.stderr)
                # Try alternative approach with simpler message
                try:
                    subprocess.run([
                        "osascript", "-e",
                        'display notification "Claude Code notification" with title "Claude Code"'
                    ], check=True, capture_output=False)
                    return True
                except:
                    return False
            except Exception as e:
                print(f"System notification error: {e}", file=sys.stderr)
                return False
        
        try:
            plyer_notification.notify(
                title="Claude Code",
                message=context.message,
                timeout=5
            )
            return True
        except Exception as e:
            print(f"System notification failed: {e}", file=sys.stderr)
            return False
    
    def play_voice_notification(self, context: NotificationContext) -> bool:
        """Play voice notification with TTS fallback"""
        if not self.audio_initialized:
            # Fallback to system TTS on macOS
            try:
                subprocess.run([
                    "say", "-v", "Alex", context.message
                ], check=True, capture_output=False)
                return True
            except:
                return False
        
        # Try to play pre-recorded sound first
        voice_pack_dir = self.sounds_dir / context.voice_pack
        sound_files = {
            "stop": "task_complete.wav",
            "pre_tool_use": "working.wav", 
            "notification": "alert.wav"
        }
        
        sound_file = voice_pack_dir / sound_files.get(context.event_type, "alert.wav")
        
        if sound_file.exists():
            try:
                sound = pygame.mixer.Sound(str(sound_file))
                sound.play()
                return True
            except:
                pass
        
        # Fallback to system TTS
        try:
            subprocess.run([
                "say", "-v", "Alex", context.message
            ], check=True, capture_output=False)
            return True
        except:
            return False
    
    async def process_notification(self, event_type: str, file_path: Optional[str] = None, 
                                 tool_name: Optional[str] = None, custom_message: Optional[str] = None):
        """Main notification processing logic"""
        
        # Detect project context
        project_type = self.detect_project_type()
        file_category = self.categorize_file(file_path) if file_path else FileCategory.CONFIG
        priority = self.calculate_priority(event_type, file_category)
        voice_pack = self.get_voice_pack(project_type)
        
        # Create notification context
        context = NotificationContext(
            event_type=event_type,
            file_path=file_path,
            tool_name=tool_name,
            project_type=project_type,
            file_category=file_category,
            priority=priority,
            message=custom_message or self.generate_message(context),
            voice_pack=voice_pack
        )
        
        # Update message with generated content
        if not custom_message:
            context.message = self.generate_message(context)
        
        # Check throttling
        if self.should_throttle(context):
            return
        
        # Send notifications based on priority
        results = {}
        
        if priority == Priority.CRITICAL:
            # All channels for critical notifications
            results['push'] = await self.send_push_notification(context)
            results['system'] = self.send_system_notification(context) 
            results['voice'] = self.play_voice_notification(context)
            
        elif priority == Priority.HIGH:
            # Voice + System for high priority
            results['system'] = self.send_system_notification(context)
            results['voice'] = self.play_voice_notification(context)
            
        elif priority == Priority.MEDIUM:
            # System only for medium priority
            results['system'] = self.send_system_notification(context)
            
        # Low priority notifications are skipped unless explicitly requested
        
        return results


def main():
    """Main entry point for Claude Code hook integration"""
    import asyncio
    
    # Get project root (parent of hooks directory)
    project_root = Path(__file__).parent.parent
    handler = SmartNotificationHandler(project_root)
    
    # Get Claude Code hook environment variables
    event_type = os.getenv('CLAUDE_HOOK_EVENT', 'notification')
    file_path = os.getenv('CLAUDE_HOOK_FILE_PATH')
    tool_name = os.getenv('CLAUDE_HOOK_TOOL')
    
    # Custom message from command line args
    custom_message = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else None
    
    # Process notification
    try:
        results = asyncio.run(handler.process_notification(
            event_type=event_type,
            file_path=file_path,
            tool_name=tool_name,
            custom_message=custom_message
        ))
        
        if results:
            success_count = sum(1 for success in results.values() if success)
            total_count = len(results)
            print(f"Notification sent: {success_count}/{total_count} channels successful")
        
    except Exception as e:
        print(f"Notification handler error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()