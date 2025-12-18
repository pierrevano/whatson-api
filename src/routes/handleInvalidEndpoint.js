const { sendResponse } = require("../utils/sendRequest");

const allowedEndpoints = ["GET /", "GET /movie/:id", "GET /tvshow/:id"];

const routeSpecs = [
  { pattern: /^\/$/, methods: ["GET"] },
  { pattern: /^\/movie\/[^/]+$/, methods: ["GET"] },
  { pattern: /^\/tvshow\/[^/]+$/, methods: ["GET"] },
];

const handleInvalidEndpoint = (req, res) => {
  const matchingRoute = routeSpecs.find((route) =>
    route.pattern.test(req.path),
  );

  if (matchingRoute && !matchingRoute.methods.includes(req.method)) {
    res.set("Allow", matchingRoute.methods.join(", "));
    return sendResponse(res, 405, {
      message: `Method not allowed: ${req.method} ${req.path}. Allowed methods: ${matchingRoute.methods.join(", ")}.`,
    });
  }

  return sendResponse(res, 404, {
    message: `Invalid endpoint: ${req.originalUrl}. Allowed endpoints are: ${allowedEndpoints.join(", ")}.`,
  });
};

module.exports = { handleInvalidEndpoint };
