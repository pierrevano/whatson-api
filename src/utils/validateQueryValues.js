const { sendResponse } = require("./sendRequest");

/**
 * Rejects requests whose query parameters are not strings.
 *
 * @param {import("express").Request} req - Express request.
 * @param {import("express").Response} res - Express response.
 * @param {import("express").NextFunction} next - Next middleware callback.
 * @returns {void}
 */
const validateQueryValues = (req, res, next) => {
  if (Object.values(req.query).some((value) => typeof value !== "string")) {
    return sendResponse(res, 400, {
      message: "Query parameters must be single string values.",
    });
  }

  next();
};

module.exports = { validateQueryValues };
