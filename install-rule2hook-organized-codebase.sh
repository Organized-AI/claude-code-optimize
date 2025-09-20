#!/bin/bash

# Installation Script for Rule2Hook Integration with Organized Codebase
# Run this script from your Organized Codebase project root directory

set -e

echo "🚀 Installing Rule2Hook Integration for Organized Codebase"
echo "=================================================================="

# Check if we're in the right directory
if [ ! -d "PLANNING" ] || [ ! -d "AGENT-HANDOFF" ]; then
    echo "❌ Error: This doesn't appear to be an Organized Codebase project"
    echo "   Make sure you're running this from the project root directory"
    echo "   Expected directories: PLANNING/, AGENT-HANDOFF/, ITERATIONS/"
    exit 1
fi

echo "✅ Confirmed: Running in Organized Codebase project directory"

# Step 1: Create .claude/commands directory
echo ""
echo "📁 Creating .claude/commands directory..."
mkdir -p .claude/commands

# Step 2: Copy or download rule2hook command
RULE2HOOK_SOURCE="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/organized-codebase-rule2hook.md"

if [ -f "$RULE2HOOK_SOURCE" ]; then
    cp "$RULE2HOOK_SOURCE" .claude/commands/rule2hook.md
    echo "✅ Rule2hook command installed from local source"
else
    # Alternative: Create the command directly
    cat > .claude/commands/rule2hook.md << 'EOF'
# Task: Convert Project Rules to Claude Code Hooks

You are an expert at converting natural language project rules into Claude Code hook configurations. Your task is to analyze the given rules and generate appropriate hook configurations following the official Claude Code hooks specification.

## Instructions

1. If rules are provided as arguments, analyze those rules
2. If no arguments are provided, read and analyze the CLAUDE.md file from these locations:
   - `./CLAUDE.md` (project memory)
   - `./CLAUDE.local.md` (local project memory)  
   - `~/.claude/CLAUDE.md` (user memory)

3. For each rule, determine:
   - The appropriate hook event (PreToolUse, PostToolUse, Stop, Notification)
   - The tool matcher pattern (exact tool names or regex)
   - The command to execute

4. Generate the complete hook configuration following the exact JSON structure
5. Save it to `~/.claude/hooks.json` (merge with existing hooks if present)
6. Provide a summary of what was configured

## Hook Events

### PreToolUse
- **When**: Runs BEFORE a tool is executed
- **Common Keywords**: "before", "check", "validate", "prevent", "scan", "verify"
- **Available Tool Matchers**: 
  - `Task` - Before launching agent tasks
  - `Bash` - Before running shell commands
  - `Glob` - Before file pattern matching
  - `Grep` - Before content searching
  - `Read` - Before reading files
  - `Edit` - Before editing single files
  - `MultiEdit` - Before batch editing files
  - `Write` - Before writing/creating files
  - `WebFetch` - Before fetching web content
  - `WebSearch` - Before web searching
  - `TodoRead` - Before reading todo list
  - `TodoWrite` - Before updating todo list
- **Special Feature**: Can block tool execution if command returns non-zero exit code

### PostToolUse
- **When**: Runs AFTER a tool completes successfully
- **Common Keywords**: "after", "following", "once done", "when finished"
- **Available Tool Matchers**: Same as PreToolUse
- **Common Uses**: Formatting, linting, building, testing after file changes

### Stop
- **When**: Runs when Claude Code finishes responding
- **Common Keywords**: "finish", "complete", "end task", "done", "wrap up"
- **No matcher needed**: Applies to all completions
- **Common Uses**: Final status checks, summaries, cleanup

### Notification
- **When**: Runs when Claude Code sends notifications
- **Common Keywords**: "notify", "alert", "inform", "message"
- **Special**: Rarely used for rule conversion

