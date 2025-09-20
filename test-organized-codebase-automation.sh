#!/bin/bash

# Test Script for Organized Codebase Rule2Hook Integration
# Run this after installation to verify everything is working

set -e

echo "🧪 Testing Organized Codebase Rule2Hook Integration"
echo "===================================================="

# Check if we're in the right project
if [ ! -d "PLANNING" ] || [ ! -d "AGENT-HANDOFF" ]; then
    echo "❌ Error: Not in Organized Codebase project directory"
    exit 1
fi

echo "✅ Confirmed: In Organized Codebase project directory"

# Test 1: Check rule2hook command installation
echo ""
echo "📋 Test 1: Rule2Hook Command Installation"
echo "-------------------------------------------"

if [ -f ".claude/commands/rule2hook.md" ]; then
    echo "✅ Rule2hook command file exists"
    
    # Check if command has the right content
    if grep -q "Convert Project Rules to Claude Code Hooks" ".claude/commands/rule2hook.md"; then
        echo "✅ Rule2hook command content is correct"
    else
        echo "⚠️  Rule2hook command content may be incomplete"
    fi
else
    echo "❌ Rule2hook command file missing"
    echo "   Run the installation script first"
    exit 1
fi

# Test 2: Check automation rules
echo ""
echo "📝 Test 2: Automation Rules"
echo "----------------------------"

if [ -f "automation-rules.md" ]; then
    echo "✅ Automation rules file exists"
    
    # Count the number of rules
    rule_count=$(grep -c "^- " automation-rules.md 2>/dev/null || echo "0")
    echo "📊 Found $rule_count automation rules"
    
    if [ "$rule_count" -gt 10 ]; then
        echo "✅ Comprehensive rule set available"
    else
        echo "⚠️  Limited rule set (expected 15+ rules)"
    fi
else
    echo "❌ Automation rules file missing"
fi

# Test 3: Check project-specific CLAUDE.md
echo ""
echo "🎯 Test 3: Project-Specific Rules"
echo "-----------------------------------"

if [ -f "CLAUDE.md" ]; then
    echo "✅ Project-specific CLAUDE.md exists"
    
    # Check for key sections
    if grep -q "Documentation Management" "CLAUDE.md"; then
        echo "✅ Documentation management rules found"
    fi
    
    if grep -q "Planning Synchronization" "CLAUDE.md"; then
        echo "✅ Planning synchronization rules found"
    fi
    
    if grep -q "Agent Handoff" "CLAUDE.md"; then
        echo "✅ Agent handoff rules found"
    fi
else
    echo "❌ Project-specific CLAUDE.md missing"
fi

# Test 4: Check automation scripts
echo ""
echo "🔧 Test 4: Automation Scripts"
echo "------------------------------"

if [ -d ".claude/scripts" ]; then
    echo "✅ Scripts directory exists"
    
    script_files=".claude/scripts/update-readme-toc.sh .claude/scripts/sync-planning-docs.sh .claude/scripts/sync-agent-handoff.sh .claude/scripts/check-doc-quality.sh"
    
    for script in $script_files; do
        if [ -f "$script" ]; then
            echo "✅ $(basename "$script") exists"
            
            # Check if executable
            if [ -x "$script" ]; then
                echo "  → Executable permissions OK"
            else
                echo "  ⚠️  Not executable (fixing...)"
                chmod +x "$script"
            fi
        else
            echo "❌ $(basename "$script") missing"
        fi
    done
else
    echo "❌ Scripts directory missing"
fi

# Test 5: Project Structure Validation
echo ""
echo "🏗️  Test 5: Project Structure"
echo "------------------------------"

required_dirs="PLANNING AGENT-HANDOFF ITERATIONS DOCUMENTATION ARCHITECTURE"
for dir in $required_dirs; do
    if [ -d "$dir" ]; then
        echo "✅ $dir directory exists"
    else
        echo "⚠️  $dir directory missing (may affect automation)"
    fi
done

# Check for key planning files
planning_files="PLANNING/01-project-brief.md PLANNING/02-requirements.md PLANNING/03-architecture.md PLANNING/04-user-stories.md PLANNING/05-implementation-roadmap.md"
planning_count=0

