/**
 * Compute a wait time (ms) from common rate-limit headers.
 * @param {Object} headers - Response headers map (case-insensitive keys).
 * @returns {number|null} Milliseconds to wait, or null if no valid header found.
 */
const getRateLimitWaitMs = (headers = {}) => {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      String(key).toLowerCase(),
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const retryAfter = normalized["retry-after"];
  const reset =
    normalized["ratelimit-reset"] ||
    normalized["x-ratelimit-reset"] ||
    normalized["x-rate-limit-reset"];
  const raw = retryAfter ?? reset;

  if (raw === undefined || raw === null || raw === "") return null;

  const value = String(raw).trim();
  const numberValue = Number(value);
  if (!Number.isNaN(numberValue)) {
    if (retryAfter !== undefined) return numberValue * 1000;
    if (numberValue >= 1e12) return Math.max(0, numberValue - Date.now());
    if (numberValue >= 1e9) return Math.max(0, numberValue * 1000 - Date.now());
    return numberValue * 1000;
  }

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
};

module.exports = { getRateLimitWaitMs };
