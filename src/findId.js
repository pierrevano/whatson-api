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
 * Queries the database for a media item matching the given identifier or title.
 * Supports optional projection and episode filtering by season.
 *
 * @param {Object} json - Input object with a supported key (e.g. `imdbid`, `tmdbid`, `title`, etc.).
 * @param {string} [append_to_response] - Additional fields to include in the projection.
 * @param {number} [filtered_season] - Season number to filter episodes by (if applicable).
 * @returns {Promise<{ results: Object[], total_results: number }>} Filtered results and total count.
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

  for (const key in keysMapping) {
    if (!json.hasOwnProperty(key)) continue;

    const mappedKey = keysMapping[key] ?? key;
    const value = json[key];

    const isTitleKey = key === "title";
    const isNumericIdKey = [
      "allocineid",
      "senscritiqueid",
      "thetvdbid",
      "tmdbid",
      "tvtimeid",
    ].includes(key);

    query[mappedKey] = isTitleKey
      ? { $regex: value, $options: "i" }
      : isNumericIdKey
        ? parseInt(value)
        : value;

    break; // exit after first match
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
