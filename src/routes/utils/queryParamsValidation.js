const {
  invalidItemTypeMessage,
  isValidItemType,
} = require("../../utils/itemTypeValidation");
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

  return null;
};

module.exports = {
  validateItemTypeQuery,
  validateSharedQueryParams,
};
