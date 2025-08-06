#!/bin/bash

# Fix all React Query imports to use the centralized queryClient
echo "🔧 Fixing React Query imports..."

# Find and replace all direct @tanstack/react-query imports
find client/src -name "*.tsx" -type f -exec sed -i 's/from "@tanstack\/react-query"/from "@\/lib\/queryClient"/g' {} \;
find client/src -name "*.ts" -type f -exec sed -i 's/from "@tanstack\/react-query"/from "@\/lib\/queryClient"/g' {} \;

echo "✅ All imports fixed to use @/lib/queryClient"

# Show what files were modified
echo "📁 Modified files:"
grep -r "from \"@/lib/queryClient\"" client/src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort | uniq