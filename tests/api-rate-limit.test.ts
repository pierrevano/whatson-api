require("dotenv").config();

const axios = require("axios");

const { client } = require("../src/utils/mongoClient");
const { config } = require("../src/config");
const { getRateLimiterKey } = require("../src/utils/getRateLimiterKey");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const removeLogs = process.env.REMOVE_LOGS === "true";

const rateLimitTest = isRemoteSource ? test.skip : test;

describe("What's on? API rate limiting tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  rateLimitTest(
    "Rate Limiting should return 429 with Retry-After once the limit is exceeded",
    async () => {
      const apiCall = `${baseURL}/movie/121`;
      const forwardedFor = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
      const batchSize = 100;
      let rateLimitedResponse = null;

      for (
        let requestCount = 0;
        requestCount < config.pointsAnonymous + 1 && !rateLimitedResponse;
        requestCount += batchSize
      ) {
        const currentBatchSize = Math.min(
          batchSize,
          config.pointsAnonymous + 1 - requestCount,
        );
        const responses = await Promise.all(
          Array.from({ length: currentBatchSize }).map(() =>
            axios.get(apiCall, {
              headers: {
                "X-Forwarded-For": forwardedFor,
              },
              validateStatus: (status) => status <= 500,
            }),
          ),
        );

        rateLimitedResponse =
          responses.find((response) => response.status === 429) || null;
      }

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.data).toEqual({
        code: 429,
        message: `Too many requests (${config.pointsAnonymous} req/h, ${config.pointsAnonymous * config.dailyMultiplier} req/day limit). Request a free API key for a higher limit: ${config.contactURL}`,
      });
      expect(rateLimitedResponse.headers).toHaveProperty("retry-after");
      expect(
        Number(rateLimitedResponse.headers["retry-after"]),
      ).toBeGreaterThan(0);
    },
    120000,
  );

  rateLimitTest(
    "Rate Limiting should return 429 once the daily limit is exceeded",
    async () => {
      const apiCall = `${baseURL}/movie/121`;
      const forwardedFor = "192.0.2.42";
      const counterKey = `rlflx:${forwardedFor}`;
      const rateLimitCollection = client
        .db(config.dbName)
        .collection(config.collectionNameRateLimit);

      // Seed the daily counter at its limit so a single request exceeds it.
      await rateLimitCollection.updateOne(
        { key: counterKey },
        {
          $set: {
            key: counterKey,
            points: config.pointsAnonymous * config.dailyMultiplier,
            expire: new Date(Date.now() + config.dailyDuration * 1000),
          },
        },
        { upsert: true },
      );

      try {
        const response = await axios.get(apiCall, {
          headers: {
            "X-Forwarded-For": forwardedFor,
          },
          validateStatus: (status) => status <= 500,
        });

        expect(response.status).toBe(429);
        expect(response.data).toEqual({
          code: 429,
          message: `Too many requests (${config.pointsAnonymous} req/h, ${config.pointsAnonymous * config.dailyMultiplier} req/day limit). Request a free API key for a higher limit: ${config.contactURL}`,
        });
        expect(Number(response.headers["retry-after"])).toBeGreaterThan(
          config.duration,
        );
      } finally {
        await rateLimitCollection.deleteOne({ key: counterKey });
      }
    },
    120000,
  );

  rateLimitTest(
    "Rate Limiting should return 429 with the sponsor upgrade message for a free API key",
    async () => {
      const apiCall = `${baseURL}/movie/121`;
      const batchSize = 100;
      let rateLimitedResponse = null;

      for (
        let requestCount = 0;
        requestCount < config.pointsFree + 1 && !rateLimitedResponse;
        requestCount += batchSize
      ) {
        const currentBatchSize = Math.min(
          batchSize,
          config.pointsFree + 1 - requestCount,
        );
        const responses = await Promise.all(
          Array.from({ length: currentBatchSize }).map(() =>
            axios.get(apiCall, {
              params: { api_key: config.testApiKey },
              validateStatus: (status) => status <= 500,
            }),
          ),
        );

        rateLimitedResponse =
          responses.find((response) => response.status === 429) || null;
      }

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.data).toEqual({
        code: 429,
        message: `Too many requests (${config.pointsFree} req/h, ${config.pointsFree * config.dailyMultiplier} req/day limit). Become a sponsor for a higher limit: ${config.contactURL}`,
      });
      expect(rateLimitedResponse.headers).toHaveProperty("retry-after");
      expect(
        Number(rateLimitedResponse.headers["retry-after"]),
      ).toBeGreaterThan(0);
    },
    120000,
  );

  describe("Rate limiter key resolution", () => {
    // Resolve the rate limit key from the incoming request.
    test("uses the leftmost forwarded IP when multiple hops are present", () => {
      const req = {
        headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1, 172.16.0.1" },
        ip: "10.0.0.1",
      };

      expect(getRateLimiterKey(req)).toBe("203.0.113.7");
    });

    test("falls back to req.ip when no forwarded header is present", () => {
      const req = { headers: {}, ip: "127.0.0.1" };

      expect(getRateLimiterKey(req)).toBe("127.0.0.1");
    });
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  }, config.timeout);
});
