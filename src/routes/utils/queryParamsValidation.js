const {
  invalidItemTypeMessage,
  isValidItemType,
} = require("./itemTypeValidation");
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
const validateSharedQueryParams = (query, config) => {
  const limit_error = validateIntegerParam(
    query.limit,
    "limit",
    1,
    config.maxLimit,
  );
  if (limit_error) {
    return limit_error;
  }

  const page_error = validateIntegerParam(query.page, "page");
  if (page_error) {
    return page_error;
  }

  const filtered_seasons_error = validateIntegerListParam(
    query.filtered_seasons,
    "filtered_seasons",
  );
  if (filtered_seasons_error) {
    return filtered_seasons_error;
  }

  const status_error = validateStatusQuery(query.status, config);
  if (status_error) {
    return status_error;
  }

  return null;
};

module.exports = {
  validateItemTypeQuery,
  validateSharedQueryParams,
};
