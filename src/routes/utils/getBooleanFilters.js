const { config } = require("../../config");

/**
 * Builds match conditions from boolean query parameters.
 *
 * @param {Record<string, string|undefined>} [query] - Boolean query parameter values (e.g., is_active, is_adult).
 * @param {Record<string, string>} [defaultValues] - Overrides for default query values.
 * @returns {Record<string, object>} Match conditions keyed by query parameter.
 */
const getBooleanFilters = (query, defaultValues = {}) => {
  const defaults = {
    is_active: "true,false",
    is_adult: "false",
    ...defaultValues,
  };
  const filters = {};

  for (const field of config.booleanQueryFields) {
    const name = field.split(".").pop();
    const value = query?.[name] ?? defaults[name];
    const includesBothValues = value === "true,false" || value === "false,true";

    filters[name] = {};
    if (value === "true" || value === "false") {
      filters[name] = { [field]: value === "true" };
    } else if (includesBothValues) {
      filters[name] = { $or: [{ [field]: true }, { [field]: false }] };
    }
  }

  return filters;
};

module.exports = { getBooleanFilters };
