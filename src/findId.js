const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("./config");
const { buildProjection } = require("./utils/buildProjection");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

/**
 * Receives a JSON object as input and returns a list of items from the database that match the input.
 * The keys of the input JSON are matched with a predetermined key mapping.
 * If a key is found in the input JSON, it is used to form a query which is then executed against the MongoDB collection.
 *
 * @param {Object} json - The JSON object that contains the data to search for. Valid keys include 'title', 'allocineid',
 * 'betaseriesid', 'imdbid', 'letterboxdid', 'metacriticid', 'rottentomatoesid', 'senscritiqueid', 'thetvdbid', 'tmdbid', 'traktid', 'tvtimeid'.
 * @returns {Object} An object containing two properties: 'results' which is an array of matching documents from the database,
 *  and 'total_results', which is the total count of matching documents.
 */
const findId = async (json, append_to_response) => {
  const keysMapping = {
    allocineid: "allocine.id",
    betaseriesid: "betaseries.id",
    imdbid: "imdb.id",
    letterboxdid: "letterboxd.id",
    metacriticid: "metacritic.id",
    rottentomatoesid: "rotten_tomatoes.id",
    senscritiqueid: "senscritique.id",
    title: null,
    tmdbid: "id",
    traktid: "trakt.id",
    tvtimeid: "tv_time.id",
    thetvdbid: "thetvdb.id",
  };

  // Step 1: Build the query object
  let query = {};
  for (let key in keysMapping) {
    if (json.hasOwnProperty(key)) {
      const mappedKey = keysMapping[key];
      query[mappedKey != null ? mappedKey : key] = ["title"].includes(key)
        ? { $regex: json[key], $options: "i" }
        : [
              "allocineid",
              "senscritiqueid",
              "thetvdbid",
              "tmdbid",
              "tvtimeid",
            ].includes(key)
          ? parseInt(json[key])
          : json[key];
      break;
    }
  }

  // Step 2: Build the projection object
  const projection = buildProjection(append_to_response);

  // Step 3: Execute query with projection
  const [results, total_results] = await Promise.all([
    collectionData.find(query, { projection }).toArray(),
    collectionData.countDocuments(query),
  ]);

  return { results, total_results };
};

module.exports = findId;
