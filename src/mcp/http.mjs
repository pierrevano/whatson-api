import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMCPServer } from "./server.mjs";

export function setupMCPRoutes(app) {
  // req.body is parsed by the app-level express.json() (applyBaseMiddleware), which runs first.
  app.post("/mcp", async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session state needed
      });
      await createMCPServer().connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      if (!res.headersSent) res.status(500).json({ error: error.message });
    }
  });
}
