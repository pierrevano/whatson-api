const axios = require("axios");

const { b64Encode } = require("../src/utils/b64EncodeAndDecode");
// const { controlData } = require("./controlData");
const { upsertToDatabase } = require("./upsertToDatabase");
const compareUsersRating = require("./compareUsersRating");
const createJSON = require("./createJSON");
const generateURLs = require("./generateURLs");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getNodeVarsValues } = require("../src/getNodeVarsValues");

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
 * @param {string} check_data - Flag indicating whether we check the data or not.
 * @returns {Object} Returns an object containing the number of new or updated items.
 */
const loopItems = async (collectionData, config, force, index_to_start, item_type, jsonArray, mojoBoxOfficeArray, check_data) => {
  let createJsonCounter = (itemCounter = 0);

  // Loop through jsonArray with the given start index
  for (let index = index_to_start; index < jsonArray.length; index++) {
    try {
      const json = jsonArray[index];

      // Log the progress in terms of percentage
      console.timeLog("Duration", `- ${parseInt(index) + 1} / ${jsonArray.length} (${(((parseInt(index) + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

      // Generate URLs based on the current JSON item
      const urls = generateURLs(item_type, config, json);

      /* Handle AlloCiné related data */
      const allocineId = urls.allocine.id;
      const allocineURL = urls.allocine.lastPartUrl;
      const allocineHomepage = urls.allocine.homepage;
      const allocineCriticsDetails = urls.allocine.criticsDetails;

      if (check_data === "check_data") {
        // await controlData(allocineHomepage, config.keysToCheck, isDocumentHasInfo, isDocumentExisting[0], item_type);
      }

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

      /* Handle Trakt related data */
      const traktId = urls.trakt.id;
      const traktHomepage = urls.trakt.homepage;

      // Determine if the URL is active
      const isActive = urls.is_active;

      // Get The Movie Database ID
      const theMoviedbId = urls.themoviedb.id;

      const checkDate = getNodeVarsValues.check_date;
      if (parseInt(checkDate) >= 0) {
        const item_type_api = item_type === "movie" ? "movie" : "tv";
        const apiUrl = `${config.baseURLRemote}/${item_type_api}/${theMoviedbId}`;

        try {
          const response = await axios.get(apiUrl);

          if (response && response.data && response.data.updated_at) {
            const { updated_at } = response.data;
            const updatedAtDate = new Date(updated_at);
            const dateValue = new Date();
            dateValue.setDate(dateValue.getDate() - parseInt(checkDate));

            if (updatedAtDate >= dateValue) {
              console.log(`Skipping because updated less than ${parseInt(checkDate)} days ago.`);

              continue;
            }
          }
        } catch (error) {
          throw new Error(`Error fetching data: ${error}`);
        }
      }

      if (getNodeVarsValues.check_id) {
        if (imdbId !== getNodeVarsValues.check_id) continue;
      }

      // Check if page is existing before upsert to DB
      const { error } = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId, true);

      // Determine if user ratings are equal and fetch the data
      if (!error) {
        const getIsEqualValue = await compareUsersRating(allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, imdbId, isActive, item_type, mojoBoxOfficeArray, theMoviedbId, true);
        const data =
          !force && getIsEqualValue.isEqual
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
                theMoviedbId
              ));

        // Adding item last `updated_at` date
        data.updated_at = new Date().toISOString();

        // Perform upsert operation on the database with the fetched data
        await upsertToDatabase(data, collectionData, getIsEqualValue.isEqual);

        itemCounter++;

        if (itemCounter === config.circleLimitPerInstance && getNodeVarsValues.environment === "no_local") {
          process.exit(0);
        }
      } else {
        console.error(error);
      }
    } catch (error) {
      throw new Error(`Error processing item at index ${index}: ${error.message}`);
    }
  }

  return {
    newOrUpdatedItems: createJsonCounter,
  };
};

module.exports = loopItems;
