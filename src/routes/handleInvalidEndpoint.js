const { config } = require("../config");
const { sendResponse } = require("../utils/sendRequest");

const allowedEndpoints = [
  "GET /",
  "GET /episodes/rated",
  "GET /movie/:id",
  "GET /tvshow/:id",
  "GET /tvshow/:id/seasons",
  "GET /tvshow/:id/seasons/:season_number/episodes",
  "GET /tvshow/:id/seasons/:season_number/episodes/:episode_number",
  "GET /updates",
];

const routeSpecs = [
  { pattern: /^\/$/, methods: ["GET"] },
  { pattern: /^\/episodes\/rated\/?$/i, methods: ["GET"] },
  { pattern: /^\/movie\/[^/]+\/?$/i, methods: ["GET"] },
  { pattern: /^\/tvshow\/[^/]+\/?$/i, methods: ["GET"] },
  {
    pattern: /^\/tvshow\/[^/]+\/seasons\/?$/i,
    methods: ["GET"],
  },
  {
    pattern: /^\/tvshow\/[^/]+\/seasons\/[^/]+\/episodes\/?$/i,
    methods: ["GET"],
  },
  {
    pattern: /^\/tvshow\/[^/]+\/seasons\/[^/]+\/episodes\/[^/]+\/?$/i,
    methods: ["GET"],
  },
  { pattern: /^\/updates\/?$/i, methods: ["GET"] },
];

const handleInvalidEndpoint = (req, res) => {
  const matchingRoute = routeSpecs.find((route) =>
    route.pattern.test(req.path),
  );

  if (matchingRoute && !matchingRoute.methods.includes(req.method)) {
    res.set("Allow", matchingRoute.methods.join(", "));
    return sendResponse(res, 405, {
      message: `${config.invalidMethodMessage} Allowed methods are: ${matchingRoute.methods.join(", ")}. Received '${req.method} ${req.path}'.`,
    });
  }

  return sendResponse(res, 404, {
    message: `${config.invalidEndpointMessage} Allowed endpoints are: ${allowedEndpoints.join(", ")}. Received '${req.path}'.`,
  });
};

module.exports = { handleInvalidEndpoint };
