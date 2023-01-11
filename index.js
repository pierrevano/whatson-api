/* This is importing the express module and creating an express app. */
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();
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
    const is_active_query = req.query.is_active;
    const ratings_filters_query = req.query.ratings_filters;
    if (is_active_query && ratings_filters_query) {
      try {
        // is_active query info
        let is_active = is_active_query === "true";
        let is_active_match = { "results.is_active": is_active };
        if (is_active_query !== "true" && is_active_query !== "false") {
          is_active_match = { $or: [{ "results.is_active": true }, { "results.is_active": false }] };
        }

        // ratings_filters query info
        const ratings_filters_array = ratings_filters_query.split(",");
        let ratings_filters = [];
        if (ratings_filters_array.includes("all")) {
          ratings_filters = [
            { $divide: ["$results.allocine.critics_rating", 1] },
            { $divide: ["$results.allocine.users_rating", 1] },
            { $divide: ["$results.betaseries.users_rating", 1] },
            { $divide: ["$results.imdb.users_rating", 2] },
          ];
        } else {
          if (ratings_filters_array.includes("allocine_critics")) {
            ratings_filters.push({ $divide: ["$results.allocine.critics_rating", 1] });
          }

          if (ratings_filters_array.includes("allocine_users")) {
            ratings_filters.push({ $divide: ["$results.allocine.users_rating", 1] });
          }

          if (ratings_filters_array.includes("betaseries_users")) {
            ratings_filters.push({ $divide: ["$results.betaseries.users_rating", 1] });
          }

          if (ratings_filters_array.includes("imdb_users")) {
            ratings_filters.push({ $divide: ["$results.imdb.users_rating", 2] });
          }
        }

        const pipeline = [
          {
            $match: is_active_match,
          },
          {
            $addFields: {
              "results.avg_rating": { $avg: ratings_filters },
            },
          },
          {
            $sort: {
              "results.avg_rating": -1,
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
        let is_active_querydb = { "results.is_active": is_active };
        if (is_active_query !== "true" && is_active_query !== "false") {
          is_active_querydb = { $or: [{ "results.is_active": true }, { "results.is_active": false }] };
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

app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
