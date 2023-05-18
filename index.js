/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

/* Importing the express module, creating an express app, importing the fetch module, and setting the
port to the one defined in the PORT variable. */
const express = require("express");
const app = express();
const fetch = require("node-fetch");
const PORT = process.env.PORT || 8081;

/* This is importing the MongoClient and ServerApiVersion from the mongodb module. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Defining the name of the collection and the database. */
const config = {
  dbName: "whatson",
  collectionName: "data",

  corsURL: "https://cors-sites-aafe82ad9d0c.fly.dev/",
  baseURLTheaters: "https://www.allocine.fr/_/showtimes/theater-",

  limit: 20,
  maxSeasonsNumber: 5,
  page: 1,
};

/* Connecting to the database and the collection. */
const dbName = config.dbName;
const collectionName = config.collectionName;
const database = client.db(dbName);
const collectionData = database.collection(collectionName);

/**
 * It fetches the movie IDs from the Allocine website, and returns them in an array
 * @param cinemaIdParam - the cinema ID you want to get the movies from
 * @returns An array of movie ids
 */
const getMoviesIds = async (cinemaIdParam) => {
  const base_url = `${config.corsURL}${config.baseURLTheaters}`;

  const allMoviesIds = [];
  let resultsLength = 0;
  let pageNumber = 1;
  do {
    const complete_url = `${base_url}${cinemaIdParam}/d-0/p-${pageNumber}/`;
    const response = await fetch(complete_url);
    const data = await response.json();

    const results = data.results;
    resultsLength = results.length;
    if (resultsLength === 15) {
      pageNumber++;
    }

    results.forEach((element) => {
      allMoviesIds.push(element.movie.internalId);
    });
  } while (resultsLength === 15);

  return allMoviesIds;
};

/**
 * It takes a string as an argument and returns an array of objects
 * @param ratings_filters_query - a string of ratings filters separated by commas.
 * @returns An array of objects
 */
const getRatingsFilters = async (ratings_filters_query) => {
  // ratings_filters query info
  const ratings_filters_array = ratings_filters_query.split(",");
  let ratings_filters = [];
  if (ratings_filters_array.includes("all")) {
    // prettier-ignore
    ratings_filters = [
      { $divide: ["$allocine.critics_rating", 1] },
      { $divide: ["$allocine.users_rating", 1] },
      { $divide: ["$betaseries.users_rating", 1] },
      { $divide: ["$imdb.users_rating", 2] },
      { $divide: ["$metacritic.critics_rating", 20] },
      { $divide: ["$metacritic.users_rating", 2] }
    ];
  } else {
    if (ratings_filters_array.includes("allocine_critics")) {
      ratings_filters.push({ $divide: ["$allocine.critics_rating", 1] });
    }

    if (ratings_filters_array.includes("allocine_users")) {
      ratings_filters.push({ $divide: ["$allocine.users_rating", 1] });
    }

    if (ratings_filters_array.includes("betaseries_users")) {
      ratings_filters.push({ $divide: ["$betaseries.users_rating", 1] });
    }

    if (ratings_filters_array.includes("imdb_users")) {
      ratings_filters.push({ $divide: ["$imdb.users_rating", 2] });
    }

    if (ratings_filters_array.includes("metacritic_critics")) {
      ratings_filters.push({ $divide: ["$metacritic.critics_rating", 20] });
    }

    if (ratings_filters_array.includes("metacritic_users")) {
      ratings_filters.push({ $divide: ["$metacritic.users_rating", 2] });
    }
  }

  return ratings_filters;
};

/**
 * Retrieves items from the database based on the given parameters.
 * @param {string} cinema_id_query - The cinema ID to filter by.
 * @param {string} id_path - The ID of the item to retrieve.
 * @param {boolean} is_active_query - Whether or not the item is active.
 * @param {string} item_type_query - The type of item to retrieve.
 * @param {number} limit_query - The maximum number of items to retrieve.
 * @param {number} page_query - The page number to retrieve.
 * @param {string} ratings_filters_query - The ratings filters to apply.
 * @param {string} seasons_number_query - The seasons number to filter by.
 * @returns An object containing the number of elements, the retrieved items, the limit, and the page.
 */
