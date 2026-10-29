require("dotenv").config();

const { client, collectionApiKey } = require("../src/utils/mongoClient");
const { config } = require("../src/config");
const { generateRandomIp } = require("./utils/generateRandomIp");
const {
  resolveValidationMessage,
} = require("../src/routes/utils/queryValidationMessages");
const {
  validateQueryParams,
} = require("../src/routes/utils/queryParamsValidation");

describe("Page size access", () => {
  /** @type {Record<string, { allowed: boolean, limit?: number, points?: number, active?: boolean, api_key?: string, expectedStatus?: number, expectedMessage?: string }>} */
  const params = {
    anonymous_default: { allowed: true },
    anonymous_at_default_limit: { allowed: true, limit: config.limit },
    anonymous_above_default_limit: {
      allowed: false,
      limit: config.limit + 1,
    },
    invalid_limit_precedes_sponsorship: {
      allowed: false,
      limit: config.maxLimit + 1,
      expectedStatus: 400,
      expectedMessage: `Invalid limit provided. Please specify an integer between 1 and ${config.maxLimit}. Received '${config.maxLimit + 1}'.`,
    },
    free_key_above_default_limit: {
      allowed: false,
      limit: config.limit + 1,
      points: config.pointsFree,
    },
    sponsor_key_above_default_limit: {
      allowed: true,
      limit: config.limit + 1,
      points: config.pointsSponsor,
    },
    custom_sponsor_key_at_maximum_limit: {
      allowed: true,
      limit: config.maxLimit,
      points: config.pointsSponsor * 2,
    },
    inactive_sponsor_key_above_default_limit: {
      allowed: false,
      limit: config.limit + 1,
      points: config.pointsSponsor,
      active: false,
    },
    internal_key_above_default_limit: {
      allowed: true,
      limit: config.limit + 1,
      api_key: config.internalApiKey,
    },
  };

  Object.entries(params).forEach(
    ([
      name,
      {
        allowed,
        limit,
        points,
        active = true,
        api_key,
        expectedStatus = 403,
        expectedMessage,
      },
    ]) => {
      test(name, async () => {
        const key =
          api_key ??
          (points === undefined
            ? undefined
            : `page-size-${name}-${generateRandomIp()}`);
        const res = {
          locals: {},
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        try {
          if (points !== undefined) {
            await collectionApiKey.insertOne({
              value: key,
              name: null,
              description: null,
              is_active: active,
              is_internal: false,
              rate_limit_points: points,
            });
          }

          await validateQueryParams(["api_key", "limit"])(
            { query: { api_key: key, limit: limit?.toString() } },
            res,
            next,
          );

          if (allowed) {
            expect(next).toHaveBeenCalledTimes(1);
            expect(res.status).not.toHaveBeenCalled();
          } else {
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(expectedStatus);
            expect(res.json).toHaveBeenCalledWith({
              code: expectedStatus,
              message:
                expectedMessage ??
                resolveValidationMessage(
                  config.requiredSponsorApiKeyForLimitMessage,
                  {
                    limit: config.limit,
                  },
                ),
            });
          }
        } finally {
          if (points !== undefined) {
            await collectionApiKey.deleteOne({ value: key });
          }
        }
      });
    },
  );

  afterAll(async () => {
    await client.close();
  }, config.timeout);
});
