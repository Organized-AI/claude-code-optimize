#!/bin/bash
# Deployment Validation Script
# Pre-deployment health checks for Claude Code Optimizer

set -e

echo "🔍 Claude Code Optimizer - Deployment Validation"
echo "================================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation functions
check_python_dependencies() {
    echo "📦 Checking Python dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 not found${NC}"
        return 1
    fi
    
    # Check required modules
    local modules=("psutil" "psycopg2" "asyncio" "pathlib" "datetime")
    for module in "${modules[@]}"; do
        if python3 -c "import $module" 2>/dev/null; then
            echo -e "${GREEN}✅ $module available${NC}"
        else
            echo -e "${YELLOW}⚠️  $module not available (may need installation)${NC}"
        fi
    done
}

check_file_structure() {
    echo "📁 Checking file structure..."
    
    local critical_files=(
        "src/data_flow/simplified_ingestion.py"
        "src/detection/claude_process_monitor.py"
        "src/integration/supabase_manager.py"
        "schemas/optimized_supabase_schema.sql"
        "config/data_flow_config.yaml"
    )
    
    for file in "${critical_files[@]}"; do
        if [[ -f "$file" ]]; then
            echo -e "${GREEN}✅ $file${NC}"
        else
            echo -e "${RED}❌ $file missing${NC}"
            return 1
        fi
    done
}

check_directory_permissions() {
    echo "🔐 Checking directory permissions..."
    
    local dirs=("logs" "data" "migrations" "src")
    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            if [[ -w "$dir" ]]; then
                echo -e "${GREEN}✅ $dir writable${NC}"
            else
                echo -e "${RED}❌ $dir not writable${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️  $dir does not exist${NC}"
        fi
    done
}

check_database_connectivity() {
    echo "🗄️  Checking database connectivity..."
    
    if [[ -n "$SUPABASE_URL" ]] && [[ -n "$SUPABASE_PASSWORD" ]]; then
        echo -e "${GREEN}✅ Supabase credentials configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase credentials not configured${NC}"
    fi
    
    # Check local SQLite
    if [[ -f "claude_usage.db" ]]; then
        echo -e "${GREEN}✅ Local SQLite database found${NC}"
    else
        echo -e "${YELLOW}⚠️  Local SQLite database not found${NC}"
    fi
}

run_syntax_checks() {
    echo "🐍 Running Python syntax checks..."
    
    local python_files=(
        "src/data_flow/simplified_ingestion.py"
        "src/detection/claude_process_monitor.py"
        "src/integration/supabase_manager.py"
        "tests/migration_validation.py"
    )
    
    for file in "${python_files[@]}"; do
        if [[ -f "$file" ]]; then
            if python3 -m py_compile "$file" 2>/dev/null; then
                echo -e "${GREEN}✅ $file syntax OK${NC}"
            else
                echo -e "${RED}❌ $file syntax error${NC}"
                return 1
            fi
        fi
    done
}

check_system_resources() {
    echo "💾 Checking system resources..."
    
    # Check available disk space (need at least 1GB)
    local available_mb=$(df . | tail -1 | awk '{print $4}')
    if [[ $available_mb -gt 1048576 ]]; then
        echo -e "${GREEN}✅ Sufficient disk space${NC}"
    else
        echo -e "${YELLOW}⚠️  Low disk space: ${available_mb}KB available${NC}"
    fi
    
    # Check memory
    if command -v free &> /dev/null; then
        local available_ram=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
        echo -e "${GREEN}✅ Available RAM: ${available_ram}GB${NC}"
    fi
}

# Main validation
main() {
    echo "Starting deployment validation..."
    
    local validation_failed=false
    
    check_python_dependencies || validation_failed=true
    echo
    
    check_file_structure || validation_failed=true
    echo
    
    check_directory_permissions || validation_failed=true
    echo
    
    check_database_connectivity || validation_failed=true
    echo
    
    run_syntax_checks || validation_failed=true
    echo
    
    check_system_resources || validation_failed=true
    echo
    
    if [[ "$validation_failed" == "true" ]]; then
        echo -e "${RED}❌ Deployment validation FAILED${NC}"
        echo "Please fix the above issues before deploying."
        exit 1
    else
        echo -e "${GREEN}✅ Deployment validation PASSED${NC}"
        echo "System is ready for deployment."
        exit 0
    fi
}

# Run validation
main "$@"