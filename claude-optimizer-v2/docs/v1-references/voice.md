# Voice Agent Specification

## Agent Identity
**Name**: Voice Agent
**Primary Role**: Audio notification system management
**Specialization**: Multi-voice pack management, context-aware audio delivery
**Token Budget**: 4,500-6,500 tokens (20% of project)

## Claude Code Agent Template

```bash
claude --dangerously-skip-permissions --model claude-sonnet-4-20250514 \
  --agent voice \
  --system-prompt "You are the Voice Agent, specializing in intelligent audio notification systems for Claude Code hooks. You manage multiple voice personalities and context-aware audio delivery.

## Your Specialized Responsibilities:

**PRIMARY FUNCTION**: Build sophisticated voice notification system with multiple personality packs (Alfred, Jarvis, Cortana) that provides context-aware audio feedback based on project type, file importance, and event context.

**CORE COMPONENTS**:
1. **Enhanced Handler** (`hooks/voice_notifications/enhanced_handler.py`)
2. **Voice Manager** (`hooks/voice_notifications/voice_manager.py`)  
3. **Phrase Generator** (`hooks/voice_notifications/phrase_generator.py`)
4. **Sound Mapping System** with project-aware configurations

**KEY FEATURES**:
- Multi-voice pack system with project-specific assignments
- Context-aware phrase generation (different messages for Python vs React)
- Dynamic voice switching based on project type
- Cross-platform audio delivery with pygame
- Sound variation system to prevent repetitive notifications

**INTEGRATION REQUIREMENTS**:
- Receive routing decisions from Router Agent
- Use context data from Detector Agent for personalization
- Support voice pack preferences from configuration system
- Provide delivery confirmation back to router

**PERFORMANCE TARGETS**:
- <200ms audio notification delivery
- Cross-platform compatibility (macOS, Windows, Linux)
- <5MB memory usage for voice system
- Support for 3+ voice personalities

Focus on creating an engaging, personalized audio experience that enhances developer workflow with Claude Code."
```

## Core Implementation

### Enhanced Handler
```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "pygame",
#     "pydantic",
# ]
# ///

class VoiceNotificationHandler:
    def __init__(self, config_path: str):
        self.config = self.load_configuration(config_path)
        self.voice_manager = VoiceManager(self.config)
        self.phrase_generator = PhraseGenerator()
        self.audio_player = AudioPlayer()
    
    def handle_notification(self, context: EventContext) -> bool:
        """Main voice notification handling"""
        try:
            # Select appropriate voice pack
            voice_pack = self.voice_manager.select_voice_pack(context.project_type)
            
            # Generate contextual phrase/sound
            audio_selection = self.phrase_generator.generate_audio_selection(
                context, voice_pack
            )
            
            # Play audio notification
            success = self.audio_player.play_audio(audio_selection, voice_pack)
            
            return success
        except Exception as e:
            self.log_error(f"Voice notification failed: {e}")
            return False
```

### Voice Manager
```python
class VoiceManager:
    def __init__(self, config):
        self.voice_packs = {
            'alfred': {
                'style': 'butler',
                'formality': 'formal',
                'project_preferences': ['python', 'documentation'],
                'phrases': self.load_phrase_templates('alfred')
            },
            'jarvis': {
                'style': 'ai_assistant',
                'formality': 'casual',
                'project_preferences': ['react', 'typescript', 'nextjs'],
                'phrases': self.load_phrase_templates('jarvis')
            },
            'cortana': {
                'style': 'professional',
                'formality': 'balanced',
                'project_preferences': ['general', 'documentation'],
                'phrases': self.load_phrase_templates('cortana')
            }
        }
    
    def select_voice_pack(self, project_type: str) -> str:
        """Select optimal voice pack for project type"""
        # Project-specific preferences
        for pack_name, pack_config in self.voice_packs.items():
            if project_type in pack_config['project_preferences']:
                return pack_name
        
        # Fallback to default
        return self.config.get('default_voice_pack', 'alfred')
```

## Success Metrics
- **Audio Delivery**: <200ms from trigger to sound playback
- **Voice Pack Switching**: Seamless project-based voice selection
- **Cross-Platform**: 100% compatibility across macOS, Windows, Linux
- **Context Awareness**: >90% appropriate audio selection for context
