/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

const { config } = require("./config");
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
 * It takes a JSON object as input, and returns a list of items from the database that match the input
 * @param json - the JSON object that contains the data to search for
 * @returns An array of items
 */
const findId = async (json) => {
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
};

module.exports = findId;
