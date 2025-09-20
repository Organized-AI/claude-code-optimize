#!/bin/bash

set -e

echo "🏗️  Building Moonlock CLI..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist
mkdir -p dist

# Compile TypeScript
echo "Compiling TypeScript..."
npm run tsc

# Make the CLI executable
echo "Making CLI executable..."
chmod +x dist/cli.js

# Add shebang to the main CLI file if not present
if ! head -n1 dist/cli.js | grep -q "#!/usr/bin/env node"; then
    echo "#!/usr/bin/env node" | cat - dist/cli.js > temp && mv temp dist/cli.js
    chmod +x dist/cli.js
fi

# Copy package.json for version info
cp package.json dist/

# Create production package.json
echo "Creating production package.json..."
node -e "
const pkg = require('./package.json');
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: pkg.main,
  bin: pkg.bin,
  dependencies: pkg.dependencies,
  engines: pkg.engines,
  files: ['*.js', '*.js.map', '*.d.ts'],
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license
};
require('fs').writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));
"

echo "✅ Build completed successfully!"
echo "📁 Output directory: dist/"
echo "🚀 Test with: node dist/cli.js --help"