#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$ROOT/.mcpb-proxy-build"

echo "Building lightweight HTTP proxy MCPB..."

echo "Compiling TypeScript..."
cd "$ROOT"
npm run build

echo "Staging MCPB bundle..."
rm -rf "$STAGING"
mkdir -p "$STAGING/server"

# Copy proxy manifest
cp "$ROOT/mcpb/manifest-proxy.json" "$STAGING/manifest.json"

# Copy icons
cp "$ROOT/assets/icon.png" "$STAGING/icon.png"
cp "$ROOT/assets/icon-dark.svg" "$STAGING/icon-dark.svg"

# Copy compiled proxy client (just one file!)
cp "$ROOT/dist/proxy-client.js" "$STAGING/server/proxy-client.js"

# Create minimal package.json (no dependencies needed!)
cat > "$STAGING/server/package.json" <<'EOF'
{
  "name": "hark-mcp-proxy",
  "type": "module",
  "dependencies": {}
}
EOF

echo "Packing .mcpb..."
cd "$STAGING"
npx --yes @anthropic-ai/mcpb pack . "$ROOT/hark-proxy.mcpb"

# Cleanup
cd "$ROOT"
rm -rf "$STAGING"

echo ""
echo "✅ Done: $ROOT/hark-proxy.mcpb"
echo ""
echo "📊 File size:"
du -h "$ROOT/hark-proxy.mcpb" 2>/dev/null || echo "  hark-proxy.mcpb: (see file)"
echo ""
echo "📦 Installation instructions:"
echo "   1. Double-click hark-proxy.mcpb (or drag into Claude Desktop)"
echo "   2. Claude will prompt you for your Hark API Token"
echo "   3. Restart Claude Desktop (Cmd+Q then reopen)"
echo ""
echo "🔗 Server: https://mcp.sendhark.com/mcp (hardcoded)"
echo ""
echo "💡 Benefits:"
echo "   - Small file (~50KB vs ~10MB)"
echo "   - All tools live on your server"
echo "   - Code updates without redistributing MCPB"
echo ""
