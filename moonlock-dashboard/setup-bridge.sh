#!/bin/bash

echo "🚀 Claude Code Bridge Service Setup"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check if SUPABASE_KEY is set in .env
if grep -q "SUPABASE_KEY=your-supabase-anon-key" .env; then
    echo "⚠️  SUPABASE_KEY not configured in .env file"
    echo ""
    echo "📋 To get your Supabase key:"
    echo "1. Go to: https://rdsfgdtsbyioqilatvxu.supabase.co"
    echo "2. Navigate to: Settings > API"
    echo "3. Copy your 'anon public' key"
    echo "4. Replace 'your-supabase-anon-key' in .env file with your actual key"
    echo "5. Run this script again"
    echo ""
    exit 1
fi

# Load environment variables
source .env
export SUPABASE_KEY

# Check if we can connect to Supabase
echo "🔍 Testing Supabase connection..."
if ! supabase projects list --token="$SUPABASE_KEY" >/dev/null 2>&1; then
    echo "❌ Cannot connect to Supabase. Please check your SUPABASE_KEY."
    exit 1
fi

echo "✅ Supabase connection successful"

# Create table using Supabase CLI
echo "📊 Creating claude_sessions table..."
if supabase db push --token="$SUPABASE_KEY" --db-url="postgresql://postgres:[YOUR-PASSWORD]@db.rdsfgdtsbyioqilatvxu.supabase.co:5432/postgres" --file supabase-table.sql 2>/dev/null; then
    echo "✅ Table created successfully"
else
    echo "⚠️  Table creation via CLI failed. Please run the SQL manually:"
    echo "   Go to https://rdsfgdtsbyioqilatvxu.supabase.co → SQL Editor"
    echo "   Copy/paste content from supabase-table.sql"
    echo ""
fi

# Check if Supabase dependency is installed
if [ ! -d "node_modules/@supabase/supabase-js" ]; then
    echo "📦 Installing Supabase dependency..."
    npm install @supabase/supabase-js
fi

echo "✅ Dependencies installed"
echo "☁️  Starting bridge service..."
echo "📺 Dashboard will be available at: https://moonlock-dashboard.vercel.app/"
echo ""

# Load environment variables and start the service
source .env
export SUPABASE_KEY
node scripts/claude-code-monitor.js
