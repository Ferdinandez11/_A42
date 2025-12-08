#!/bin/bash

echo "🔧 Instalando Husky y configurando pre-commit hooks..."
echo ""

# 1. Instalar Husky
echo "📦 Instalando Husky..."
npm install --save-dev husky lint-staged

# 2. Inicializar Husky
echo "🎣 Inicializando Husky..."
npx husky init

# 3. Crear pre-commit hook
echo "📝 Creando pre-commit hook..."
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 Running pre-commit checks..."

# Run lint-staged
npx lint-staged

# Run type check
echo "🔍 TypeScript type check..."
npm run type-check

# Run tests
echo "🧪 Running tests..."
npm run test:run

echo "✅ Pre-commit checks passed!"
EOF

chmod +x .husky/pre-commit

# 4. Crear commit-msg hook para conventional commits
echo "📝 Creando commit-msg hook..."
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check commit message format
npx --no -- commitlint --edit $1
EOF

chmod +x .husky/commit-msg

echo ""
echo "✅ Husky configurado correctamente!"
echo ""
echo "Hooks instalados:"
echo "  - pre-commit: type check + tests + lint"
echo "  - commit-msg: conventional commits"