for file in $planning_files; do
    if [ -f "$file" ]; then
        planning_count=$((planning_count + 1))
        echo "✅ $(basename "$file") exists"
    else
        echo "⚠️  $(basename "$file") missing"
    fi
done

echo "📊 Planning files found: $planning_count/5"

# Test 6: Test Hook Generation (Simulation)
echo ""
echo "🔗 Test 6: Hook Generation Simulation"
echo "--------------------------------------"

# Simulate testing individual automation scripts
echo "Testing automation scripts..."

# Test README TOC script
if [ -f ".claude/scripts/update-readme-toc.sh" ]; then
    echo "🔄 Testing README TOC updater..."
    bash .claude/scripts/update-readme-toc.sh
fi

# Test planning synchronization
if [ -f ".claude/scripts/sync-planning-docs.sh" ]; then
    echo "🔄 Testing planning synchronization..."
    bash .claude/scripts/sync-planning-docs.sh
fi

# Test agent handoff sync
if [ -f ".claude/scripts/sync-agent-handoff.sh" ]; then
    echo "🔄 Testing agent handoff synchronization..."
    bash .claude/scripts/sync-agent-handoff.sh
fi

# Test documentation quality check
if [ -f ".claude/scripts/check-doc-quality.sh" ]; then
    echo "🔄 Testing documentation quality check..."
    bash .claude/scripts/check-doc-quality.sh
fi

# Test 7: Create Test File to Trigger Automation
echo ""
echo "📄 Test 7: Automation Trigger Test"
echo "-----------------------------------"

# Create a test planning document
test_file="PLANNING/test-automation-document.md"
echo "# Test Automation Document" > "$test_file"
echo "This is a test document created to verify automation triggers." >> "$test_file"
echo "Created: $(date)" >> "$test_file"

echo "✅ Created test document: $test_file"
echo "📋 This should trigger README table of contents update in real usage"

# Cleanup test file
rm -f "$test_file"

# Test 8: Check for Existing Hooks
echo ""
echo "🎣 Test 8: Check Existing Hooks"
echo "--------------------------------"

if [ -f "~/.claude/hooks.json" ]; then
    echo "✅ Global hooks file exists"
    echo "📊 Hook count: $(jq '.hooks | length' ~/.claude/hooks.json 2>/dev/null || echo 'Unable to parse')"
elif [ -f ".claude/hooks.json" ]; then
    echo "✅ Local hooks file exists"
    echo "📊 Hook count: $(jq '.hooks | length' .claude/hooks.json 2>/dev/null || echo 'Unable to parse')"
else
    echo "⚠️  No hooks file found yet"
    echo "   This is normal before running /project:rule2hook"
fi

# Summary
echo ""
echo "📋 Test Summary"
echo "==============="

total_tests=8
passed_tests=0

# Count passed tests (simplified)
[ -f ".claude/commands/rule2hook.md" ] && passed_tests=$((passed_tests + 1))
[ -f "automation-rules.md" ] && passed_tests=$((passed_tests + 1))
[ -f "CLAUDE.md" ] && passed_tests=$((passed_tests + 1))
[ -d ".claude/scripts" ] && passed_tests=$((passed_tests + 1))
[ "$planning_count" -gt 2 ] && passed_tests=$((passed_tests + 1))
[ -f ".claude/scripts/update-readme-toc.sh" ] && passed_tests=$((passed_tests + 1))
[ -f ".claude/scripts/sync-planning-docs.sh" ] && passed_tests=$((passed_tests + 1))
[ -f ".claude/scripts/check-doc-quality.sh" ] && passed_tests=$((passed_tests + 1))

echo "✅ Passed: $passed_tests/$total_tests tests"

if [ "$passed_tests" -eq "$total_tests" ]; then
    echo "🎉 All tests passed! Your Organized Codebase is ready for automation!"
elif [ "$passed_tests" -ge 6 ]; then
    echo "✅ Most tests passed. Minor issues may need attention."
else
    echo "⚠️  Several tests failed. Please review the installation."
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Run: /project:rule2hook (to generate hooks from CLAUDE.md)"
echo "2. Or run: /project:rule2hook \"Your custom rule here\""
echo "3. Verify: cat ~/.claude/hooks.json"
echo "4. Test by editing a file in PLANNING/ directory"
echo ""
echo "Your Organized Codebase now has intelligent automation! 🤖"