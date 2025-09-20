#!/bin/bash

echo "🚀 Claude Code Bridge - Quick Setup"
echo "===================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Load environment variables
source .env

# Check if SUPABASE_KEY is configured
if [ "$SUPABASE_KEY" = "your-supabase-anon-key" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "⚠️  SUPABASE_KEY not configured"
    echo ""
    echo "📋 Quick setup:"
    echo "1. Go to: https://rdsfgdtsbyioqilatvxu.supabase.co"
    echo "2. Settings → API → Copy 'anon public' key"
    echo "3. Update SUPABASE_KEY in .env file"
    echo "4. SQL Editor → Run content from supabase-table.sql"
    echo "5. Run this script again"
    echo ""
    exit 1
fi

# Check if Supabase dependency is installed
if [ ! -d "node_modules/@supabase/supabase-js" ]; then
    echo "📦 Installing dependencies..."
    npm install @supabase/supabase-js
fi

echo "✅ Configuration looks good!"
echo "☁️  Starting Claude Code Bridge Service..."
echo "📺 Dashboard: https://moonlock-dashboard.vercel.app/"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Export the key and start the service
export SUPABASE_KEY
node scripts/claude-code-monitor.js
