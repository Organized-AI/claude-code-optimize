#!/bin/bash
echo "📊 CLAUDE MONITOR COMPREHENSIVE ANALYTICS"
echo "========================================"

echo ""
echo "🔍 1. BASIC ANALYTICS (SQLite3):"
node simple-analytics.js report

echo ""
echo "🎯 2. SESSION ANALYSIS:"
node claude-session-analyzer.js

echo ""
echo "☁️ 3. CLOUD SYNC STATUS:"
node sync-local-to-cloud.js

echo ""
echo "📈 4. AVAILABLE EXPORTS:"
ls -la *.csv 2>/dev/null || echo "No CSV exports found"

echo ""
echo "✅ Analytics complete! Check the CSV files for detailed data."
