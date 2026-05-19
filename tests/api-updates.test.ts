require("dotenv").config();

const axios = require("axios");

const { config } = require("../src/config");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const removeLogs = process.env.REMOVE_LOGS === "true";

const VALID_SINCE = "2024-01-01T00:00:00.000Z";

describe("What's on? API updates endpoint tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  test("should return 403 without an API key", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { since: VALID_SINCE },
      validateStatus: () => true,
    });

    expect(response.status).toBe(403);
    expect(response.data.code).toBe(403);
    expect(response.data.message).toMatch(/sponsor/i);
  });

  test("should deny access with a non-sponsor API key", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.testApiKey, since: VALID_SINCE },
      validateStatus: () => true,
    });

    expect([403, 429]).toContain(response.status);
    if (response.status === 403) {
      expect(response.data.code).toBe(403);
      expect(response.data.message).toMatch(/sponsor/i);
    }
  });

  test("should return 400 when since is missing", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.internalApiKey },
      validateStatus: () => true,
    });

    expect(response.status).toBe(400);
    expect(response.data.code).toBe(400);
    expect(response.data.message).toMatch(/since/i);
  });

  test("should return 400 when since is not a valid date", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.internalApiKey, since: "not-a-date" },
      validateStatus: () => true,
    });

    expect(response.status).toBe(400);
    expect(response.data.code).toBe(400);
    expect(response.data.message).toMatch(/ISO 8601/i);
  });

  test("should return 400 when item_type is invalid", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        item_type: "person",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(400);
    expect(response.data.code).toBe(400);
    expect(response.data.message).toMatch(/invalid item type/i);
  });

  test("should return valid response structure with a sponsor API key", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.internalApiKey, since: VALID_SINCE },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      page: expect.any(Number),
      total_pages: expect.any(Number),
      total_results: expect.any(Number),
      updated: expect.any(Object),
    });
  });

  test("should return ids as numbers grouped by item_type", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.internalApiKey, since: VALID_SINCE },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.updated.movie)).toBe(true);
    expect(Array.isArray(response.data.updated.tvshow)).toBe(true);

    for (const id of [
      ...response.data.updated.movie,
      ...response.data.updated.tvshow,
    ]) {
      expect(typeof id).toBe("number");
    }
  });

  test("should return only movies when item_type=movie", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        item_type: "movie",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data.updated).toEqual({ movie: expect.any(Array) });
  });

  test("should return only tvshows when item_type=tvshow", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        item_type: "tvshow",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data.updated).toEqual({ tvshow: expect.any(Array) });
  });

  test("should respect the limit parameter", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: { api_key: config.internalApiKey, since: VALID_SINCE, limit: 5 },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    const totalReturned =
      response.data.updated.movie.length + response.data.updated.tvshow.length;
    expect(totalReturned).toBeLessThanOrEqual(5);
  });

  test("should return empty results for a future since date", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: "2099-01-01T00:00:00.000Z",
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data.total_results).toBe(0);
    expect(response.data.updated).toEqual({ movie: [], tvshow: [] });
  });

  test("should return empty results for a page beyond total_pages", async () => {
    const response = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        page: 99999,
      },
      validateStatus: () => true,
    });

    expect(response.status).toBe(200);
    expect(response.data.updated).toEqual({ movie: [], tvshow: [] });
  });

  test("should have at least minimumNumberOfItems.default updated items per type in the last 7 days", async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [movies, tvshows] = await Promise.all([
      axios.get(`${baseURL}/updates`, {
        params: { api_key: config.internalApiKey, since, item_type: "movie" },
        validateStatus: () => true,
      }),
      axios.get(`${baseURL}/updates`, {
        params: { api_key: config.internalApiKey, since, item_type: "tvshow" },
        validateStatus: () => true,
      }),
    ]);

    expect(movies.status).toBe(200);
    expect(tvshows.status).toBe(200);
    expect(movies.data.total_results).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.default,
    );
    expect(tvshows.data.total_results).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.default,
    );
  });

  test("should return different results on different pages", async () => {
    const page1 = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        page: 1,
        limit: 5,
      },
      validateStatus: () => true,
    });

    const page2 = await axios.get(`${baseURL}/updates`, {
      params: {
        api_key: config.internalApiKey,
        since: VALID_SINCE,
        page: 2,
        limit: 5,
      },
      validateStatus: () => true,
    });

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    const ids1 = [...page1.data.updated.movie, ...page1.data.updated.tvshow];
    const ids2 = [...page2.data.updated.movie, ...page2.data.updated.tvshow];
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
