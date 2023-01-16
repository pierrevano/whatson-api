/* This is importing the express module and creating an express app. */
const dotenv = require("dotenv");
dotenv.config();

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

app.get("/", async (req, res) => {
  try {
    const cinema_id_query = req.query.cinema_id;
    const is_active_query = req.query.is_active;
    const ratings_filters_query = req.query.ratings_filters;
    if (cinema_id_query && ratings_filters_query) {
      try {
        // cinema_id query info
        const movies_ids = await getMoviesIds(cinema_id_query);

        // ratings_filters query info
        const ratings_filters_array = ratings_filters_query.split(",");
        let ratings_filters = [];
        if (ratings_filters_array.includes("all")) {
          ratings_filters = [
            { $divide: ["$allocine.critics_rating", 1] },
            { $divide: ["$allocine.users_rating", 1] },
            { $divide: ["$betaseries.users_rating", 1] },
            { $divide: ["$imdb.users_rating", 2] },
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

        const pipeline = [
          {
            $match: {
              "allocine.id": {
                $in: movies_ids,
              },
            },
          },
          {
            $addFields: {
              ratings_average: { $avg: ratings_filters },
            },
          },
          {
            $sort: {
              ratings_average: -1,
            },
          },
        ];
        const data = await collectionData.aggregate(pipeline);
        const items = [];
        for await (const item of data) {
          items.push(item);
        }

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    } else if (cinema_id_query) {
      try {
        // cinema_id query info
        const movies_ids = await getMoviesIds(cinema_id_query);

        // ratings_filters query info
        const ratings_filters = [
          { $divide: ["$allocine.critics_rating", 1] },
          { $divide: ["$allocine.users_rating", 1] },
          { $divide: ["$betaseries.users_rating", 1] },
          { $divide: ["$imdb.users_rating", 2] },
        ];

        const pipeline = [
          {
            $match: {
              "allocine.id": {
                $in: movies_ids,
              },
            },
          },
          {
            $addFields: {
              ratings_average: { $avg: ratings_filters },
            },
          },
          {
            $sort: {
              ratings_average: -1,
            },
          },
        ];
        const data = await collectionData.aggregate(pipeline);
        const items = [];
        for await (const item of data) {
          items.push(item);
        }

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    } else if (ratings_filters_query) {
      try {
        // ratings_filters query info
        const ratings_filters = [
          { $divide: ["$allocine.critics_rating", 1] },
          { $divide: ["$allocine.users_rating", 1] },
          { $divide: ["$betaseries.users_rating", 1] },
          { $divide: ["$imdb.users_rating", 2] },
        ];

        const pipeline = [
          {
            $addFields: {
              ratings_average: { $avg: ratings_filters },
            },
          },
          {
            $sort: {
              ratings_average: -1,
            },
          },
        ];
        const data = await collectionData.aggregate(pipeline);
        const items = [];
        for await (const item of data) {
          items.push(item);
        }

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    } else if (is_active_query) {
      try {
        // is_active query info
        let is_active = is_active_query === "true";
        let is_active_querydb = { is_active: is_active };
        if (is_active_query !== "true" && is_active_query !== "false") {
          is_active_querydb = { $or: [{ is_active: true }, { is_active: false }] };
        }

        const data = await collectionData.find(is_active_querydb).toArray();

        res.status(200).json(data);
      } catch (error) {
        res.status(400).send(error);
      }
    } else {
      try {
        await client.connect();

        const query = {};
        const data = await collectionData.find(query).toArray();

        res.status(200).json(data);
      } catch (error) {
        res.status(400).send(error);
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
});

/* A route that is used to get a specific movie by its ID. */
app.get("/movie/:id", async (req, res) => {
  try {
    const ratings_filters_query = req.query.ratings_filters;
    const id = parseInt(req.params.id);
    if (ratings_filters_query) {
      try {
        // ratings_filters query info
        const ratings_filters_array = ratings_filters_query.split(",");
        let ratings_filters = [];
        if (ratings_filters_array.includes("all")) {
          ratings_filters = [
            { $divide: ["$allocine.critics_rating", 1] },
            { $divide: ["$allocine.users_rating", 1] },
            { $divide: ["$betaseries.users_rating", 1] },
            { $divide: ["$imdb.users_rating", 2] },
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

        const pipeline = [
          {
            $match: { id: id },
          },
          {
            $addFields: {
              ratings_average: { $avg: ratings_filters },
            },
          },
          {
            $sort: {
              ratings_average: -1,
            },
          },
        ];
        const data = await collectionData.aggregate(pipeline);
        const items = [];
        for await (const item of data) {
          items.push(item);
        }

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    } else {
      try {
        await client.connect();

        const query = { id: id };
        const data = await collectionData.findOne(query);

        res.status(200).json(data);
      } catch (error) {
        res.status(400).send(error);
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
});

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

/* Starting the server on the port defined in the PORT variable. */
app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
