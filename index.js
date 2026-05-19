require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");

const app = express();

const { config } = require("./src/config");
const {
  getTvShowSeasonEpisodeDetails,
  getTvShowSeasonEpisodes,
  getTvShowSeasons,
} = require("./src/routes/getTvShowSeasons");
const {
  getUserPreferences,
  saveOrUpdateUserPreferences,
} = require("./src/routes/getOrSaveUserPreferences");
const { handleInvalidEndpoint } = require("./src/routes/handleInvalidEndpoint");
const { limiter } = require("./src/utils/rateLimiter");
const getId = require("./src/routes/getId");
const getItems = require("./src/routes/getItems");
const getRatedEpisodes = require("./src/routes/getRatedEpisodes");
const getUpdates = require("./src/routes/getUpdates");

const PORT = config.localPort;

/* Use CORS middleware. */
app.use(cors());

/* Handle pre-flight requests. */
app.options("*", cors());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

/* A route that is used to get the data for all items. */
app.get("/", limiter, getItems);

/* A route that is used to get the rated episodes across all tvshows. */
app.get("/episodes/rated", limiter, getRatedEpisodes);

/* A route that is used to get items added or updated since a given timestamp. */
app.get("/updates", limiter, getUpdates);

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", limiter, getId);

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", limiter, getId);

/* A route that is used to get all seasons for a specific tvshow. */
app.get("/tvshow/:id/seasons", limiter, getTvShowSeasons);

/* A route that is used to get all episodes for a specific tvshow season. */
app.get(
  "/tvshow/:id/seasons/:season_number/episodes",
  limiter,
  getTvShowSeasonEpisodes,
);

/* A route that is used to get a specific episode for a specific tvshow season. */
app.get(
  "/tvshow/:id/seasons/:season_number/episodes/:episode_number",
  limiter,
  getTvShowSeasonEpisodeDetails,
);

/* A route to get user preferences. */
app.get("/preferences/:email", getUserPreferences);

/* A route to save or update user preferences. */
app.post("/preferences/:email", saveOrUpdateUserPreferences);

/* Mount MCP over HTTP at /mcp, then start the server. */
async function start() {
  /* A route that is used to expose MCP tools over HTTP. */
  const { setupMCPRoutes } = await import("./src/mcp/http.mjs");
  setupMCPRoutes(app);

  /* Catch-all route for invalid endpoints. */
  app.all("*", handleInvalidEndpoint);

  /* Starting the server on the port defined in the PORT variable. */
  app.listen(PORT, () => {
    console.log(`server started on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
