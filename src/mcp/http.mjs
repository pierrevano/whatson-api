import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMCPServer } from "./server.mjs";

export function setupMCPRoutes(app) {
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless transport.
    });
    await createMCPServer().connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
}
