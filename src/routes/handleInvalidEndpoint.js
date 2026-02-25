const { sendResponse } = require("../utils/sendRequest");

const allowedEndpoints = [
  "GET /",
  "GET /movie/:id",
  "GET /tvshow/:id",
  "GET /tvshow/:id/seasons",
  "GET /tvshow/:id/seasons/:season_number/episodes",
  "GET /tvshow/:id/seasons/:season_number/episodes/:episode_number",
];

const routeSpecs = [
  { pattern: /^\/$/, methods: ["GET"] },
  { pattern: /^\/movie\/[^/]+$/, methods: ["GET"] },
  { pattern: /^\/tvshow\/[^/]+$/, methods: ["GET"] },
  { pattern: /^\/tvshow\/[^/]+\/seasons$/, methods: ["GET"] },
  { pattern: /^\/tvshow\/[^/]+\/seasons\/[^/]+\/episodes$/, methods: ["GET"] },
  {
    pattern: /^\/tvshow\/[^/]+\/seasons\/[^/]+\/episodes\/[^/]+$/,
    methods: ["GET"],
  },
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
