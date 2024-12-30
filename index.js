require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8081;

const getItems = require("./src/routes/getItems");
const getId = require("./src/routes/getId");
const {
  getUserPreferences,
  saveOrUpdateUserPreferences,
} = require("./src/routes/getOrSaveUserPreferences");
const { sendInternalError } = require("./src/utils/sendRequest");

app.use((err, _, res, next) => {
  if (!err) {
    // Handle CORS headers for all requests
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    return next();
  }

  // Handle errors
  sendInternalError(res, err);
});

app.use(express.json());

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
