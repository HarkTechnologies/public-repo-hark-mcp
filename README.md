# Hark MCP Proxy

A lightweight stdio-to-HTTP proxy that connects Claude Desktop to the Hark MCP server. It is packaged as a Claude Desktop extension (`.mcpb`).

All tool logic runs on the hosted Hark server at `https://mcp.sendhark.com/mcp`. This extension only forwards MCP messages between Claude Desktop and that server, authenticating with your Hark API token.

## Install

1. Get an API token from your Hark team.
2. Open the `.mcpb` file in Claude Desktop (double-click it or drag it in).
3. Enter your Hark API token when prompted.
4. Restart Claude Desktop.

## What it does

- Reads JSON-RPC messages from stdin and POSTs them to the Hark MCP server.
- Sends your token in the `Authorization` header.
- Writes the server's JSON or event-stream responses back to stdout.

It uses only Node.js built-ins and has no runtime dependencies. See [`src/proxy-client.ts`](src/proxy-client.ts).

## Build from source

Requires Node.js 18 or later.

```bash
npm install
npm run pack:mcpb
```

This compiles the proxy and produces `hark-proxy.mcpb` in the repo root.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `HARK_API_TOKEN` | Yes | Your Hark API token (set by Claude Desktop from the install prompt) |
| `HARK_MCP_SERVER_URL` | No | Overrides the server URL (default `https://mcp.sendhark.com/mcp`) |

## Links

- Website: https://sendhark.com