const getItems = async (cinema_id_query, id_path, is_active_query, item_type_query, limit_query, page_query, ratings_filters_query, seasons_number_query) => {
  const id = isNaN(id_path) ? "" : id_path;
  const is_active = typeof is_active_query !== "undefined" ? is_active_query : true;
  const item_type = typeof item_type_query !== "undefined" ? item_type_query : "movie";
  const limit = isNaN(limit_query) ? config.limit : limit_query;
  const movies_ids = typeof cinema_id_query !== "undefined" ? await getMoviesIds(cinema_id_query) : "";
  const page = isNaN(page_query) ? config.page : page_query;
  const ratings_filters_query_value = typeof ratings_filters_query !== "undefined" ? ratings_filters_query : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const seasons_number = typeof seasons_number_query !== "undefined" ? seasons_number_query : "";

  const addFields_ratings_filters = { $addFields: { ratings_average: { $avg: ratings_filters } } };

  let is_active_item = { is_active: (is_true = is_active === "true") };
  const is_active_all = { $or: [{ is_active: true }, { is_active: false }] };
  is_active_item = is_active === "true,false" || is_active === "false,true" ? is_active_all : is_active_item;

  let item_type_default = { item_type: item_type };
  const item_type_all = { $or: [{ item_type: "movie" }, { item_type: "tvshow" }] };
  item_type_default = item_type === "movie,tvshow" || item_type === "tvshow,movie" ? item_type_all : item_type_default;

  const item_type_tvshow = { item_type: "tvshow" };
  const match_id = { $match: { id: id } };
  const match_in_movies_ids = { $match: { "allocine.id": { $in: movies_ids } } };
  const seasons_number_first = { seasons_number: { $in: seasons_number.split(",").map(Number) } };
  const seasons_number_last = { seasons_number: { $gt: config.maxSeasonsNumber } };

  const limit_results = { $limit: limit };
  const match_item_type = { $match: { $and: [item_type_default, is_active_item] } };
  const match_item_type_tvshow_and_seasons_number = { $match: { $and: [item_type_tvshow, is_active_item, seasons_number_first] } };
  const match_item_type_tvshow_and_seasons_number_more_than_max = { $match: { $and: [item_type_tvshow, is_active_item, { $or: [seasons_number_first, seasons_number_last] }] } };
  const skip_results = { $skip: (page - 1) * limit };
  const sort_ratings = { $sort: { ratings_average: -1 } };
  const facet = { $facet: { results: [addFields_ratings_filters, sort_ratings, skip_results, limit_results], total_results: [{ $count: "total_results" }] } };

  const pipeline = [];
  if (id !== "") {
    pipeline.push(match_id);
  } else if (item_type === "tvshow" && seasons_number.includes(config.maxSeasonsNumber)) {
    pipeline.push(match_item_type_tvshow_and_seasons_number_more_than_max);
  } else if (item_type === "tvshow" && seasons_number !== "") {
    pipeline.push(match_item_type_tvshow_and_seasons_number);
  } else if (item_type === "tvshow") {
    pipeline.push(match_item_type);
  } else if (movies_ids !== "") {
    pipeline.push(match_in_movies_ids);
  } else {
    pipeline.push(match_item_type);
  }

  pipeline.push(facet);

  console.log(pipeline);

  const data = await collectionData.aggregate(pipeline);
  const items = await data.toArray();

  return { items: items, limit: limit, page: page };
};

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
        res.status(200).json(items[0]);
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
  const items = [];
  for await (const item of data) {
    items.push(item);
  }

  return items;
}

app.get("/", async (req, res) => {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const is_active_query = req.query.is_active;
    const item_type_query = req.query.item_type;
    const limit_query = parseInt(req.query.limit);
    const page_query = parseInt(req.query.page);
    const ratings_filters_query = req.query.ratings_filters;
    const seasons_number_query = req.query.seasons_number;

    let { items, limit, page } = await getItems(cinema_id_query, id_path, is_active_query, item_type_query, limit_query, page_query, ratings_filters_query, seasons_number_query);

    const keysToCheck = ["allocineId", "betaseriesId", "imdbId", "metacriticId", "rottentomatoesId", "themoviedbId", "title"];
    for (let index = 0; index < keysToCheck.length; index++) {
      const key = keysToCheck[index];
      if (req.query.hasOwnProperty(key)) {
        items = await findId(req.query);
        break;
      }
    }

    if (items.length === 0) {
      res.status(204).json({ message: "No items have been found!" });
    } else {
      const results = items[0].results;
      const total_results = items[0].total_results[0].total_results;

      res.status(200).json({
        page: page,
        results: results,
        total_pages: Math.ceil(total_results / limit),
        total_results: total_results,
      });
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
