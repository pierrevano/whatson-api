require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8081;

const { config } = require("./src/config");
const { getItems } = require("./src/getItems");
const findId = require("./src/findId");
const getId = require("./src/getId");

/**
 * Handles a GET request to the root endpoint and returns a JSON object containing
 * items that match the given query parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns None
 */
app.get("/", async (req, res) => {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const is_active_query = req.query.is_active;
    const item_type_query = req.query.item_type;
    const limit_query = parseInt(req.query.limit);
    const minimum_ratings_query = req.query.minimum_ratings;
    const page_query = parseInt(req.query.page);
    const platforms_query = req.query.platforms;
    const popularity_filters_query = req.query.popularity_filters;
    const ratings_filters_query = req.query.ratings_filters;
    const release_date_query = req.query.release_date;
    const seasons_number_query = req.query.seasons_number;
    const status_query = req.query.status;

    let { items, limit, page } = await getItems(
      cinema_id_query,
      id_path,
      is_active_query,
      item_type_query,
      limit_query,
      minimum_ratings_query,
      page_query,
      platforms_query,
      popularity_filters_query,
      ratings_filters_query,
      release_date_query,
      seasons_number_query,
      status_query,
    );
    const results = items[0].results;
    const total_results = items[0].total_results[0].total_results;

    let json = {
      page: page,
      results: results,
      total_pages: Math.ceil(total_results / limit),
      total_results: total_results,
    };

    for (let index = 0; index < config.keysToCheckForSearch.length; index++) {
      const key = config.keysToCheckForSearch[index];

      const lowerCaseQuery = {};
      for (let queryKey in req.query) {
        lowerCaseQuery[queryKey.toLowerCase()] = req.query[queryKey];
      }

      if (lowerCaseQuery.hasOwnProperty(key)) {
        const items = await findId(lowerCaseQuery);
        const results = items.results;
        const total_results = items.total_results;

        json = {
          page: 1,
          results: results,
          total_pages: 1,
          total_results: total_results,
        };

        break;
      }
    }

    if (page > Math.ceil(total_results / limit)) {
      res
        .status(200)
        .json({ message: `No items have been found for page ${page}.` });
    } else if (json.results.length === 0) {
      res.status(200).json({ message: "No items have been found." });
    } else {
      res.status(200).json(json);
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

/* A route that is used to get the data for a specific movie. */
app.get("/movie/:id", async (req, res) => {
  await getId(req, res);
});

/* A route that is used to get the data for a specific tvshow. */
app.get("/tvshow/:id", async (req, res) => {
  await getId(req, res);
});

/* Starting the server on the port defined in the PORT variable. */
app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
