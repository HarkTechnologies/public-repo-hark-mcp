#!/usr/bin/env node
/**
 * Lightweight MCP Stdio-to-HTTP Proxy
 *
 * This proxy allows Claude Desktop to connect to a remote HTTP-based MCP server.
 * All tool logic lives on the HTTP server, so code updates don't require
 * redistributing the MCPB file.
 */

import { stdin, stdout, stderr, env, exit } from "node:process";
import { createInterface } from "node:readline";

// Configuration from environment (populated by MCPB manifest)
const SERVER_URL = env.HARK_MCP_SERVER_URL || "https://mcp.sendhark.com/mcp";
const API_TOKEN = env.HARK_API_TOKEN;

if (!API_TOKEN) {
  stderr.write("ERROR: HARK_API_TOKEN environment variable is required\n");
  exit(1);
}

// Track message IDs for proper JSON-RPC handling
const pendingRequests = new Map<string | number, NodeJS.Timeout>();

/**
 * Forward a JSON-RPC message from Claude Desktop to the HTTP server
 */
async function forwardToServer(message: any): Promise<void> {
  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "Authorization": `Token ${API_TOKEN}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle both JSON and Server-Sent Events (SSE) responses
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/event-stream")) {
      // SSE response - stream events back
      await handleSSEResponse(response);
    } else {
      // Regular JSON response
      const data = await response.json();
      stdout.write(JSON.stringify(data) + "\n");
    }

    // Clear timeout for this request
    if (message.id !== undefined) {
      const timeout = pendingRequests.get(message.id);
      if (timeout) {
        clearTimeout(timeout);
        pendingRequests.delete(message.id);
      }
    }
  } catch (error) {
    stderr.write(`Proxy error: ${error instanceof Error ? error.message : String(error)}\n`);

    // Send error response back to Claude
    if (message.id !== undefined) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      };
      stdout.write(JSON.stringify(errorResponse) + "\n");
    }
  }
}

/**
 * Handle Server-Sent Events (SSE) response stream
 */
async function handleSSEResponse(response: Response): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            stdout.write(JSON.stringify(parsed) + "\n");
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Main: Read JSON-RPC messages from stdin and forward to HTTP server
 */
function main() {
  const rl = createInterface({
    input: stdin,
    output: stdout,
    terminal: false,
  });

  stderr.write(`Hark MCP Proxy starting...\n`);
  stderr.write(`Server: ${SERVER_URL}\n`);

  rl.on("line", (line) => {
    try {
      const message = JSON.parse(line);

      // Set timeout for requests (10 minutes max)
      if (message.id !== undefined) {
        const timeout = setTimeout(() => {
          const errorResponse = {
            jsonrpc: "2.0",
            id: message.id,
            error: {
              code: -32603,
              message: "Request timeout",
            },
          };
          stdout.write(JSON.stringify(errorResponse) + "\n");
          pendingRequests.delete(message.id);
        }, 600000); // 10 minutes

        pendingRequests.set(message.id, timeout);
      }

      // Forward to HTTP server
      forwardToServer(message).catch((error) => {
        stderr.write(`Unhandled error: ${error}\n`);
      });
    } catch (error) {
      stderr.write(`Invalid JSON: ${error}\n`);
    }
  });

  rl.on("close", () => {
    stderr.write("Proxy shutting down...\n");
    exit(0);
  });
}

main();
