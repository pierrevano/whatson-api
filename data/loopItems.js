const { b64Encode } = require("../src/utils/b64EncodeAndDecode");
const { controlData } = require("./controlData");
const { upsertToDatabase } = require("./upsertToDatabase");
const compareUsersRating = require("./compareUsersRating");
const createJSON = require("./createJSON");
const generateURLs = require("./generateURLs");

/**
 * Loop through items and perform various operations.
 *
 * @param {Object} collectionData - The MongoDB collection data.
 * @param {Object} config - Configuration object.
 * @param {number} index_to_start - The starting index for looping.
 * @param {string} item_type - Type of the item (e.g. movie, series).
 * @param {Array} jsonArray - Array of JSON objects to loop through.
 * @param {boolean} skip_already_added_documents - Whether to skip over documents that have already been added to the database.
 */
const loopItems = async (collectionData, config, index_to_start, item_type, jsonArray, skip_already_added_documents) => {
  // Loop through jsonArray with the given start index
  for (let index = index_to_start; index < jsonArray.length; index++) {
    const json = jsonArray[index];

    // Log the progress in terms of percentage
    console.timeLog("Duration", `- ${parseInt(index) + 1} / ${jsonArray.length} (${(((parseInt(index) + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

    // Generate URLs based on the current JSON item
    const urls = generateURLs(item_type, config, json);

    /* Handle AlloCiné related data */
    const allocineId = urls.allocine.id;
    const allocineURL = urls.allocine.firstPartUrl;
    const completeAllocineURL = urls.allocine.url;
    const allocineHomepage = urls.allocine.homepage;
    const allocineCriticsDetails = urls.allocine.allocineCriticsDetails;

    // If set to skip already added documents
    if (skip_already_added_documents) {
      // Check if the document exists in the database
      const allocineQuery = { _id: b64Encode(completeAllocineURL) };
      const isDocumentExisting = await collectionData.find(allocineQuery).toArray();
      const isDocumentHasInfo = isDocumentExisting.length > 0;
      const document = isDocumentExisting[0];

      await controlData(completeAllocineURL, config.keysToCheck, isDocumentHasInfo, document);

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
    const theMoviedbId = parseInt(urls.themoviedb.id);

    // Determine if user ratings are equal and fetch the data
    const getIsEqualValue = await compareUsersRating(allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, isActive, item_type, theMoviedbId);
    const data = getIsEqualValue.isEqual
      ? getIsEqualValue.data
      : await createJSON(
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
          theMoviedbId
        );

    // Perform upsert operation on the database with the fetched data
    await upsertToDatabase(data, collectionData);
  }
};

module.exports = loopItems;
