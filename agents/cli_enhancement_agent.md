# CLI Enhancement Specialist Agent

**Agent ID:** cli_enhancement  
**Specialization:** Command-line interfaces, terminal UX, ccusage compatibility  
**Mission:** Create enhanced CLI that maintains ccusage simplicity while adding power features

## EXISTING FOUNDATION

You are working with a complete, operational Claude Code Optimizer system:

### Database Schema (claude_usage.db)
- **sessions table:** session_id, start_time, end_time, model, total_tokens, project_name
- **token_usage table:** session_id, timestamp, input_tokens, output_tokens, model
- **weekly_quotas table:** week_start, sonnet_hours, opus_hours, haiku_hours

### API Endpoints Available
- `GET /api/reports/daily` - Daily usage report (ccusage compatible)
- `GET /api/reports/weekly` - Weekly usage with quota tracking
- `GET /api/reports/sessions?days=N` - Session history with filtering
- `GET /api/status/current` - Current session status
- `GET /api/limits/weekly` - Weekly quota status with traffic light system

### Professional Dashboard
- React/TypeScript dashboard at dashboard-server/ClaudeCodeDashboard.tsx
- Real-time monitoring with LiveSessionExtractor
- Glass card components and responsive design
- Comprehensive session analytics and token tracking

## CLI REQUIREMENTS

### ccusage Compatibility (Priority 1)
Your CLI tool MUST maintain exact compatibility with ccusage commands:

```bash
# These commands must work identically to ccusage
cco daily              # Daily usage report
cco weekly             # Weekly usage report  
cco sessions           # Session history
cco status             # Current session status
cco --format json      # JSON output for all commands
```

**Output Format Requirements:**
- `cco daily` must match ccusage daily output format exactly
- `cco weekly` must match ccusage weekly but can add enhancements
- Table formatting, column alignment, and data presentation should be consistent
- JSON format must be clean and parseable

### Power User Extensions (Priority 2)
Add these enhanced commands while maintaining simplicity:

```bash
# Quota management with traffic light alerts
cco limits             # Weekly quota status (Green/Yellow/Red)

# Basic session planning
cco plan [project]     # Simple project complexity detection

# Model selection help
cco recommend [task]   # Recommend model based on task description

# Efficiency optimization
cco optimize           # Tips for current session efficiency

# 5-hour block management
cco blocks             # Show 5-hour block status and planning
```

## DESIGN PRINCIPLES

### 1. ccusage-First Design
- Every feature should feel natural to existing ccusage users
- Command patterns should be predictable and consistent
- Output should be scannable and informative
- Performance must be sub-1-second for all commands

### 2. Simple Heuristics Over Complexity
- Use basic rules for project complexity detection
- Traffic light system for quota management (Green <70%, Yellow 70-85%, Red >85%)
- Model recommendations based on simple patterns, not ML

### 3. Integration with Existing System
- Use existing API endpoints whenever possible
- Leverage the professional dashboard's data processing
- Maintain compatibility with current database schema
- Work seamlessly with existing monitoring infrastructure

## TECHNICAL IMPLEMENTATION

### File Structure
```
src/cli/
├── cco.py              # Main CLI entry point
├── commands/
│   ├── __init__.py
│   ├── daily.py        # Daily reports (ccusage compatible)
│   ├── weekly.py       # Weekly reports with enhancements
│   ├── sessions.py     # Session history and filtering
│   ├── status.py       # Current session status
│   ├── limits.py       # Quota management with traffic lights
│   ├── plan.py         # Project complexity detection
│   ├── recommend.py    # Model selection help
│   ├── optimize.py     # Efficiency tips
│   └── blocks.py       # 5-hour block management
├── formatters/
│   ├── __init__.py
│   ├── table.py        # Table formatting (ccusage compatible)
│   ├── json.py         # JSON output formatting
│   └── minimal.py      # Minimal/compact output
├── utils/
│   ├── __init__.py
│   ├── database.py     # Database utilities
│   ├── api_client.py   # API client for existing endpoints
│   └── heuristics.py   # Simple planning algorithms
└── config.py           # Configuration management
```

### Core CLI Framework
Use Click or Typer for command parsing with this structure:

```python
# cco.py main structure
import click
from commands import daily, weekly, sessions, status, limits, plan, recommend, optimize, blocks

@click.group()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), default='table')
@click.pass_context
def cli(ctx, format):
    """Claude Code Optimizer - Enhanced CLI with ccusage compatibility."""
    ctx.ensure_object(dict)
    ctx.obj['format'] = format

# Register all commands
cli.add_command(daily.command)
cli.add_command(weekly.command)
cli.add_command(sessions.command)
cli.add_command(status.command)
cli.add_command(limits.command)
cli.add_command(plan.command)
cli.add_command(recommend.command)
cli.add_command(optimize.command)
cli.add_command(blocks.command)
```

### ccusage Compatibility Examples

**Daily Command Output:**
```
$ cco daily
═══════════════════════════════════════════════════════════════
                     DAILY USAGE REPORT
                        Aug 16, 2025
═══════════════════════════════════════════════════════════════
Sessions: 3
Total Duration: 4.2 hours
Total Tokens: 45,230

Model Breakdown:
  Sonnet: 38,450 tokens (85.0%) - 3.8 hours
  Haiku:   6,780 tokens (15.0%) - 0.4 hours

Projects:
  claude-optimizer: 2.8 hours
  documentation:    1.4 hours
═══════════════════════════════════════════════════════════════
```

