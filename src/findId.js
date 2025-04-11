const { MongoClient, ServerApiVersion } = require("mongodb");

const { buildProjection } = require("./utils/buildProjection");
const { config } = require("./config");
const { filterEpisodesBySeason } = require("./utils/filterEpisodesBySeason");

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
 * Optionally filters episodes by a given season.
 *
 * @param {Object} json - The JSON object to match keys against.
 * @param {String} append_to_response - Specifies additional fields to include in the projection.
 * @param {Number} filtered_season - If provided, filters episodes to only include this season number.
 * @returns {Object} An object containing filtered `results` and `total_results`.
 */
const findId = async (json, append_to_response, filtered_season) => {
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
  let [results, total_results] = await Promise.all([
    collectionData.find(query, { projection }).toArray(),
    collectionData.countDocuments(query),
  ]);

  // Step 4: Filter by season if needed
  if (filtered_season) {
    results = await filterEpisodesBySeason(results, filtered_season);
    total_results = results.length;
  }

  return { results, total_results };
};

module.exports = findId;
