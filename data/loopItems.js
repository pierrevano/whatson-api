const { b64Encode } = require("../src/utils/b64EncodeAndDecode");
const { controlData } = require("./controlData");
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
 * @param {string} skip_already_added_documents - Flag indicating whether to skip already added documents.
 * @returns {Object} Returns an object containing the number of new or updated items.
 */
const loopItems = async (collectionData, config, force, index_to_start, item_type, jsonArray, mojoBoxOfficeArray, skip_already_added_documents) => {
  let createJsonCounter = 0;

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

      // If set to skip already added documents
      if (skip_already_added_documents === "skip") {
        // Check if the document exists in the database
        const allocineQuery = { _id: b64Encode(allocineHomepage) };
        const isDocumentExisting = await collectionData.find(allocineQuery).toArray();
        const isDocumentHasInfo = isDocumentExisting.length > 0;
        const document = isDocumentExisting[0];

        await controlData(allocineHomepage, config.keysToCheck, isDocumentHasInfo, document, item_type);

        // If the document already exists, skip processing this item
        if (isDocumentHasInfo) continue;
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

      // Determine if the URL is active
      const isActive = urls.is_active;

      // Get The Movie Database ID
      const theMoviedbId = urls.themoviedb.id;

      // Determine if user ratings are equal and fetch the data
      const getIsEqualValue = await compareUsersRating(allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, imdbId, isActive, item_type, mojoBoxOfficeArray, theMoviedbId);
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
              mojoBoxOfficeArray,
              theMoviedbId
            ));

      // Perform upsert operation on the database with the fetched data
      await upsertToDatabase(data, collectionData, getIsEqualValue.isEqual);
    } catch (error) {
      throw new Error(`Error processing item at index ${index}: ${error.message}`);
    }
  }

  return {
    newOrUpdatedItems: createJsonCounter,
  };
};

module.exports = loopItems;
