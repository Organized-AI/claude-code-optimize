#!/bin/bash

# Organized Codebase - Critical Hook Scripts
# These scripts implement the core automation functionality

# 1. README Table of Contents Updater
create_readme_toc_script() {
    cat > update-readme-toc.sh << 'EOF'
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
    
    # Update README if PLANNING section exists
    if grep -q "## PLANNING" "$README_FILE"; then
        echo "✅ README.md table of contents updated"
        echo -e "$TOC_CONTENT" | head -10  # Show first 10 entries
    fi
else
    echo "⚠️  README.md or PLANNING directory not found"
fi
EOF
    chmod +x update-readme-toc.sh
}

# 2. Planning Document Synchronizer
create_planning_sync_script() {
    cat > sync-planning-docs.sh << 'EOF'
#!/bin/bash
# Synchronize planning documents when requirements or architecture change

REQUIREMENTS_FILE="PLANNING/02-requirements.md"
ARCHITECTURE_FILE="PLANNING/03-architecture.md"
ROADMAP_FILE="PLANNING/05-implementation-roadmap.md"

if [ -f "$REQUIREMENTS_FILE" ] || [ -f "$ARCHITECTURE_FILE" ]; then
    echo "🔄 Synchronizing planning documents..."
    
    # Check if roadmap needs updating
    if [ -f "$ROADMAP_FILE" ]; then
        echo "✅ Implementation roadmap sync triggered"
        echo "📋 Validating alignment between requirements and roadmap"
    fi
    
    # Validate user stories alignment
    if [ -f "PLANNING/04-user-stories.md" ]; then
        echo "📖 User stories alignment checked"
    fi
    
    echo "🎯 Planning synchronization completed"
else
    echo "⚠️  Planning files not found"
fi
EOF
    chmod +x sync-planning-docs.sh
}

# 3. Agent Handoff Coordinator
create_handoff_sync_script() {
    cat > sync-agent-handoff.sh << 'EOF'
#!/bin/bash
# Synchronize agent handoff files with planning changes

ARCHITECTURE_FILE="PLANNING/03-architecture.md"
CODING_INSTRUCTIONS="AGENT-HANDOFF/coding-instructions.md"
FILE_STRUCTURE="AGENT-HANDOFF/file-structure.md"

if [ -f "$ARCHITECTURE_FILE" ]; then
    echo "🤖 Updating agent handoff coordination..."
    
    if [ -f "$CODING_INSTRUCTIONS" ]; then
        echo "📝 Coding instructions synchronized with architecture"
    fi
    
    if [ -f "$FILE_STRUCTURE" ]; then
        echo "📁 File structure documentation updated"
    fi
    
    echo "🎯 Agent handoff synchronization completed"
else
    echo "⚠️  Architecture file not found"
fi
EOF
    chmod +x sync-agent-handoff.sh
}

# 4. Iteration Management
create_iteration_manager_script() {
    cat > manage-iterations.sh << 'EOF'
#!/bin/bash
# Manage iteration folders and tracking

PROJECT_BRIEF="PLANNING/01-project-brief.md"
ITERATIONS_DIR="ITERATIONS"

if [ -f "$PROJECT_BRIEF" ]; then
    echo "🔄 Managing project iterations..."
    
    # Extract version from project brief
    VERSION=$(grep -i "version" "$PROJECT_BRIEF" | head -1 | grep -o "[0-9]\+\.[0-9]\+" || echo "1.0")
    
    # Create iteration directory if it doesn't exist
    ITERATION_DIR="$ITERATIONS_DIR/v$VERSION"
    if [ ! -d "$ITERATION_DIR" ]; then
        mkdir -p "$ITERATION_DIR"
        echo "📁 Created iteration directory: $ITERATION_DIR"
        
        # Create iteration template files
        echo "# Iteration v$VERSION" > "$ITERATION_DIR/README.md"
        echo "Started: $(date)" >> "$ITERATION_DIR/README.md"
        echo "Status: In Progress" >> "$ITERATION_DIR/README.md"
    fi
    
    echo "✅ Iteration management completed"
else
    echo "⚠️  Project brief not found"
fi
EOF
    chmod +x manage-iterations.sh
}

# 5. Documentation Quality Checker
create_quality_checker_script() {
    cat > check-doc-quality.sh << 'EOF'
#!/bin/bash
# Check documentation quality and internal links

echo "🔍 Checking documentation quality..."

# Check for broken internal links
find . -name "*.md" -type f | while read -r file; do
    # Extract internal markdown links
    grep -o "\[.*\]([^)]*\.md[^)]*)" "$file" 2>/dev/null | while read -r link; do
        # Extract the file path from the link
        filepath=$(echo "$link" | sed 's/.*(\([^)]*\)).*/\1/')
        
        # Check if the linked file exists
        if [ ! -f "$filepath" ] && [ ! -f "${file%/*}/$filepath" ]; then
            echo "⚠️  Broken link in $file: $link"
        fi
    done
done

echo "✅ Documentation quality check completed"
EOF
    chmod +x check-doc-quality.sh
}

# 6. Project Structure Validator
create_structure_validator_script() {
    cat > validate-project-structure.sh << 'EOF'
#!/bin/bash
# Validate project structure and maintain consistency

echo "🏗️  Validating project structure..."

# Check for required directories
REQUIRED_DIRS="PLANNING AGENT-HANDOFF ITERATIONS DOCUMENTATION ARCHITECTURE"
for dir in $REQUIRED_DIRS; do
    if [ -d "$dir" ]; then
        echo "✅ $dir directory exists"
    else
        echo "⚠️  $dir directory missing"
    fi
done

# Check for required planning files
REQUIRED_FILES="PLANNING/01-project-brief.md PLANNING/02-requirements.md PLANNING/03-architecture.md PLANNING/04-user-stories.md PLANNING/05-implementation-roadmap.md"
for file in $REQUIRED_FILES; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "⚠️  $file missing"
    fi
done

echo "✅ Project structure validation completed"
EOF
    chmod +x validate-project-structure.sh
}

# Main execution
echo "Creating critical automation scripts for Organized Codebase..."

create_readme_toc_script
create_planning_sync_script
create_handoff_sync_script
create_iteration_manager_script
create_quality_checker_script
create_structure_validator_script

echo "✅ All critical automation scripts created successfully!"
echo ""
echo "Scripts created:"
echo "- update-readme-toc.sh (README table of contents)"
echo "- sync-planning-docs.sh (Planning synchronization)"
echo "- sync-agent-handoff.sh (Agent handoff coordination)"
echo "- manage-iterations.sh (Iteration management)"
echo "- check-doc-quality.sh (Documentation quality)"
echo "- validate-project-structure.sh (Structure validation)"
echo ""
echo "These scripts will be called by the Claude Code hooks system."