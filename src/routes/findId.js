const { MongoClient, ServerApiVersion } = require("mongodb");

const { buildProjection } = require("./buildProjection");
const { config } = require("../config");
const { filterEpisodesBySeason } = require("./filterEpisodesBySeason");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

// Utility to normalize strings for fuzzy title matching
const normalizeString = (str) =>
  str
    .toLowerCase() // make all characters lowercase
    .replace(/\s+/g, " ") // collapse multiple spaces into one
    .trim(); // remove leading/trailing whitespace

/**
 * Queries the database for a media item matching the given identifier or title.
 * Supports optional projection and episode filtering by seasons.
 *
 * @param {Object} json - Input object with a supported key (e.g. `imdbid`, `tmdbid`, `title`, etc.).
 * @param {string} [append_to_response] - Additional fields to include in the projection.
 * @param {string} [filtered_seasons] - Seasons numbers to filter episodes by (if applicable).
 * @returns {Promise<{ results: Object[], total_results: number }>} Filtered results and total count.
 */
const findId = async (json, append_to_response, filtered_seasons) => {
  if (!json || typeof json !== "object" || Object.keys(json).length === 0) {
    throw new Error("Invalid or empty input object in finding a unique ID.");
  }

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

  for (const [key, mappedKeyRaw] of Object.entries(keysMapping)) {
    if (!(key in json)) continue;

    const value = json[key];
    const mappedKey = mappedKeyRaw ?? key;

    const isTitleKey = key === "title";
    const isTraktIdKey = key === "traktid";
    const isNumericIdKey = [
      "allocineid",
      "senscritiqueid",
      "thetvdbid",
      "tmdbid",
      "tvtimeid",
    ].includes(key);

    if (isTitleKey) {
      const normalizedInput = normalizeString(value);

      // Match both title and original_title
      query = {
        $expr: {
          $or: [
            {
              $regexMatch: {
                input: {
                  $replaceAll: {
                    input: { $toLower: "$title" },
                    find: ",",
                    replacement: "",
                  },
                },
                regex: normalizedInput,
              },
            },
            {
              $regexMatch: {
                input: {
                  $replaceAll: {
                    input: { $toLower: "$original_title" },
                    find: ",",
                    replacement: "",
                  },
                },
                regex: normalizedInput,
              },
            },
          ],
        },
      };
    } else if (isTraktIdKey) {
      const stringValue = typeof value === "string" ? value : String(value);
      const numericValue =
        typeof value === "number"
          ? value
          : /^[0-9]+$/.test(stringValue)
            ? parseInt(stringValue, 10)
            : null;

      query[mappedKey] =
        typeof numericValue === "number" && !Number.isNaN(numericValue)
          ? { $in: [stringValue, numericValue] }
          : stringValue;
    } else {
      query[mappedKey] = isNumericIdKey ? parseInt(value, 10) : value;
    }

    break; // exit after first match
  }

  // Step 2: Build the projection object
  const projection = buildProjection(append_to_response);

  // Step 3: Execute query with projection
  let [results, total_results] = await Promise.all([
    collectionData.find(query, { projection }).toArray(),
    collectionData.countDocuments(query),
  ]);

  // Step 4: Filter by seasons if needed
  if (filtered_seasons) {
    results = await filterEpisodesBySeason(results, filtered_seasons);
    total_results = results.length;
  }

  return { results, total_results };
};

module.exports = findId;
