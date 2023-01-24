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
  collectionName: "data",
  dbName: "whatson",
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
  const cors_url = "https://cors-sites-aafe82ad9d0c.fly.dev/";
  const base_url = `${cors_url}https://www.allocine.fr/_/showtimes/theater-`;

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
 * It returns the data from the database, filtered by the parameters passed to it
 * @param id - the id of the item you want to get
 * @param item_type - "movie" or "tvshow"
 * @param movies_ids - an array of movies ids
 * @param ratings_filters - an array of the ratings you want to filter by.
 * @returns An array of objects
 */
const getData = async (id, item_type, movies_ids, ratings_filters) => {
  const addFields_ratings_filters = { $addFields: { ratings_average: { $avg: ratings_filters } } };
  const match_id = { $match: { id: id } };
  const match_in_movies_ids = { $match: { "allocine.id": { $in: movies_ids } } };
  const match_item_type_movie = { $match: { $and: [{ item_type: "movie" }, { is_active: true }] } };
  const match_item_type_tvshow = { $match: { $and: [{ item_type: "tvshow" }, { is_active: true }] } };
  const sort_ratings = { $sort: { ratings_average: -1 } };

  const pipeline = [];
  if (id !== "") {
    pipeline.push(match_id, addFields_ratings_filters, sort_ratings);
  } else if (movies_ids !== "") {
    pipeline.push(match_in_movies_ids, addFields_ratings_filters, sort_ratings);
  } else if (item_type === "tvshow") {
    pipeline.push(match_item_type_tvshow, addFields_ratings_filters, sort_ratings);
  } else {
    pipeline.push(match_item_type_movie, addFields_ratings_filters, sort_ratings);
  }

  const data = await collectionData.aggregate(pipeline);
  const items = [];
  for await (const item of data) {
    items.push(item);
  }

  return items;
};

/**
 * It gets the items from the database
 * @param id_path - The id of the item we're looking for.
 * @param item_type_query - the type of item you want to get.
 * @param cinema_id_query - The cinema ID that the user has selected.
 * @param ratings_filters_query - This is the query parameter that is passed in the URL. It can be one
 * of the following:
 * @returns The function getItems is returning the items.
 */
const getItems = async (id_path, item_type_query, cinema_id_query, ratings_filters_query) => {
  const id = isNaN(id_path) ? "" : id_path;
  const item_type = typeof item_type_query !== "undefined" ? item_type_query : "";
  const movies_ids = typeof cinema_id_query !== "undefined" ? await getMoviesIds(cinema_id_query) : "";
  const ratings_filters_query_value = typeof ratings_filters_query !== "undefined" ? ratings_filters_query : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const items = await getData(id, item_type, movies_ids, ratings_filters);

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

app.get("/", async (req, res) => {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;

    const items = await getItems(id_path, item_type_query, cinema_id_query, ratings_filters_query);
    res.status(200).json(items);
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
