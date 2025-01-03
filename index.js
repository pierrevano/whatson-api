require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8081;

const { config } = require("./src/config");
const { sendInternalError, sendResponse } = require("./src/utils/sendRequest");
const {
  getUserPreferences,
  saveOrUpdateUserPreferences,
} = require("./src/routes/getOrSaveUserPreferences");
const getId = require("./src/routes/getId");
const getItems = require("./src/routes/getItems");

app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

app.use(express.json());

const limiter = rateLimit({
  windowMs: config.windowMs,
  max: config.max,
  handler: (req, res) => {
    sendResponse(res, 429, {
      message:
        "Too many requests. Please try again later. If you need an API key for higher limits, contact me on: https://pierrevano.github.io",
    });
  },
  skip: (req) => req.query.api_key === config.internalApiKey,
});

// Apply the rate limiter to all routes
app.use(limiter);

/* A route that is used to get the data for all items. */
app.get("/", getItems);

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", getId);

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", getId);

/* A route to get user preferences */
app.get("/preferences/:email", getUserPreferences);

/* A route to save or update user preferences */
app.post("/preferences/:email", saveOrUpdateUserPreferences);

/* Catch-all route for invalid endpoints */
app.all("*", (req, res) => {
  const error = new Error(
    `Invalid endpoint: ${req.originalUrl}. Allowed endpoints are: '/', '/movie/:id', '/tvshow/:id'.`,
  );
  sendInternalError(res, error);
});

/* Starting the server on the port defined in the PORT variable. */
app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
