require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("./config");

const uri = `mongodb+srv://${process.env.CREDENTIALS}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

/* Connecting to the database */
const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

/**
 * Receives a JSON object as input and returns a list of items from the database that match the input.
 * The keys of the input JSON are matched with a predetermined key mapping.
 * If a key is found in the input JSON, it is used to form a query which is then executed against the MongoDB collection.
 *
 * @param {Object} json - The JSON object that contains the data to search for. Valid keys include 'title', 'allocineid',
 * 'betaseriesid', 'imdbid', 'metacriticid', 'rottentomatoesid', 'letterboxdid', 'senscritiqueid', 'traktid', 'tmdbid'.
 * @returns {Object} An object containing two properties: 'results' which is an array of matching documents from the database,
 *  and 'total_results', which is the total count of matching documents.
 */
const findId = async (json) => {
  const keysMapping = {
    allocineid: "allocine.id",
    betaseriesid: "betaseries.id",
    imdbid: "imdb.id",
    letterboxdid: "letterboxd.id",
    metacriticid: "metacritic.id",
    rottentomatoesid: "rottentomatoes.id",
    senscritiqueid: "senscritique.id",
    traktid: "trakt.id",
    tmdbid: "id",
    title: null,
  };

  let query = {};
  for (let key in keysMapping) {
    if (json.hasOwnProperty(key)) {
      const mappedKey = keysMapping[key];
      query[mappedKey != null ? mappedKey : key] = ["title"].includes(key) ? { $regex: json[key], $options: "i" } : ["allocineid", "tmdbid"].includes(key) ? parseInt(json[key]) : json[key];
      break;
    }
  }

  const [results, total_results] = await Promise.all([collectionData.find(query).toArray(), collectionData.countDocuments(query)]);

  return { results: results, total_results: total_results };
};

module.exports = findId;
