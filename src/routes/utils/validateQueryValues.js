const { config } = require("../../config");
const { sendResponse } = require("../../utils/sendRequest");

/**
 * Normalizes query parameter names and validates their values.
 *
 * @param {import("express").Request} req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {import("express").Response|void}
 */
const validateQueryValues = (req, res, next) => {
  const normalizedQuery = Object.fromEntries(
    Object.entries(req.query).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const hasDuplicateNames =
    Object.keys(normalizedQuery).length !== Object.keys(req.query).length;
  const hasInvalidValues = Object.values(normalizedQuery).some(
    (value) => typeof value !== "string",
  );
  if (hasDuplicateNames || hasInvalidValues) {
    return sendResponse(res, 400, {
      message: config.invalidQueryValuesMessage,
    });
  }

  req.query = normalizedQuery;
  next();
};

module.exports = { validateQueryValues };
