const { config } = require("../../src/config");

/**
 * Builds a validation message for an invalid sort order.
 *
 * @param {string} name - Parameter name.
 * @param {string} value - Received value.
 * @returns {string} Formatted validation message.
 */
const getInvalidSortOrderMessage = (name, value) =>
  `${config.invalidSortOrderMessage.replace("{name}", name)} Received '${value}'.`;

module.exports = { getInvalidSortOrderMessage };
