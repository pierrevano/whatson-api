const { config } = require("../../config");

/**
 * Resolves the effective result limit.
 *
 * @param {number|string|undefined} requested - Requested limit value.
 * @returns {number} The resolved limit, within the configured bounds.
 */
const resolveLimit = (requested) =>
  Math.min(Math.max(Number(requested) || config.limit, 1), config.maxLimit);

module.exports = { resolveLimit };
