require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8081;

const { limiter } = require("./src/utils/rateLimiter");
const { sendInternalError } = require("./src/utils/sendRequest");
const {
  getUserPreferences,
  saveOrUpdateUserPreferences,
} = require("./src/routes/getOrSaveUserPreferences");
const getId = require("./src/routes/getId");
const getItems = require("./src/routes/getItems");

// Use CORS middleware
app.use(cors());

// Handle pre-flight requests
app.options("*", cors());

app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

/* A route that is used to get the data for all items. */
app.get("/", limiter, getItems);

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", limiter, getId);

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", limiter, getId);

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
