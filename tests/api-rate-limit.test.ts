require("dotenv").config();

const mockIndexCreations = [];

jest.mock("rate-limiter-flexible", () => {
  const actual = jest.requireActual("rate-limiter-flexible");
  return {
    ...actual,
    RateLimiterMongo: class extends actual.RateLimiterMongo {
      createIndexes() {
        const pending = super.createIndexes();
        mockIndexCreations.push(pending);
        return pending;
      }
    },
  };
});

const axios = require("axios");

const { client, collectionApiKey } = require("../src/utils/mongoClient");
const { config } = require("../src/config");
const { generateRandomIp } = require("./utils/generateRandomIp");
const { getRateLimiterKey } = require("../src/routes/utils/getRateLimiterKey");
const { limiter } = require("../src/routes/utils/rateLimiter");
const { resolveLimit } = require("../src/routes/utils/resolveLimit");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const removeLogs = process.env.REMOVE_LOGS === "true";

const rateLimitTest = isRemoteSource ? test.skip : test;

const requestLimit = async (ip, apiKey) => {
  const response = { status: 200, headers: {}, data: null, next: jest.fn() };
  await limiter(
    {
      headers: { "cf-connecting-ip": ip },
      query: { api_key: apiKey },
      socket: { remoteAddress: ip },
    },
    {
      set(headers) {
        for (const [key, value] of Object.entries(headers)) {
          response.headers[key.toLowerCase()] = value;
        }
      },
      status(code) {
        response.status = code;
        return this;
      },
      json(data) {
        response.data = data;
      },
    },
    response.next,
  );
  return response;
};

describe("What's on? API rate limiting tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  test("Rate Limiting should apply headers on successful requests", async () => {
    // Send 1 request without API key
    const responses = await Promise.all(
      Array.from({ length: 1 }).map(() =>
        axios.get(baseURL, {
          headers: {
            "CF-Connecting-IP": generateRandomIp(),
            "X-Forwarded-For": generateRandomIp(),
          },
          validateStatus: (status) => status < 500,
        }),
      ),
    );

    const successfulResponse = responses.find(
      (response) => response.status === 200,
    );

    expect(successfulResponse).toBeDefined();
    expect(successfulResponse.headers).toHaveProperty("x-ratelimit-limit");
    expect(successfulResponse.headers).toHaveProperty("x-ratelimit-remaining");
    expect(successfulResponse.headers).not.toHaveProperty("retry-after");
  });

  rateLimitTest(
    "Rate Limiting should include Retry-After once the limit is exceeded",
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
                "CF-Connecting-IP": forwardedFor,
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

  rateLimitTest.each([["get", "/movie/121", "192.0.2.42"]])(
    "Rate Limiting should reject requests once the daily limit is exceeded: %s %s",
    async (method, path, forwardedFor) => {
      const apiCall = `${baseURL}${path}`;
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
        const response = await axios.request({
          method,
          url: apiCall,
          headers: {
            "CF-Connecting-IP": forwardedFor,
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
    "Rate Limiting should include the sponsor upgrade message for a free API key",
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
    beforeEach(() => {
      jest.replaceProperty(process, "env", { ...process.env, RENDER: "true" });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("rejects anonymous requests when the client address is unavailable", async () => {
      const response = await requestLimit(undefined);
      expect(response.status).toBe(503);
    });

    test.each(["sponsor", "internal"])(
      "accepts a valid %s key when the client address is unavailable",
      async (tier) => {
        const value = `test-no-address-${tier}`;
        jest.spyOn(collectionApiKey, "findOne").mockResolvedValue({
          value,
          is_active: true,
          is_internal: tier === "internal",
          rate_limit_points: config.pointsSponsor,
        });

        const response = await requestLimit(undefined, value);

        expect(response.status).toBe(200);
        expect(response.data).toBeNull();
        expect(response.next).toHaveBeenCalledTimes(1);
      },
    );

    test("rejects an invalid key when the client address is unavailable", async () => {
      jest.spyOn(collectionApiKey, "findOne").mockResolvedValue(null);

      const response = await requestLimit(undefined, "test-no-address-invalid");

      expect(response.status).toBe(503);
      expect(response.data).toEqual({
        code: 503,
        message: `We could not process your request due to a connection issue. Please retry or contact me at ${config.contactURL} if it persists.`,
      });
      expect(response.next).not.toHaveBeenCalled();
    });

    test.each(["203.0.113.7", "203.0.113.8", "2001:db8::7"])(
      "uses the edge address regardless of forwarded headers: %s",
      (ip) => {
        for (const forwardedFor of ["198.51.100.1", "198.51.100.2, 10.0.0.1"]) {
          expect(
            getRateLimiterKey({
              headers: {
                "cf-connecting-ip": ip,
                "x-forwarded-for": forwardedFor,
              },
              socket: { remoteAddress: "10.0.0.1" },
            }),
          ).toBe(ip);
        }
      },
    );

    test.each([
      [undefined],
      [""],
      ["invalid"],
      ["203.0.113.7, 203.0.113.8"],
      [["203.0.113.7"]],
    ])("does not fall back when the edge address is invalid: %j", (ip) => {
      expect(
        getRateLimiterKey({
          headers: { "cf-connecting-ip": ip, "x-forwarded-for": "203.0.113.9" },
          socket: { remoteAddress: "10.0.0.1" },
        }),
      ).toBeNull();
    });

    test("uses the socket address in local mode regardless of forwarded headers", () => {
      jest.replaceProperty(process, "env", { ...process.env, RENDER: "false" });
      expect(
        getRateLimiterKey({
          headers: {
            "cf-connecting-ip": "203.0.113.7",
            "x-forwarded-for": "203.0.113.8",
          },
          socket: { remoteAddress: "127.0.0.1" },
        }),
      ).toBe("127.0.0.1");
    });
  });

  describe("Limit resolution", () => {
    test("defaults when unset and clamps to the configured bounds", () => {
      expect(resolveLimit(undefined)).toBe(config.limit);
      expect(resolveLimit(50)).toBe(50);
      expect(resolveLimit(config.maxLimit + 100)).toBe(config.maxLimit);
      expect(resolveLimit(-1)).toBe(1);
      expect(resolveLimit(0)).toBe(config.limit);
    });
  });

  afterAll(async () => {
    const results = await Promise.allSettled(mockIndexCreations);
    if (client) {
      await client.close();
    }
    const failed = results.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
  }, config.timeout);
});
