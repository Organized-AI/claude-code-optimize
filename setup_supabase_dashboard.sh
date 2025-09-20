#!/bin/bash
# Setup Supabase Dashboard for Claude Code Optimizer
# This script guides you through setting up the dashboard with Supabase

echo "🚀 CLAUDE CODE OPTIMIZER - SUPABASE DASHBOARD SETUP"
echo "=================================================="
echo ""

echo "📋 Setup Checklist:"
echo ""

echo "✅ 1. Supabase CLI linked to project rdsfgdtsbyioqilatvxu"
echo "✅ 2. Data exported to supabase_export/ directory"
echo "✅ 3. Dashboard scripts created"
echo ""

echo "🔄 NEXT STEPS (Manual):"
echo ""

echo "1️⃣ CREATE SCHEMA:"
echo "   • Go to: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu"
echo "   • Click 'SQL Editor'"
echo "   • Copy and paste contents of 'supabase_schema.sql'"
echo "   • Click 'Run' to create tables"
echo ""

echo "2️⃣ IMPORT DATA:"
echo "   • Go to 'Table Editor' in Supabase dashboard"
echo "   • For each table (sessions, five_hour_blocks, etc.):"
echo "     - Select the table"
echo "     - Click 'Import data'"
echo "     - Upload corresponding JSON file from supabase_export/"
echo ""

echo "3️⃣ TEST DASHBOARD:"
echo "   • Run: python3 supabase_dashboard.py"
echo "   • Should show connected status and data"
echo ""

echo "📁 FILES CREATED:"
echo "   📄 supabase_schema.sql - Database schema"
echo "   📄 supabase_export/ - Data files for import"
echo "   📄 supabase_dashboard.py - Dashboard script"
echo "   📄 export_session_data.py - Data export script"
echo "   📄 sync_to_supabase.py - Direct sync script (needs credentials)"
echo ""

echo "🔧 COMMANDS:"
echo "   View dashboard:     python3 supabase_dashboard.py"
echo "   Live dashboard:     python3 supabase_dashboard.py --live"
echo "   Export new data:    python3 export_session_data.py"
echo "   Test connection:    python3 supabase_dashboard.py"
echo ""

echo "📊 Data Summary:"
if [ -f "supabase_export/sessions.json" ]; then
    sessions_count=$(grep -o '"id"' supabase_export/sessions.json | wc -l)
    echo "   Sessions to import: $sessions_count"
fi

if [ -f "supabase_export/five_hour_blocks.json" ]; then
    blocks_count=$(grep -o '"id"' supabase_export/five_hour_blocks.json | wc -l)
    echo "   Five-hour blocks: $blocks_count"
fi

if [ -f "supabase_export/message_breakdown.json" ]; then
    messages_count=$(grep -o '"id"' supabase_export/message_breakdown.json | wc -l)
    echo "   Message breakdowns: $messages_count"
fi

echo ""
echo "🌐 Your Supabase Project:"
echo "   Dashboard: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu"
echo "   API URL: https://rdsfgdtsbyioqilatvxu.supabase.co"
echo ""

echo "💡 TIPS:"
echo "   • The dashboard will auto-update as you use Claude Code"
echo "   • Use --live flag for real-time monitoring"
echo "   • Re-run export_session_data.py to sync latest sessions"
echo "   • All sensitive data stays in your private database"
echo ""

echo "❓ Need help? Check supabase_export/IMPORT_INSTRUCTIONS.md"
echo ""

# Test if we can run the dashboard
echo "🧪 Testing dashboard connection..."
python3 supabase_dashboard.py 2>/dev/null | head -5

echo ""
echo "🎉 Setup complete! Follow the manual steps above to activate your dashboard."