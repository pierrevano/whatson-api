const { config } = require("../../config");
const {
  invalidItemTypeMessage,
  isValidItemType,
} = require("./itemTypeValidation");
const { isValidISODate } = require("../../utils/parseReleaseDateRange");
const { sendResponse } = require("../../utils/sendRequest");
const {
  validateIntegerListParam,
  validateIntegerParam,
} = require("./queryValidationMessages");

/**
 * Validates the optional item type query parameter.
 *
 * @param {string|undefined|null} itemTypeQuery
 * @returns {string|null}
 */
const validateItemTypeQuery = (itemTypeQuery) => {
  if (isValidItemType(itemTypeQuery)) {
    return null;
  }

  return invalidItemTypeMessage(itemTypeQuery);
};

/**
 * Validates the optional status query parameter.
 *
 * @param {string|undefined} statusQuery
 * @param {typeof import("../../config").config} config
 * @returns {string|null}
 */
const validateStatusQuery = (statusQuery, config) => {
  if (!statusQuery) return null;

  const allowed = config.allowedTvshowStatuses.map((s) => s.toLowerCase());
  const values = statusQuery.split(",").map((s) => s.trim().toLowerCase());
  if (values.every((s) => allowed.includes(s))) return null;

  const list = allowed.map((s) => `'${s}'`).join(", ");
  return `Invalid status provided. Please specify one or more of ${list}. Received '${statusQuery}'.`;
};

/**
 * Validates query params shared across endpoints.
 *
 * @param {import("express").Request["query"]} query
 * @param {typeof import("../../config").config} config
 * @returns {string|null}
 */
const validateSharedQueryParams = (query, config) =>
  validateIntegerParam(query.limit, "limit", 1, config.maxLimit) ||
  validateIntegerParam(query.page, "page") ||
  validateIntegerListParam(query.filtered_seasons, "filtered_seasons") ||
  validateStatusQuery(query.status, config);

const validateFilterQueryParams = (query, allowReleaseDateShortcuts) => {
  if (query.minimum_ratings !== undefined) {
    const values = query.minimum_ratings
      .split(",")
      .map((value) => value.trim());
    const hasInvalidRating = values.some(
      (value) =>
        !/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ||
        !Number.isFinite(Number(value)),
    );
    if (hasInvalidRating) {
      return config.invalidMinimumRatingsMessage;
    }
  }

  if (query.release_date !== undefined) {
    const values = query.release_date.split(",").map((value) => value.trim());
    const bounds = new Set();
    for (const value of values) {
      if (
        config.releaseDateShortcuts.includes(value) &&
        allowReleaseDateShortcuts &&
        !bounds.has(value)
      ) {
        bounds.add(value);
        continue;
      }
      const match = /^(from|to):(\d{4}-\d{2}-\d{2})$/i.exec(value);
      const bound = match?.[1].toLowerCase();
      if (!match || !isValidISODate(match[2]) || bounds.has(bound)) {
        return "The release_date must use valid from:YYYY-MM-DD or to:YYYY-MM-DD values.";
      }
      bounds.add(bound);
    }
  }

  if (query.order !== undefined && !["asc", "desc"].includes(query.order)) {
    return "The order must be 'asc' or 'desc'.";
  }

  return null;
};

const validateQueryParams =
  (
    allowedParams = [
      ...config.allowedQueryParams,
      ...config.keysToCheckForSearch,
    ],
    allowReleaseDateShortcuts = false,
  ) =>
  (req, res, next) => {
    const invalidParams = Object.keys(req.query).filter(
      (key) => !allowedParams.includes(key),
    );
    if (invalidParams.length > 0) {
      return sendResponse(res, 400, {
        message: `Invalid query parameter(s): ${invalidParams.join(", ")}`,
      });
    }

    for (const [name, value] of Object.entries(req.query)) {
      if (config.numericIdKeys.includes(name)) {
        const message = validateIntegerParam(value, name);
        if (message) return sendResponse(res, 400, { message });
      }
    }

    const message =
      validateSharedQueryParams(req.query, config) ||
      validateItemTypeQuery(req.query.item_type) ||
      validateIntegerListParam(req.query.runtime, "runtime", 0) ||
      validateIntegerListParam(req.query.seasons_number, "seasons_number") ||
      validateIntegerParam(
        req.query.minimum_users_rating_count,
        "minimum_users_rating_count",
        0,
      ) ||
      validateFilterQueryParams(req.query, allowReleaseDateShortcuts);
    if (message) return sendResponse(res, 400, { message });

    next();
  };

module.exports = {
  validateFilterQueryParams,
  validateItemTypeQuery,
  validateQueryParams,
  validateSharedQueryParams,
};
