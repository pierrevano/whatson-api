/**
 * What's on? API MCP Server
 *
 * Exposes the whatson-api as MCP tools so AI agents can search movies and TV
 * shows, fetch detail pages, inspect TV show seasons, browse episodes, and
 * retrieve the cross-show ranked-episode feed.
 *
 * Usage (stdio transport, compatible with Claude Desktop / Cursor / etc.):
 *   node src/mcp/server.mjs
 *
 * Environment variables:
 *   WHATSON_API_URL  – base URL of the API  (default: https://whatson-api.onrender.com)
 *   WHATSON_API_KEY  – optional API key passed as ?api_key=…
 */

import { fileURLToPath } from "url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.WHATSON_API_URL || "https://whatson-api.onrender.com";
const API_KEY = process.env.WHATSON_API_KEY || "";

const apiClient = axios.create({ baseURL: BASE_URL, timeout: 60000 });

/** Strip undefined/null/"" values and inject the API key when present. */
const buildParams = (args = {}) => {
  const params = {};
  if (API_KEY) params.api_key = API_KEY;
  for (const [k, v] of Object.entries(args)) {
    if (v !== undefined && v !== null && v !== "") params[k] = v;
  }
  return params;
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "search_titles",
    description:
      "Search for movies and TV shows. Supports filtering by title, genre, platform, network, director, production company, runtime, season count, release date, rating, status, and content flags (active, adult, must-see, certified). Supports sorting by popularity (allocine, IMDb, TMDB), IMDb top chart position, and Box Office Mojo rank. Returns paginated results with aggregate ratings from IMDb, Rotten Tomatoes, AlloCiné, Metacritic, Letterboxd, BetaSeries, SensCritique, TMDB, Trakt, and TV Time. Use append_to_response to include optional fields such as genres, platforms_links, directors, or episode highlights. Can also look up a single title by an external platform ID (imdbid, tmdbid, allocineid, betaseriesid, letterboxdid, metacriticid, rottentomatoesid, senscritiqueid, thetvdbid, traktid, tvtimeid).",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title to search for (partial match, case-insensitive).",
        },
        item_type: {
          type: "string",
          description:
            'Filter by content type: "movie", "tvshow", or "movie,tvshow" to return both (equivalent to omitting this parameter).',
        },
        genres: {
          type: "string",
          description:
            'Comma-separated genres, e.g. "Action,Drama". Pass `all` to skip this filter.',
        },
        platforms: {
          type: "string",
          description:
            'Comma-separated streaming platforms, e.g. "Netflix,Disney+". Pass `all` to skip this filter.',
        },
        networks: {
          type: "string",
          description:
            'Comma-separated TV networks, e.g. "HBO,AMC". Pass `all` to skip this filter.',
        },
        status: {
          type: "string",
          enum: ["canceled", "ended", "ongoing", "pilot", "unknown"],
          description: "TV show production status.",
        },
        release_date: {
          type: "string",
          description:
            'Date range filter. Either bound is optional. Format: "from:YYYY-MM-DD,to:YYYY-MM-DD". Example: "from:2020-01-01,to:2024-12-31". Use "new" as a shortcut for recently released titles (last 6 months for movies, last 18 months for TV shows).',
        },
        minimum_ratings: {
          type: "number",
          description:
            "Minimum ratings_average value (0–5 normalised scale). Example: 3.5 returns only titles with a ratings_average of 3.5 or above.",
        },
        ratings_filters: {
          type: "string",
          description:
            'Which rating sources to include in the average. Use "all" for every source, or a comma-separated subset. Available values: allocine_critics, allocine_users, betaseries_users, imdb_users, metacritic_critics, metacritic_users, rottentomatoes_critics, rottentomatoes_users, letterboxd_users, senscritique_users, tmdb_users, trakt_users, tvtime_users.',
        },
        popularity_filters: {
          type: "string",
          description:
            'Which popularity sources to sort by. Use "all", "none", or a comma-separated subset: allocine_popularity, imdb_popularity, tmdb_popularity.',
        },
        is_active: {
          type: "string",
          description:
            '"true" returns only active titles, "false" returns only inactive titles, "true,false" (or omitting this parameter) returns both.',
        },
        is_adult: {
          type: "string",
          description:
            '"false" (default) returns only non-adult titles, "true" returns only adult-flagged titles, "true,false" returns both.',
        },
        must_see: {
          type: "string",
          description:
            '"true" returns only Metacritic "Must-See" titles, "false" returns only titles without that badge, "true,false" returns both.',
        },
        users_certified: {
          type: "string",
          description:
            '"true" returns only Rotten Tomatoes "Verified Audience" certified titles, "false" returns only uncertified titles, "true,false" returns both.',
        },
        critics_certified: {
          type: "string",
          description:
            '"true" returns only Rotten Tomatoes "Certified Fresh" titles, "false" returns only non-certified titles, "true,false" returns both.',
        },
        directors: {
          type: "string",
          description:
            "Comma-separated director names (partial match). Pass `all` to skip this filter.",
        },
        production_companies: {
          type: "string",
          description:
            "Comma-separated production company names (partial match). Pass `all` to skip this filter.",
        },
        runtime: {
          type: "string",
          description:
            'Runtime filter in seconds. One value = exact match; two or more comma-separated values = range (min–max), e.g. "3600,7200" matches titles with runtime ≥ 3600 s and ≤ 7200 s.',
        },
        seasons_number: {
          type: "string",
          description:
            'Filter TV shows by number of seasons. Pass a single value for an exact match (e.g. "3"), or comma-separated values to match any of them (e.g. "1,3" matches shows with 1 or 3 seasons). Any value ≥ 5 also matches shows with more than 5 seasons.',
        },
        append_to_response: {
          type: "string",
          description:
            "Comma-separated optional fields to include in results. Available: genres, directors, networks, platforms_links, production_companies, title_variants, image_variants, certification_variants, parents_guide, last_episode, next_episode, highest_episode, lowest_episode, episodes_details, critics_rating_details. Episode-related fields only apply to TV show results.",
        },
        filtered_seasons: {
          type: "string",
          description:
            'Comma-separated season numbers to include when episodes_details is in append_to_response. Example: "1,2" returns only episodes from seasons 1 and 2.',
        },
        imdbid: {
          type: "string",
          description: "IMDb ID (e.g. tt0903747). Returns a single result.",
        },
        tmdbid: {
          type: "integer",
          description: "TMDB numeric ID. Returns a single result.",
        },
        allocineid: {
          type: "integer",
          description: "AlloCiné ID. Returns a single result.",
        },
        betaseriesid: {
          type: "string",
          description: "BetaSeries ID. Returns a single result.",
        },
        letterboxdid: {
          type: "string",
          description: "Letterboxd ID. Returns a single result. Movie only.",
        },
        metacriticid: {
          type: "string",
          description: "Metacritic slug. Returns a single result.",
        },
        rottentomatoesid: {
          type: "string",
          description: "Rotten Tomatoes slug. Returns a single result.",
        },
        senscritiqueid: {
          type: "integer",
          description: "SensCritique ID. Returns a single result.",
        },
        thetvdbid: {
          type: "integer",
          description: "TheTVDB ID. Returns a single result.",
        },
        traktid: {
          type: "string",
          description: "Trakt ID or slug. Returns a single result.",
        },
        tvtimeid: {
          type: "integer",
          description: "TV Time ID. Returns a single result. TV shows only.",
        },
        limit: {
          type: "integer",
          description: "Results per page (default 20).",
        },
        top_ranking_order: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort by IMDb top chart position. asc shows #1 first, desc shows #1 last. Only titles with an IMDb top ranking are returned.",
        },
        mojo_rank_order: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "Sort by Box Office Mojo worldwide gross rank. asc shows #1 first, desc shows #1 last. Only titles with a Mojo rank are returned.",
        },
        page: {
          type: "integer",
          description: "Page number, 1-based (default 1).",
        },
      },
    },
  },
  {
    name: "get_title",
    description:
      "Get full details for a specific movie or TV show by its TMDB numeric ID. Returns metadata and ratings from all aggregated sources. Use append_to_response to request optional fields such as genres, platforms_links, directors, or episode highlights.",
    inputSchema: {
      type: "object",
      required: ["id", "item_type"],
      properties: {
        id: {
          type: "integer",
          description: "TMDB numeric ID of the title.",
        },
        item_type: {
          type: "string",
          enum: ["movie", "tvshow"],
          description: "Type of the title.",
        },
        append_to_response: {
          type: "string",
          description:
            "Comma-separated optional fields to include. Available: genres, directors, networks, platforms_links, production_companies, title_variants, image_variants, certification_variants, parents_guide, last_episode, next_episode, highest_episode, lowest_episode, episodes_details, critics_rating_details. Episode-related fields only apply to TV show results.",
        },
        ratings_filters: {
          type: "string",
          description:
            'Comma-separated rating sources used to compute ratings_average. Use "all" for every source. Available values: allocine_critics, allocine_users, betaseries_users, imdb_users, metacritic_critics, metacritic_users, rottentomatoes_critics, rottentomatoes_users, letterboxd_users, senscritique_users, tmdb_users, trakt_users, tvtime_users.',
        },
      },
    },
  },
  {
    name: "get_tvshow_seasons",
    description:
      "Get all seasons for a TV show. Returns per-season episode counts and IMDb rating summaries (average, highest-rated episode, lowest-rated episode). Optionally includes per-season rating distribution histograms and cross-season episode highlights (highest, lowest, last, next episode) via append_to_response.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "integer",
          description: "TMDB numeric ID of the TV show.",
        },
        append_to_response: {
          type: "string",
          description:
            "Optional fields split into two scopes. Added to each season object: rating_distribution (episode count per rating band), rating_distribution_episodes (episode list per rating band). Added to the root response across all seasons: highest_episode, lowest_episode, last_episode, next_episode.",
        },
      },
    },
  },
  {
    name: "get_season_episodes",
    description:
      "Get all episodes for a specific season of a TV show, including IMDb user ratings, vote counts, and release dates.",
    inputSchema: {
      type: "object",
      required: ["id", "season_number"],
      properties: {
        id: {
          type: "integer",
          description: "TMDB numeric ID of the TV show.",
        },
        season_number: {
          type: "integer",
          description: "Season number (1-based).",
        },
        minimum_ratings: {
          type: "number",
          description: "Minimum IMDb user rating (0–10 scale).",
        },
        release_date: {
          type: "string",
          description:
            'Episode release date range. Format: "from:YYYY-MM-DD,to:YYYY-MM-DD".',
        },
      },
    },
  },
  {
    name: "get_rated_episodes",
    description:
      "Get the highest or lowest rated IMDb episodes across all TV shows. Supports filtering by show title, genre, platform, network, director, production company, status, season, minimum rating, vote count, release date, and content flags (active, adult, must-see, certified).",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Search across the TV show title, episode title, or TV show networks (partial match, case-insensitive).",
        },
        genres: {
          type: "string",
          description:
            "Comma-separated genres to filter the parent TV show. Pass `all` to skip this filter.",
        },
        platforms: {
          type: "string",
          description:
            "Comma-separated streaming platforms. Pass `all` to skip this filter.",
        },
        networks: {
          type: "string",
          description:
            "Comma-separated TV networks. Pass `all` to skip this filter.",
        },
        is_active: {
          type: "string",
          description:
            '"true" returns only active TV shows, "false" returns only inactive TV shows, "true,false" (or omitting this parameter) returns both.',
        },
        is_adult: {
          type: "string",
          description:
            '"false" (default) returns only non-adult TV shows, "true" returns only adult-flagged TV shows, "true,false" returns both.',
        },
        must_see: {
          type: "string",
          description:
            '"true" returns only TV shows with Metacritic "Must-See" badge, "false" returns only those without it, "true,false" returns both.',
        },
        users_certified: {
          type: "string",
          description:
            '"true" returns only TV shows with Rotten Tomatoes "Verified Audience" certification, "false" returns only uncertified shows, "true,false" returns both.',
        },
        critics_certified: {
          type: "string",
          description:
            '"true" returns only TV shows with Rotten Tomatoes "Certified Fresh" status, "false" returns only non-certified shows, "true,false" returns both.',
        },
        directors: {
          type: "string",
          description:
            "Comma-separated director names (partial match). Pass `all` to skip this filter.",
        },
        production_companies: {
          type: "string",
          description:
            "Comma-separated production company names (partial match). Pass `all` to skip this filter.",
        },
        status: {
          type: "string",
          enum: ["canceled", "ended", "ongoing", "pilot", "unknown"],
          description: "Filter by parent TV show production status.",
        },
        filtered_seasons: {
          type: "string",
          description:
            'Comma-separated season numbers to include. Example: "1,2" returns only episodes from seasons 1 and 2.',
        },
        minimum_ratings: {
          type: "number",
          description: "Minimum IMDb user rating (0–10 scale). Example: 9.0.",
        },
        minimum_users_rating_count: {
          type: "integer",
          description:
            "Minimum number of IMDb votes an episode must have to be included (default 100).",
        },
        release_date: {
          type: "string",
          description:
            'Episode release date range. Format: "from:YYYY-MM-DD,to:YYYY-MM-DD".',
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description:
            "desc returns top-rated episodes, asc returns lowest-rated episodes (default: desc).",
        },
        limit: {
          type: "integer",
          description: "Results per page (default 20).",
        },
        page: {
          type: "integer",
          description: "Page number, 1-based (default 1).",
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createMCPServer() {
  const server = new Server(
    { name: "whatson-api", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let response;

      switch (name) {
        case "search_titles": {
          response = await apiClient.get("/", { params: buildParams(args) });
          break;
        }

        case "get_title": {
          const { id, item_type, ...rest } = args;
          response = await apiClient.get(`/${item_type}/${id}`, {
            params: buildParams(rest),
          });
          break;
        }

        case "get_tvshow_seasons": {
          const { id, ...rest } = args;
          response = await apiClient.get(`/tvshow/${id}/seasons`, {
            params: buildParams(rest),
          });
          break;
        }

        case "get_season_episodes": {
          const { id, season_number, ...rest } = args;
          response = await apiClient.get(
            `/tvshow/${id}/seasons/${season_number}/episodes`,
            { params: buildParams(rest) },
          );
          break;
        }

        case "get_rated_episodes": {
          response = await apiClient.get("/episodes/rated", {
            params: buildParams(args),
          });
          break;
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [
          { type: "text", text: JSON.stringify(response.data, null, 2) },
        ],
      };
    } catch (error) {
      const isTimeout =
        error.code === "ECONNABORTED" || error.message?.includes("timeout");
      const message = error.response
        ? `API error ${error.response.status}: ${JSON.stringify(error.response.data)}`
        : isTimeout
          ? "Request timed out. The API server may be waking from sleep (Render cold start can take up to 60 s). Please retry."
          : error.message;

      return {
        content: [{ type: "text", text: message }],
        isError: true,
      };
    }
  });

  return server;
}

// ---------------------------------------------------------------------------
// Entry point (stdio — for Claude Desktop / Cursor / etc.)
// ---------------------------------------------------------------------------

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const transport = new StdioServerTransport();
  await createMCPServer().connect(transport);
}
