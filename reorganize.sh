#!/bin/bash
# Claude Code Optimizer - Professional Reorganization Script

PROJECT_DIR="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
cd "$PROJECT_DIR"

echo "🚀 Starting Claude Code Optimizer Professional Reorganization..."

# Phase 1: Create new directory structure
echo "📁 Creating new directory structure..."
mkdir -p agents/{infrastructure,development,coordination,specialized}
mkdir -p systems/{menubar-app,multi-config,usage-tracker,provider-integrations}
mkdir -p docs/{getting-started,user-guides,technical,integration,community}
mkdir -p development/{src,tests,tools,environments}
mkdir -p deployments/{configurations,installers,docker,automation}
mkdir -p examples/{workflows,configurations,use-cases}

echo "✅ Professional reorganization structure created!"
echo ""
echo "📊 New Structure:"
echo "├── agents/ (Specialized AI agents)"
echo "├── systems/ (Core infrastructure)"  
echo "├── docs/ (Comprehensive documentation)"
echo "├── development/ (Source code & tests)"
echo "├── deployments/ (Configurations & installers)"
echo "└── examples/ (Practical workflows)"
echo ""
echo "🎯 Next: Copy agent content from artifacts to populate the new structure"

