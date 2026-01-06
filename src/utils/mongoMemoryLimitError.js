const { MongoServerError } = require("mongodb");

const MONGO_MEMORY_LIMIT_ERROR_CODES = new Set([292, 16819]);

/**
 * Detects aggregation failures triggered by MongoDB sort memory limits.
 *
 * @param {Error} error - Error thrown by the MongoDB driver.
 * @returns {boolean} True if the error indicates the sort memory limit was exceeded.
 */
const isMongoMemoryLimitError = (error) =>
  error instanceof MongoServerError &&
  (MONGO_MEMORY_LIMIT_ERROR_CODES.has(error.code) ||
    error.codeName === "QueryExceededMemoryLimitNoDiskUseAllowed");

module.exports = { isMongoMemoryLimitError };
