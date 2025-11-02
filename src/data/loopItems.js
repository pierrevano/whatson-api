const { appendFile } = require("fs");
const axios = require("axios");

const { areAllNullOrUndefined } = require("../utils/areAllNullOrUndefined");
const { getAllocineInfo } = require("../content/getAllocineInfo");
const { getMetacriticRating } = require("../content/getMetacriticRating");
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

      /* Handle AlloCiné related data */
      const allocineId = urls.allocine.id;
      const allocineURL = urls.allocine.lastPartUrl;
      const allocineHomepage = urls.allocine.homepage;
      const allocineCriticsDetails = urls.allocine.criticsDetails;

      /* Handle IMDb related data */
      const imdbId = urls.imdb.id;
      const imdbHomepage = urls.imdb.homepage;

      /* Handle BetaSeries related data */
      const betaseriesId = urls.betaseries.id;
      const betaseriesHomepage = urls.betaseries.homepage;

      /* Handle Metacritic related data */
      const metacriticId = urls.metacritic.id;
      const metacriticHomepage = urls.metacritic.homepage;

      /* Handle Rotten Tomatoes related data */
      const rottenTomatoesId = urls.rotten_tomatoes.id;
      const rottenTomatoesHomepage = urls.rotten_tomatoes.homepage;

      /* Handle Letterboxd related data */
      const letterboxdId = urls.letterboxd.id;
      const letterboxdHomepage = urls.letterboxd.homepage;

      /* Handle SensCritique related data */
      const sensCritiqueId = urls.senscritique.id;
      const sensCritiqueHomepage = urls.senscritique.homepage;

      /* Handle TMDB related data */
      const tmdbId = urls.tmdb.id;
      const tmdbHomepage = urls.tmdb.homepage;

      /* Handle Trakt related data */
      const traktId = urls.trakt.id;
      const traktHomepage = urls.trakt.homepage;

      /* Handle TV Time related data */
      const tvtimeId = urls.tv_time.id;
      const tvtimeHomepage = urls.tv_time.homepage;

      /* Handle TheTVDB related data */
      const theTvdbId = urls.thetvdb.id;
      const theTvdbHomepage = urls.thetvdb.homepage;

      // Determine if the URL is active
      const isActive = urls.is_active;

      const checkDate = getNodeVarsValues.check_date;
      if (parseInt(checkDate) >= 0) {
        const item_type_api = item_type === "movie" ? "movie" : "tvshow";
        const apiCall = `${config.baseURLRemote}/${item_type_api}/${tmdbId}?api_key=${config.internalApiKey}`;

        try {
          const response = await axios.get(apiCall);

          if (response && response.data && response.data.updated_at) {
            const { updated_at } = response.data;
            const updatedAtDate = new Date(updated_at);
            const dateValue = new Date();
            dateValue.setDate(dateValue.getDate() - parseInt(checkDate));

            if (updatedAtDate >= dateValue) {
              console.log(
                `Skipping because updated less than ${parseInt(checkDate)} days ago.`,
              );

              continue;
            }
          }
        } catch (error) {
          const status = error.response.status;
          if (status === 404) {
            console.log(
              `Item called on ${apiCall} not found in database, continuing...`,
            );
          } else if (status === 503) {
            throw new Error(
              "Render service has been suspended. Please re-enable it.",
            );
          } else {
            throw new Error(`Error fetching data: ${error}`);
          }
        }
      }

      // Check if page is existing before upsert to DB
      const { error } = await getAllocineInfo(allocineHomepage, true);

      let errorMetacritic = false;
      try {
        const result = await getMetacriticRating(
          metacriticHomepage,
          metacriticId,
        );
        const metacriticError = result?.error;
        if (metacriticError && metacriticError.includes("403")) {
          console.log(metacriticError);
          errorMetacritic = true;
        }
      } catch (error) {}

      // Determine if user ratings are equal and fetch the data
      if (!error) {
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
          : false;
        if (!getIsEqualValue) getIsEqualValue.isEqual = false;
        const data =
          (!force && getIsEqualValue.isEqual) || errorMetacritic
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

        if (!errorMetacritic) {
          data.updated_at = new Date().toISOString();
        } else {
          console.log(
            `The 'updated_at' date was not modified because 'errorMetacritic' is: ${errorMetacritic}`,
          );
        }

        // Perform upsert operation on the database with the fetched data
        try {
          await upsertToDatabase(data, collectionData, getIsEqualValue.isEqual);
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
          console.log(
            "CircleCI limit per instance has been reached, aborting.",
          );
          process.exit(0);
        }
      } else {
        console.error(error);
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
