const maximum_threshold = {
  default: 30,
  metacritic_or_rotten_tomatoes: 95,
  allocine_critics: 80,
};

/**
 * Verifies that the number of null results for a specific rate source in a collection doesn't exceed a specified threshold.
 * If the percentage of null values is higher than the threshold, an error is thrown.
 *
 * @param {Object} query - The MongoDB query to execute.
 * @param {String} rateSource - The rate source to find null values for.
 * @param {String} thresholdKey - The key to retrieve the threshold from the 'maximum_threshold' object.
 * @returns {void}
 * @throws {Error} if the percentage of null results is higher than the threshold.
 */
const checkDocumentThreshold = async (collectionData, documents, query, rateSource, thresholdKey) => {
  const countNull = await collectionData.countDocuments(query);
  console.log(`Number of null for ${rateSource}: ${countNull}`);

  if ((countNull * 100) / documents > maximum_threshold[thresholdKey]) {
    throw new Error(`Something went wrong, at least ${maximum_threshold[thresholdKey]}% of ${rateSource} ratings are set to null`);
  }
};

/**
 * Counts the number of null elements in various fields of a collection and checks if the percentage of null values exceeds a certain threshold.
 * @param {Object} collectionData - The collection to search for null values.
 * @param {Number} newOrUpdatedItems - The number of new or updated items in the collection.
 * @returns {void}
 */
const countNullElements = async (collectionData, newOrUpdatedItems) => {
  try {
    console.log(`Number of new or updated items: ${newOrUpdatedItems}`);

    const documents = await collectionData.estimatedDocumentCount();
    console.log(`Number of documents in the collection: ${documents}`);

    const queriesAndThresholdKeys = [
      { query: { "allocine.users_rating": null }, rateSource: "allocine.users_rating", thresholdKey: "default" },
      { query: { "allocine.critics_rating": null }, rateSource: "allocine.critics_rating", thresholdKey: "allocine_critics" },
      { query: { "betaseries.users_rating": null }, rateSource: "betaseries.users_rating", thresholdKey: "default" },
      { query: { "imdb.users_rating": null }, rateSource: "imdb.users_rating", thresholdKey: "default" },
      { query: { metacritic: null }, rateSource: "metacritic", thresholdKey: "metacritic_or_rotten_tomatoes" },
      { query: { rotten_tomatoes: null }, rateSource: "rotten_tomatoes", thresholdKey: "metacritic_or_rotten_tomatoes" },
    ];

    await Promise.all(
      queriesAndThresholdKeys.map(({ query, rateSource, thresholdKey }) => {
        return checkDocumentThreshold(collectionData, documents, query, rateSource, thresholdKey);
      })
    );
  } catch (error) {
    throw new Error(`countNullElements: ${error}`);
  }
};

module.exports = { countNullElements };
