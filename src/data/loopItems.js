const { appendFile } = require("fs");

const { areAllNullOrUndefined } = require("../utils/areAllNullOrUndefined");
const { getAllocineInfo } = require("../content/getAllocineInfo");
const { getNodeVarsValues } = require("../utils/getNodeVarsValues");
const { upsertToDatabase } = require("./upsertToDatabase");
const compareUsersRating = require("./compareUsersRating");
const createJSON = require("./createJSON");
const generateURLs = require("./generateURLs");

/**
 * Loop through items in a collection, perform various operations on each item, and return an object containing the number of new or updated items.
 *
 * @param {Object} collectionData - The collection data object.
 * @param {Object} config - The configuration object.
 * @param {boolean} force - Flag indicating whether to force the operations.
 * @param {number} index_to_start - The index to start looping from.
 * @param {string} item_type - The type of item being looped.
 * @param {Array} jsonArray - The array of JSON objects to loop through.
 * @param {Array} mojoBoxOfficeArray - The array of Mojo Box Office data to be included in the operations.
 * @param {number|null} max_index - Optional index (1-based) at which to stop processing.
 * @returns {Promise<{ newOrUpdatedItems: number }>} Number of newly created or updated items.
 */
const loopItems = async (
  collectionData,
  config,
  force,
  index_to_start,
  item_type,
  jsonArray,
  mojoBoxOfficeArray,
  max_index,
) => {
  let createJsonCounter = 0;
  let itemCounter = 0;

  // Loop through jsonArray with the given start index
  for (let index = index_to_start; index < jsonArray.length; index++) {
    try {
      const { heapUsed, rss } = process.memoryUsage();
      const heapUsedInMB = heapUsed / 1024 / 1024;
      console.log(
        `Memory - heapUsed: ${heapUsedInMB.toFixed(2)} MB, rss: ${(rss / 1024 / 1024).toFixed(2)} MB`,
      );

      const maxHeapUsed =
        process.env.ENABLE_MAX_HEAP === "true"
          ? heapUsedInMB
          : config.heapLimit;
      if (max_index && index >= max_index && maxHeapUsed >= config.heapLimit) {
        console.log(`Maximum index ${max_index} processed, aborting.`);
        process.exit(0);
      }

      const json = jsonArray[index];

      // Log the progress in terms of percentage
      console.timeLog(
        "Duration",
        `- ${parseInt(index) + 1} / ${jsonArray.length} (${(((parseInt(index) + 1) * 100) / jsonArray.length).toFixed(1)}%)`,
      );

      // Generate URLs based on the current JSON item
      const urls = generateURLs(item_type, config, json);

      const {
        allocine: {
          id: allocineId,
          lastPartUrl: allocineURL,
          homepage: allocineHomepage,
          criticsDetails: allocineCriticsDetails,
        },
        betaseries: { id: betaseriesId, homepage: betaseriesHomepage },
        imdb: { id: imdbId, homepage: imdbHomepage },
        is_active: isActive,
        letterboxd: { id: letterboxdId, homepage: letterboxdHomepage },
        metacritic: { id: metacriticId, homepage: metacriticHomepage },
        rotten_tomatoes: {
          id: rottenTomatoesId,
          homepage: rottenTomatoesHomepage,
        },
        senscritique: { id: sensCritiqueId, homepage: sensCritiqueHomepage },
        thetvdb: { id: theTvdbId, homepage: theTvdbHomepage },
        tmdb: { id: tmdbId, homepage: tmdbHomepage },
        trakt: { id: traktId, homepage: traktHomepage },
        tv_time: { id: tvtimeId, homepage: tvtimeHomepage },
      } = urls;

      const getIsEqualValue = !force
        ? await compareUsersRating(
            allocineHomepage,
            allocineURL,
            imdbHomepage,
            imdbId,
            isActive,
            item_type,
            mojoBoxOfficeArray,
            tmdbId,
          )
        : { isEqual: false };

      const isEqual = getIsEqualValue.isEqual;

      const useExistingData = !force && isEqual;
      const data = useExistingData
        ? getIsEqualValue.data
        : (createJsonCounter++,
          await createJSON(
            allocineCriticsDetails,
            allocineURL,
            allocineHomepage,
            allocineId,
            betaseriesHomepage,
            betaseriesId,
            imdbHomepage,
            imdbId,
            isActive,
            item_type,
            metacriticHomepage,
            metacriticId,
            rottenTomatoesHomepage,
            rottenTomatoesId,
            letterboxdHomepage,
            letterboxdId,
            sensCritiqueHomepage,
            sensCritiqueId,
            traktHomepage,
            traktId,
            mojoBoxOfficeArray,
            tmdbId,
            tmdbHomepage,
            tvtimeHomepage,
            tvtimeId,
            theTvdbHomepage,
            theTvdbId,
          ));

      if (!useExistingData) {
        data.updated_at = new Date().toISOString();
      } else {
        console.log(
          `The 'updated_at' date was not modified because existing data was reused.`,
        );
      }

      // Perform upsert operation on the database with the fetched data
      try {
        await upsertToDatabase(data, collectionData, isEqual);
      } catch (error) {
        if (areAllNullOrUndefined(data, config.ratingsKeys)) {
          appendFile(
            "temp_error.log",
            `${new Date().toISOString()} - All ratings are null for the item at index ${index} - ${JSON.stringify(data)}\n`,
            () => {},
          );
        }

        console.log(
          `Item at index ${index} was not updated because AlloCiné is null.`,
        );
      }

      itemCounter++;

      if (
        itemCounter === config.circleLimitPerInstance &&
        getNodeVarsValues.environment === "circleci" &&
        !max_index
      ) {
        console.log("CircleCI limit per instance has been reached, aborting.");
        process.exit(0);
      }
    } catch (error) {
      throw new Error(
        `Error processing item at index ${index}: ${error.message}`,
      );
    }
  }

  return {
    newOrUpdatedItems: createJsonCounter,
  };
};

module.exports = loopItems;
