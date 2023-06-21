/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

/* Importing the express module, creating an express app, importing the fetch module, and setting the
port to the one defined in the PORT variable. */
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8081;

const { config } = require("./src/config");
const { getItems } = require("./src/getItems");
const { MongoClient, ServerApiVersion } = require("mongodb");

const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Connecting to the database and the collection. */
const dbName = config.dbName;
const collectionName = config.collectionName;
const database = client.db(dbName);
const collectionData = database.collection(collectionName);

/**
 * Retrieves an item's ID from the database based on the given parameters.
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns None
 * @throws {Error} If there is an error retrieving the item from the database.
 */
async function getId(req, res) {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    if (id_path && ratings_filters_query) {
      try {
        const { items } = await getItems(cinema_id_query, id_path, item_type_query, ratings_filters_query);
        const results = items[0].results[0];

        res.status(200).json(results);
      } catch (error) {
        res.status(400).send(error);
      }
    } else {
      try {
        const query = { id: id_path };
        const items = await collectionData.findOne(query);

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    }
  } catch (error) {
    res.status(400).send(error);
  }
}

/**
 * It takes a JSON object as input, and returns a list of items from the database that match the input
 * @param json - the JSON object that contains the data to search for
 * @returns An array of items
 */
async function findId(json) {
  const keys = [];
  for (const key in json) {
    if (json.hasOwnProperty(key)) {
      keys.push(key);
    }
  }

  let query;
  if (keys.includes("title")) {
    query = { title: { $regex: json.title, $options: "i" } };
  } else if (keys.includes("allocineId")) {
    query = { "allocine.id": parseInt(json.allocineId) };
  } else if (keys.includes("betaseriesId")) {
    query = { "betaseries.id": json.betaseriesId };
  } else if (keys.includes("imdbId")) {
    query = { "imdb.id": json.imdbId };
  } else if (keys.includes("metacriticId")) {
    query = { "metacritic.id": json.metacriticId };
  } else if (keys.includes("rottentomatoesId")) {
    query = { "rottentomatoes.id": json.rottentomatoesId };
  } else if (keys.includes("themoviedbId")) {
    query = { id: parseInt(json.themoviedbId) };
  } else {
    query = {};
  }

  const data = collectionData.find(query);
  const results = await data.toArray();
  const total_results = await collectionData.countDocuments(query);

  return { results: results, total_results: total_results };
}

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
    const page_query = parseInt(req.query.page);
    const popularity_filters_query = req.query.popularity_filters;
    const ratings_filters_query = req.query.ratings_filters;
    const seasons_number_query = req.query.seasons_number;
    const status_query = req.query.status;

    let { items, limit, page } = await getItems(
      cinema_id_query,
      id_path,
      is_active_query,
      item_type_query,
      limit_query,
      page_query,
      popularity_filters_query,
      ratings_filters_query,
      seasons_number_query,
      status_query
    );
    const results = items[0].results;
    const total_results = items[0].total_results[0].total_results;

    let json = {
      page: page,
      results: results,
      total_pages: Math.ceil(total_results / limit),
      total_results: total_results,
    };

    const keysToCheck = ["allocineId", "betaseriesId", "imdbId", "metacriticId", "rottentomatoesId", "themoviedbId", "title"];
    for (let index = 0; index < keysToCheck.length; index++) {
      const key = keysToCheck[index];
      if (req.query.hasOwnProperty(key)) {
        const items = await findId(req.query);
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
      res.status(200).json({ message: `No items have been found for page ${page}.` });
    } else if (items.length === 0) {
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
  getId(req, res);
});

/* A route that is used to get the data for a specific tv show. */
app.get("/tv/:id", async (req, res) => {
  getId(req, res);
});

/* Starting the server on the port defined in the PORT variable. */
app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
