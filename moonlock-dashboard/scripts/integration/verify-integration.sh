#!/bin/bash
# Verify dashboard integration status

echo "🔍 Checking Dashboard Integration Status..."
echo ""

FILE="src/client/src/components/ClaudeCodeDashboard.tsx"

# Check imports
echo "📋 Checking imports..."
if grep -q "import { SessionLogger }" "$FILE"; then
    echo "  ✅ SessionLogger imported"
else
    echo "  ❌ SessionLogger NOT imported"
fi

if grep -q "import { SessionControl }" "$FILE"; then
    echo "  ✅ SessionControl imported"
else
    echo "  ❌ SessionControl NOT imported"
fi

# Check logger instance
echo ""
echo "📋 Checking logger instance..."
if grep -q "const logger = new SessionLogger()" "$FILE"; then
    echo "  ✅ Logger instance created"
else
    echo "  ❌ Logger instance NOT created"
fi

# Check for refreshData function
echo ""
echo "📋 Checking data integration..."
if grep -q "refreshData" "$FILE"; then
    echo "  ✅ refreshData function found"
else
    echo "  ❌ refreshData function NOT found"
fi

# Check for SessionControl component
echo ""
echo "📋 Checking SessionControl component..."
if grep -q "<SessionControl" "$FILE"; then
    echo "  ✅ SessionControl component added"
else
    echo "  ❌ SessionControl component NOT added"
fi

# Check for old mock data
echo ""
echo "📋 Checking for mock data removal..."
if grep -q "used: 23.5, total: 480" "$FILE"; then
    echo "  ⚠️  Old mock data still present - needs to be replaced"
else
    echo "  ✅ Mock data appears to be replaced"
fi

# Summary
echo ""
echo "📊 Integration Summary:"
if grep -q "SessionLogger" "$FILE" && grep -q "SessionControl" "$FILE" && grep -q "refreshData" "$FILE"; then
    echo "  ✅ Dashboard appears to be integrated!"
    echo "  🚀 Run 'npm run dev' to test it"
else
    echo "  ❌ Integration incomplete"
    echo "  📖 Follow the Complete Dashboard Integration Guide"
fi

echo ""
echo "💡 Quick test after integration:"
echo "  1. npm run dev"
echo "  2. Look for floating control in bottom-right"
echo "  3. Start a session and log prompts"
