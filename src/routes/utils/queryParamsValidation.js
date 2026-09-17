const { config } = require("../../config");
const {
  invalidQueryValueMessage,
  resolveValidationMessage,
  validateIntegerListParam,
  validateIntegerParam,
} = require("./queryValidationMessages");
const { isValidISODate } = require("../../utils/parseReleaseDateRange");
const { sendResponse } = require("../../utils/sendRequest");

const validateAllowedValues = (
  value,
  allowed,
  message,
  { allowMultiple = true, name } = {},
) => {
  if (value === undefined) return null;

  const values = value.split(",");
  const hasDuplicateValue = new Set(values).size !== values.length;
  const hasInvalidValue = values.some((item) => !allowed.includes(item));
  const hasMultipleValues = !allowMultiple && values.length > 1;
  if (!hasDuplicateValue && !hasInvalidValue && !hasMultipleValues) return null;

  return invalidQueryValueMessage(message, value, name);
};

/**
 * Validates the optional item type query parameter.
 *
 * @param {string|undefined} itemTypeQuery
 * @returns {string|null}
 */
const validateItemTypeQuery = (itemTypeQuery) =>
  validateAllowedValues(
    itemTypeQuery,
    config.itemTypes,
    config.invalidItemTypeMessage,
  );

/**
 * Validates the optional updates cutoff query parameter.
 *
 * @param {string|undefined} sinceQuery
 * @returns {string|null}
 */
const validateSinceQuery = (sinceQuery) =>
  sinceQuery !== undefined && !isValidISODate(sinceQuery)
    ? invalidQueryValueMessage(config.invalidSinceMessage, sinceQuery)
    : null;

/**
 * Validates the optional status query parameter.
 *
 * @param {string|undefined} statusQuery
 * @returns {string|null}
 */
const validateStatusQuery = (statusQuery) => {
  if (statusQuery === undefined) return null;

  const allowed = config.allowedTvshowStatuses.map((s) => s.toLowerCase());
  const values = statusQuery.split(",").map((s) => s.trim().toLowerCase());
  if (
    new Set(values).size === values.length &&
    values.every((s) => allowed.includes(s))
  ) {
    return null;
  }

  return invalidQueryValueMessage(config.invalidStatusMessage, statusQuery);
};

const validateBooleanQueryParams = (query) => {
  const booleanParams = [
    "critics_certified",
    "is_active",
    "is_adult",
    "must_see",
    "users_certified",
  ];
  for (const name of booleanParams) {
    const message = validateAllowedValues(
      query[name],
      config.booleanQueryValues,
      config.invalidBooleanMessage,
      { name },
    );
    if (message) return message;
  }

  return null;
};

/**
 * Validates query params shared across endpoints.
 *
 * @param {import("express").Request["query"]} query
 * @returns {string|null}
 */
const validateSharedQueryParams = (query) =>
  validateIntegerParam(query.limit, "limit", 1, config.maxLimit) ||
  validateIntegerParam(query.page, "page") ||
  validateIntegerListParam(query.filtered_seasons, "filtered_seasons") ||
  validateStatusQuery(query.status);

const validateFilterQueryParams = (
  query,
  {
    allowedAppendValues = config.appendToResponse.split(","),
    allowReleaseDateShortcuts = false,
    invalidAppendMessage = config.invalidAppendToResponseMessage,
    maximumRating = 10,
  } = {},
) => {
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
      return invalidQueryValueMessage(
        config.invalidMinimumRatingsMessage,
        query.minimum_ratings,
      );
    }

    if (
      values.some((value) => Number(value) < 0 || Number(value) > maximumRating)
    ) {
      const message = resolveValidationMessage(
        config.invalidMinimumRatingsRangeMessage,
        { maximum: maximumRating },
      );
      return invalidQueryValueMessage(message, query.minimum_ratings);
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
        return invalidQueryValueMessage(
          config.invalidReleaseDateMessage,
          query.release_date,
        );
      }
      bounds.add(bound);
    }
  }

  const validateSortOrder = (name) =>
    validateAllowedValues(
      query[name],
      config.sortOrders,
      resolveValidationMessage(config.invalidSortOrderMessage, { name }),
      { allowMultiple: false },
    );

  return (
    validateAllowedValues(
      query.append_to_response,
      allowedAppendValues,
      invalidAppendMessage,
    ) ||
    validateAllowedValues(
      query.ratings_filters,
      [...config.ratings_filters.split(","), "all"],
      config.invalidRatingsFiltersMessage,
    ) ||
    validateAllowedValues(
      query.popularity_filters,
      [...config.popularityFilters, "all", "none"],
      config.invalidPopularityFiltersMessage,
    ) ||
    validateSortOrder("order") ||
    validateSortOrder("top_ranking_order") ||
    validateSortOrder("mojo_rank_order")
  );
};

const validateQueryParams =
  (
    allowedParams = [
      ...config.allowedQueryParams,
      ...config.keysToCheckForSearch,
    ],
    options = {},
  ) =>
  (req, res, next) => {
    const invalidParams = Object.keys(req.query).filter(
      (key) => !allowedParams.includes(key),
    );
    if (invalidParams.length > 0) {
      return sendResponse(res, 400, {
        message: invalidQueryValueMessage(
          config.invalidQueryParamsMessage,
          invalidParams.join(", "),
        ),
      });
    }

    for (const [name, value] of Object.entries(req.query)) {
      if (config.numericIdKeys.includes(name)) {
        const message = validateIntegerParam(value, name);
        if (message) return sendResponse(res, 400, { message });
      }
    }

    const message =
      validateSharedQueryParams(req.query) ||
      validateItemTypeQuery(req.query.item_type) ||
      validateBooleanQueryParams(req.query) ||
      validateIntegerListParam(req.query.runtime, "runtime", 0) ||
      validateIntegerListParam(req.query.seasons_number, "seasons_number") ||
      validateIntegerParam(
        req.query.minimum_users_rating_count,
        "minimum_users_rating_count",
        0,
      ) ||
      validateFilterQueryParams(req.query, options);
    if (message) return sendResponse(res, 400, { message });

    next();
  };

module.exports = {
  validateFilterQueryParams,
  validateItemTypeQuery,
  validateQueryParams,
  validateSharedQueryParams,
  validateSinceQuery,
};
