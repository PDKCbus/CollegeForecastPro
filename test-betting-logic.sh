#!/bin/bash
#
# 🎯 BETTING LOGIC TEST RUNNER
# 
# Run this script every time you modify the prediction engine
# to ensure betting recommendations stay accurate.
#

echo "🎯 Running Betting Logic Regression Tests..."
echo "=============================================="

if npx tsx betting-logic-test.ts; then
    echo ""
    echo "✅ BETTING LOGIC TESTS PASSED"
    echo "🚀 Safe to deploy prediction engine changes"
    echo ""
    exit 0
else
    echo ""
    echo "❌ BETTING LOGIC TESTS FAILED"  
    echo "⚠️  DO NOT DEPLOY - Fix betting logic first"
    echo ""
    exit 1
fi