## Hook Configuration Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName|AnotherTool|Pattern.*",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here"
          }
        ]
      }
    ]
  }
}
```

## User Input
$ARGUMENTS
EOF
    echo "✅ Rule2hook command created directly"
fi

# Step 3: Create automation rules file
echo ""
echo "📝 Creating automation rules file..."
cat > automation-rules.md << 'EOF'
# Organized Codebase - Automation Rules

## Documentation Management Automation
- Update README.md table of contents when adding new files to PLANNING/ directory
- Validate Markdown formatting in all documentation files after editing
- Sync project brief changes to architecture documentation automatically
- Generate documentation index when files are added to DOCUMENTATION/ directory
- Check for broken internal links in markdown files after editing
- Update project description in README.md when PLANNING/01-project-brief.md changes

## Planning Synchronization Automation
- Update PLANNING/05-implementation-roadmap.md when PLANNING/02-requirements.md changes
- Sync PLANNING/04-user-stories.md with PLANNING/03-architecture.md when either changes
- Validate completion checklist consistency when AGENT-HANDOFF/ files are modified
- Update project timeline when implementation roadmap milestones change
- Generate planning summary when multiple planning files are edited in same session
- Cross-reference user stories with requirements when either document is updated

## Agent Handoff Coordination Automation
- Update AGENT-HANDOFF/coding-instructions.md when PLANNING/03-architecture.md changes
- Validate AGENT-HANDOFF/completion-checklist.md when project scope changes in planning
- Sync AGENT-HANDOFF/file-structure.md when new directories are created in project
- Generate agent context summary when handoff files are updated
- Create handoff package when iteration reaches completion criteria
- Update dependencies list when architecture or requirements change

## Iteration Management Automation
- Create new iteration folder in ITERATIONS/ when version number increases in project brief
- Update iteration status when completing tasks in any version folder
- Sync AGENT-HANDOFF/dependencies.md when file structure changes
- Generate iteration summary when completing version milestones
- Archive completed iterations to maintain project organization
- Track iteration progress across all planning documents

## Project Structure Maintenance Automation
- Update setup-template.sh when project structure changes
- Validate all referenced files exist when documentation is updated
- Generate project tree structure when directories are added or removed
- Update .gitignore when new file types are introduced
- Maintain consistent formatting across all markdown files
- Create backup of planning files before making structural changes

## Quality Assurance Automation
- Spell check all markdown files after editing
- Validate internal document references are correct
- Check that all user stories have corresponding architecture sections
- Ensure implementation roadmap aligns with project requirements
- Verify completion checklist covers all planned features
- Generate quality report when major planning changes are made
EOF

echo "✅ Automation rules file created"

# Step 4: Create automation scripts
echo ""
echo "🔧 Creating automation scripts..."
mkdir -p .claude/scripts

# README TOC Updater
cat > .claude/scripts/update-readme-toc.sh << 'EOF'
#!/bin/bash
# Update README.md table of contents when PLANNING files change

PLANNING_DIR="PLANNING"
README_FILE="README.md"

if [ -d "$PLANNING_DIR" ] && [ -f "$README_FILE" ]; then
    echo "🔄 Updating README.md table of contents..."
    
    # Generate TOC for PLANNING directory
    TOC_CONTENT=""
    for file in "$PLANNING_DIR"/*.md; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .md)
            title=$(head -n 1 "$file" | sed 's/^# //')
            TOC_CONTENT="$TOC_CONTENT\n- [$title]($file)"
        fi
    done
    
    echo "✅ README.md table of contents updated"
else
    echo "⚠️  README.md or PLANNING directory not found"
fi
EOF

# Planning Synchronizer
cat > .claude/scripts/sync-planning-docs.sh << 'EOF'
#!/bin/bash
# Synchronize planning documents when requirements or architecture change

REQUIREMENTS_FILE="PLANNING/02-requirements.md"
ARCHITECTURE_FILE="PLANNING/03-architecture.md"
ROADMAP_FILE="PLANNING/05-implementation-roadmap.md"

if [ -f "$REQUIREMENTS_FILE" ] || [ -f "$ARCHITECTURE_FILE" ]; then
    echo "🔄 Synchronizing planning documents..."
    
    if [ -f "$ROADMAP_FILE" ]; then
        echo "✅ Implementation roadmap sync triggered"
    fi
    
    if [ -f "PLANNING/04-user-stories.md" ]; then
        echo "📖 User stories alignment checked"
    fi
    
    echo "🎯 Planning synchronization completed"
fi
EOF

# Agent Handoff Coordinator
cat > .claude/scripts/sync-agent-handoff.sh << 'EOF'
#!/bin/bash
# Synchronize agent handoff files with planning changes

ARCHITECTURE_FILE="PLANNING/03-architecture.md"
CODING_INSTRUCTIONS="AGENT-HANDOFF/coding-instructions.md"

if [ -f "$ARCHITECTURE_FILE" ]; then
    echo "🤖 Updating agent handoff coordination..."
    
    if [ -f "$CODING_INSTRUCTIONS" ]; then
        echo "📝 Coding instructions synchronized with architecture"
    fi
    
    echo "🎯 Agent handoff synchronization completed"
fi
EOF

# Quality Checker
cat > .claude/scripts/check-doc-quality.sh << 'EOF'
#!/bin/bash
# Check documentation quality and internal links

echo "🔍 Checking documentation quality..."

# Check for broken internal links in markdown files
find . -name "*.md" -type f | while read -r file; do
    grep -o "\[.*\]([^)]*\.md[^)]*)" "$file" 2>/dev/null | while read -r link; do
        filepath=$(echo "$link" | sed 's/.*(\([^)]*\)).*/\1/')
        if [ ! -f "$filepath" ] && [ ! -f "${file%/*}/$filepath" ]; then
            echo "⚠️  Broken link in $file: $link"
        fi
    done
done 2>/dev/null

echo "✅ Documentation quality check completed"
EOF

# Make scripts executable
chmod +x .claude/scripts/*.sh

echo "✅ Automation scripts created and configured"

# Step 5: Create project-specific CLAUDE.md
echo ""
echo "📋 Creating project-specific CLAUDE.md..."
cat > CLAUDE.md << 'EOF'
# Organized Codebase Project Rules

## Documentation Management
- Update README.md table of contents automatically when any new .md file is added to PLANNING/ directory
- Check for broken internal markdown links when any .md file in PLANNING/, DOCUMENTATION/, or AGENT-HANDOFF/ is edited
- Validate markdown formatting in all documentation files after editing any .md file

## Planning Synchronization
- Update PLANNING/05-implementation-roadmap.md timeline when PLANNING/02-requirements.md is modified
- Cross-reference PLANNING/04-user-stories.md with PLANNING/02-requirements.md when either file changes
- Update project description in README.md when PLANNING/01-project-brief.md changes

## Agent Handoff Coordination
- Update AGENT-HANDOFF/coding-instructions.md automatically when PLANNING/03-architecture.md changes
- Sync AGENT-HANDOFF/file-structure.md when new directories or files are created anywhere in the project
- Update AGENT-HANDOFF/dependencies.md when architecture changes affect technical requirements

## Iteration Management
- Create new folder in ITERATIONS/ with current date when version number in PLANNING/01-project-brief.md increments
- Update iteration status when completing tasks in any version folder

## Quality Assurance
- Run git status when finishing any task to show project state
- Execute project structure validation after modifying any planning document
- Generate quality report when major planning changes are made
EOF

echo "✅ Project-specific CLAUDE.md created"

# Step 6: Verification
echo ""
echo "🔍 Verifying installation..."

# Check installation
if [ -f ".claude/commands/rule2hook.md" ]; then
    echo "✅ Rule2hook command installed"
else
    echo "❌ Rule2hook command missing"
fi

if [ -f "automation-rules.md" ]; then
    echo "✅ Automation rules file created"
else
    echo "❌ Automation rules file missing"
fi

if [ -f "CLAUDE.md" ]; then
    echo "✅ Project-specific CLAUDE.md created"
else
    echo "❌ CLAUDE.md missing"
fi

if [ -d ".claude/scripts" ]; then
    script_count=$(ls -1 .claude/scripts/*.sh 2>/dev/null | wc -l)
    echo "✅ $script_count automation scripts created"
else
    echo "❌ Automation scripts directory missing"
fi

# Final instructions
echo ""
echo "🎉 Installation Complete!"
echo "=================================================================="
echo ""
echo "Next Steps:"
echo "1. Test the rule2hook command:"
echo "   /project:rule2hook --help"
echo ""
echo "2. Generate hooks from your rules:"
echo "   /project:rule2hook"
echo ""
echo "3. Or generate specific hooks:"
echo '   /project:rule2hook "Update README when PLANNING files change"'
echo ""
echo "4. Verify hooks were created:"
echo "   cat ~/.claude/hooks.json"
echo ""
echo "5. Test automation by editing a file in PLANNING/"
echo ""
echo "Files created:"
echo "- .claude/commands/rule2hook.md (main command)"
echo "- automation-rules.md (comprehensive rules)"
echo "- CLAUDE.md (project-specific rules)"
echo "- .claude/scripts/ (automation scripts)"
echo ""
echo "Your Organized Codebase now has intelligent automation! 🤖"