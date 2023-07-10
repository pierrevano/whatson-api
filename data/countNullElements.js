/**
 * Counts the number of null elements in various fields of a collection and checks if the percentage of null values exceeds a certain threshold.
 * @param {Object} collectionData - The collection to search for null values.
 * @returns None
 */
const countNullElements = async (collectionData, newOrUpdatedItems) => {
  try {
    console.log(`Number of new or updated items: ${newOrUpdatedItems}`);

    /* Counting the number of documents in the collection. */
    const documents = await collectionData.estimatedDocumentCount();
    console.log(`Number of documents in the collection: ${documents}`);

    /* The above code is counting the number of null values for the allocine.users_rating field. */
    const query_allocine = { "allocine.users_rating": null };
    const countAllocineNull = await collectionData.countDocuments(query_allocine);
    console.log(`Number of null for allocine.users_rating: ${countAllocineNull}`);

    if ((countAllocineNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of Allociné ratings are set to null");
      process.exit(1);
    }

    const query_allocine_critics = { "allocine.critics_rating": null };
    const countAllocineCriticsNull = await collectionData.countDocuments(query_allocine_critics);
    console.log(`Number of null for allocine.critics_rating: ${countAllocineCriticsNull}`);

    if ((countAllocineCriticsNull * 100) / documents > 80) {
      console.log("Something went wrong, at least 80% of Allociné critics ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of null values for the betaseries.users_rating field. */
    const query_betaseries = { "betaseries.users_rating": null };
    const countBetaseriesNull = await collectionData.countDocuments(query_betaseries);
    console.log(`Number of null for betaseries.users_rating: ${countBetaseriesNull}`);

    if ((countBetaseriesNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of Betaseries ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of documents in the collection that have a null value
      for the imdb.users_rating field. */
    const query_imdb = { "imdb.users_rating": null };
    const countIMDbNull = await collectionData.countDocuments(query_imdb);
    console.log(`Number of null for imdb.users_rating: ${countIMDbNull}`);

    if ((countIMDbNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of IMDb ratings are set to null");
      process.exit(1);
    }

    const query_metacritic = { metacritic: null };
    const countMetacriticNull = await collectionData.countDocuments(query_metacritic);
    console.log(`Number of null for metacritic: ${countMetacriticNull}`);

    if ((countMetacriticNull * 100) / documents > 70) {
      console.log("Something went wrong, at least 70% of Metacritic ratings are set to null");
      process.exit(1);
    }
  } catch (error) {
    console.log(`countNullElements: ${error}`);
  }
};

module.exports = { countNullElements };