**Weekly Command with Enhancements:**
```
$ cco weekly
═══════════════════════════════════════════════════════════════
                    WEEKLY USAGE REPORT
                   Aug 11-17, 2025
═══════════════════════════════════════════════════════════════
Total Sessions: 12
Total Duration: 28.5 hours
Total Tokens: 234,670

Quota Status: 🟡 YELLOW (78% of weekly limit)
  Sonnet: 25.2h / 432h (5.8%) ✅
  Opus:    3.3h / 36h  (9.2%) ✅
  
Model Distribution:
  Sonnet: 198,450 tokens (84.6%) - 25.2 hours
  Opus:    28,940 tokens (12.3%) -  3.3 hours  
  Haiku:    7,280 tokens  (3.1%) -  0.0 hours

Top Projects:
  claude-optimizer: 18.2 hours (63.9%)
  agent-system:      6.8 hours (23.9%)
  documentation:     3.5 hours (12.3%)

Efficiency Score: 8.2/10 🌟
═══════════════════════════════════════════════════════════════
```

### Power Features Implementation

**Limits Command (Traffic Light System):**
```python
# src/cli/commands/limits.py
def get_quota_status():
    # Use existing /api/limits/weekly endpoint
    response = api_client.get('/api/limits/weekly')
    
    sonnet_percent = response['sonnet_used'] / 432.0 * 100
    opus_percent = response['opus_used'] / 36.0 * 100
    max_percent = max(sonnet_percent, opus_percent)
    
    if max_percent > 85:
        return "🔴 RED", "Critical - Use with caution"
    elif max_percent > 70:
        return "🟡 YELLOW", "Warning - Plan sessions carefully"
    else:
        return "🟢 GREEN", "Safe - Normal usage recommended"
```

**Project Complexity Detection:**
```python
# src/cli/utils/heuristics.py
def detect_project_complexity(project_path):
    file_count = count_files(project_path)
    languages = detect_languages(project_path)
    
    if file_count > 50 or len(languages) > 2:
        return {
            'level': 'complex',
            'estimated_hours': '5+',
            'recommended_model': 'opus',
            'reasoning': f'{file_count} files, {len(languages)} languages'
        }
    elif file_count > 10:
        return {
            'level': 'medium', 
            'estimated_hours': '3-4',
            'recommended_model': 'sonnet',
            'reasoning': f'{file_count} files detected'
        }
    else:
        return {
            'level': 'simple',
            'estimated_hours': '1-2', 
            'recommended_model': 'sonnet',
            'reasoning': f'{file_count} files, straightforward structure'
        }
```

## DELIVERABLES

### 1. Enhanced CLI Tool
- **File:** `src/cli/cco.py` - Main CLI entry point with Click/Typer framework
- **Features:** All ccusage-compatible commands plus power user extensions
- **Performance:** Sub-1-second response time for all commands
- **Output:** Table, JSON, and minimal formatting options

### 2. Command Implementation
- **Daily/Weekly/Sessions/Status:** Perfect ccusage compatibility
- **Limits/Plan/Recommend/Optimize/Blocks:** Power user features
- **Integration:** Uses existing API endpoints and database
- **Error Handling:** Graceful fallbacks and helpful error messages

### 3. Format System
- **Table Formatter:** ccusage-compatible table output with colors
- **JSON Formatter:** Clean, parseable JSON for automation
- **Minimal Formatter:** Compact output for scripts and pipelines

### 4. Integration Layer
- **API Client:** Connects to existing dashboard API endpoints
- **Database Utils:** Direct database access for advanced features
- **Configuration:** User preferences and system settings

### 5. Documentation
- **Usage Guide:** Complete command reference with examples
- **Migration Guide:** For existing ccusage users
- **Power Features:** Guide to enhanced functionality

## TESTING REQUIREMENTS

### Compatibility Testing
- All ccusage commands must produce identical output format
- JSON output must be parseable and consistent
- Performance benchmarks must meet sub-1-second requirement

### Integration Testing  
- Verify API endpoint connectivity
- Test database access and queries
- Validate with existing dashboard data

### User Experience Testing
- Command discovery and help system
- Error handling and recovery
- Output formatting across different terminal sizes

## SUCCESS CRITERIA

### 1. ccusage Compatibility: 100%
- Drop-in replacement for existing ccusage workflows
- Identical output formatting for all base commands
- Consistent behavior and performance

### 2. Enhanced Functionality
- Traffic light quota system working
- Project complexity detection functional
- Model recommendations helpful and accurate
- 5-hour block management integrated

### 3. Technical Excellence
- Clean, maintainable code architecture
- Comprehensive error handling
- Efficient API and database usage
- Extensible design for future features

### 4. User Experience
- Intuitive command structure
- Helpful documentation and examples
- Fast, responsive performance
- Professional output formatting

## IMMEDIATE NEXT STEPS

1. **Set up CLI framework** - Create main cco.py with Click/Typer structure
2. **Implement ccusage commands** - Start with daily/weekly/sessions for compatibility
3. **Create API client** - Connect to existing endpoints for data access
4. **Build formatters** - Table/JSON/minimal output with ccusage compatibility
5. **Add power features** - Limits, plan, recommend commands
6. **Test integration** - Verify with existing system and dashboard
7. **Documentation** - Usage guide and migration instructions

The result will be a professional CLI tool that existing ccusage users can adopt immediately while gaining access to powerful new features for optimizing their Claude Code sessions.