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

  limit: 200,
  maxSeasonsNumber: 4,
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
      { $divide: ["$imdb.users_rating", 2] }
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
  }

  return ratings_filters;
};

/**
 * It returns the data from the database, based on the parameters passed to it
 * @param id - the id of the item you want to get the recommendations for
 * @param item_type - movie or tvshow
 * @param movies_ids - a list of movies ids
 * @param ratings_filters - an array of the ratings filters to apply to the query.
 * @param seasons_number - the number of seasons of a TV show
 * @returns An array of objects.
 */
const getData = async (id, item_type, movies_ids, ratings_filters, seasons_number) => {
  console.log(`id: ${id}`);
  console.log(`item_type: ${item_type}`);
  console.log(`movies_ids: ${movies_ids}`);
  console.log(ratings_filters);
  console.log(`seasons_number: ${seasons_number}`);

  const addFields_ratings_filters = { $addFields: { ratings_average: { $avg: ratings_filters } } };
  const is_active = { is_active: true };
  const item_type_movie = { item_type: "movie" };
  const item_type_tvshow = { item_type: "tvshow" };
  const match_id = { $match: { id: id } };
  const match_in_movies_ids = { $match: { "allocine.id": { $in: movies_ids } } };
  const seasons_number_first = { seasons_number: { $in: seasons_number.split(",").map(Number) } };
  const seasons_number_last = { seasons_number: { $gt: config.maxSeasonsNumber } };

  const match_item_type_movie = { $match: { $and: [item_type_movie, is_active] } };
  const match_item_type_tvshow = { $match: { $and: [item_type_tvshow, is_active] } };
  const match_item_type_tvshow_and_seasons_number = { $match: { $and: [item_type_tvshow, is_active, seasons_number_first] } };
  const match_item_type_tvshow_and_seasons_number_more_than_max = { $match: { $and: [item_type_tvshow, is_active, { $or: [seasons_number_first, seasons_number_last] }] } };
  const sort_ratings = { $sort: { ratings_average: -1 } };

  const pipeline = [];
  if (id !== "") {
    pipeline.push(match_id, addFields_ratings_filters, sort_ratings);
  } else if (item_type === "tvshow" && seasons_number.includes(config.maxSeasonsNumber)) {
    pipeline.push(match_item_type_tvshow_and_seasons_number_more_than_max, addFields_ratings_filters, sort_ratings);
  } else if (item_type === "tvshow" && seasons_number !== "") {
    pipeline.push(match_item_type_tvshow_and_seasons_number, addFields_ratings_filters, sort_ratings);
  } else if (item_type === "tvshow") {
    pipeline.push(match_item_type_tvshow, addFields_ratings_filters, sort_ratings);
  } else if (movies_ids !== "") {
    pipeline.push(match_in_movies_ids, addFields_ratings_filters, sort_ratings);
  } else {
    pipeline.push(match_item_type_movie, addFields_ratings_filters, sort_ratings);
  }

  console.log(pipeline);

  const data = await collectionData.aggregate(pipeline);
  const items = [];
  for await (const item of data) {
    items.push(item);
  }
  const limitedItems = items.slice(0, config.limit);

  return limitedItems;
};

/**
 * It gets the items from the database
 * @param id_path - The id of the item we're looking for.
 * @param item_type_query - the type of item we want to get (movie or tvshow)
 * @param cinema_id_query - The id of the cinema.
 * @param ratings_filters_query - The ratings filters to apply (all, allocine_critics, allocine_users, betaseries_users, imdb_users)
 * @param seasons_number_query - The number of seasons to return.
 * @returns An array of items.
 */
const getItems = async (id_path, item_type_query, cinema_id_query, ratings_filters_query, seasons_number_query) => {
  console.log(`id_path: ${id_path}`);
  console.log(`item_type_query: ${item_type_query}`);
  console.log(`cinema_id_query: ${cinema_id_query}`);
  console.log(`ratings_filters_query: ${ratings_filters_query}`);
  console.log(`seasons_number_query: ${seasons_number_query}`);

  const id = isNaN(id_path) ? "" : id_path;
  const item_type = typeof item_type_query !== "undefined" ? item_type_query : "";
  const movies_ids = typeof cinema_id_query !== "undefined" ? await getMoviesIds(cinema_id_query) : "";
  const ratings_filters_query_value = typeof ratings_filters_query !== "undefined" ? ratings_filters_query : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const seasons_number = typeof seasons_number_query !== "undefined" ? seasons_number_query : "";
  const items = await getData(id, item_type, movies_ids, ratings_filters, seasons_number);

  return items;
};

/**
 * It takes in a request and a response, and then it tries to get the id from the request, and then it
 * tries to get the items from the database, and then it sends the items back in the response
 * @param req - The request object.
 * @param res - the response object
 */
async function getId(req, res) {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    if (id_path && ratings_filters_query) {
      try {
        const items = await getItems(id_path, item_type_query, cinema_id_query, ratings_filters_query);
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
    let items = "";

    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    const seasons_number_query = req.query.seasons_number;

    items = await getItems(id_path, item_type_query, cinema_id_query, ratings_filters_query, seasons_number_query);

    const keysToCheck = ["title", "allocineId", "betaseriesId", "imdbId", "themoviedbId"];
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
      res.status(200).json(items);
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
