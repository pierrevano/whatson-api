require("dotenv").config();

const axios = require("axios");
const { config } = require("../src/config");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;

const MCP_ENDPOINT = `${baseURL}/mcp`;

/**
 * Send a single JSON-RPC 2.0 request to the MCP HTTP endpoint.
 */
async function mcpRequest(method, params = {}, id = 1) {
  const body = {
    jsonrpc: "2.0",
    id,
    method,
  };
  if (Object.keys(params).length > 0) {
    body.params = params;
  }

  const response = await axios.post(MCP_ENDPOINT, body, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    validateStatus: () => true,
  });

  // StreamableHTTPServerTransport responds with SSE; extract the JSON payload
  // from the first "data: {...}" line.
  if (typeof response.data === "string") {
    const match = response.data.match(/^data: (.+)$/m);
    if (match) response.data = JSON.parse(match[1]);
  }

  return response;
}

const EXPECTED_TOOLS = [
  "search_titles",
  "get_title",
  "get_tvshow_seasons",
  "get_season_episodes",
  "get_rated_episodes",
];

describe("MCP server tests", () => {
  beforeAll(() => {
    console.log(`Testing MCP on ${MCP_ENDPOINT}`);
  });

  test(
    "initialize returns server info",
    async () => {
      const response = await mcpRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("protocolVersion");
      expect(result).toHaveProperty("serverInfo");
      expect(result.serverInfo.name).toBe("whatson-api");
    },
    config.timeout,
  );

  test(
    "tools/list returns all expected tools",
    async () => {
      const response = await mcpRequest("tools/list");

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("tools");

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toHaveLength(EXPECTED_TOOLS.length);
      expect(toolNames).toEqual(expect.arrayContaining(EXPECTED_TOOLS));
    },
    config.timeout,
  );

  test(
    "search_titles returns at least one movie result",
    async () => {
      const response = await mcpRequest("tools/call", {
        name: "search_titles",
        arguments: { item_type: "movie", limit: 1 },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("content");
      expect(result.content.length).toBeGreaterThan(0);

      // Content is returned as MCP text blocks; the first block should be JSON
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty("results");
      expect(parsed.results.length).toBeGreaterThan(0);
      expect(parsed.results[0].item_type).toBe("movie");
    },
    config.timeout,
  );

  test(
    "get_title returns data for a known movie",
    async () => {
      // tmdbid 550 is Fight Club — a stable, well-known entry
      const response = await mcpRequest("tools/call", {
        name: "get_title",
        arguments: { item_type: "movie", id: 550 },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("content");

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(550);
      expect(parsed.item_type).toBe("movie");
    },
    config.timeout,
  );

  test(
    "get_tvshow_seasons returns seasons for a known TV show",
    async () => {
      // tmdbid 1396 is Breaking Bad — a stable, well-known entry
      const response = await mcpRequest("tools/call", {
        name: "get_tvshow_seasons",
        arguments: { id: 1396 },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("content");

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1396);
      expect(parsed.item_type).toBe("tvshow");
      expect(parsed.seasons.length).toBeGreaterThan(0);
    },
    config.timeout,
  );

  test(
    "get_season_episodes returns episodes for a known season",
    async () => {
      // tmdbid 1396 is Breaking Bad, season 1
      const response = await mcpRequest("tools/call", {
        name: "get_season_episodes",
        arguments: { id: 1396, season_number: 1 },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("content");

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1396);
      expect(parsed.episodes.length).toBeGreaterThan(0);
    },
    config.timeout,
  );

  test(
    "get_rated_episodes returns episodes",
    async () => {
      const response = await mcpRequest("tools/call", {
        name: "get_rated_episodes",
        arguments: { limit: 1 },
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      expect(result).toHaveProperty("content");

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty("results");
      expect(parsed.results.length).toBeGreaterThan(0);
    },
    config.timeout,
  );

  test(
    "calling an unknown tool returns an error result",
    async () => {
      const response = await mcpRequest("tools/call", {
        name: "nonexistent_tool",
        arguments: {},
      });

      expect(response.status).toBe(200);
      const { result } = response.data;
      // The SDK surfaces unknown-tool errors as isError:true in the content,
      // not as a JSON-RPC error object.
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("nonexistent_tool");
    },
    config.timeout,
  );
});
