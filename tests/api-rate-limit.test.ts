require("dotenv").config();

const axios = require("axios");

const { config } = require("../src/config");

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
      const forwardedFor = "203.0.113.10";
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
        message: `Too many requests (${config.pointsAnonymous} req/h limit). Request a free API key for a higher limit: ${config.contactURL}`,
      });
      expect(rateLimitedResponse.headers).toHaveProperty("retry-after");
      expect(
        Number(rateLimitedResponse.headers["retry-after"]),
      ).toBeGreaterThan(0);
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
        message: `Too many requests (${config.pointsFree} req/h limit). Become a sponsor for a higher limit: ${config.contactURL}`,
      });
      expect(rateLimitedResponse.headers).toHaveProperty("retry-after");
      expect(
        Number(rateLimitedResponse.headers["retry-after"]),
      ).toBeGreaterThan(0);
    },
    120000,
  );
});
