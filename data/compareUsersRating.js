const { config } = require("../src/config");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");

/**
 * Compares the users rating of a movie or TV show from Allocine with the rating
 * fetched from a remote API.
 * @param {string} allocineHomepage - The Allocine homepage URL.
 * @param {string} betaseriesHomepage - The Betaseries homepage URL.
 * @param {string} theMoviedbId - The ID of the movie or TV show on The Movie Database.
 * @param {string} item_type - The type of item (movie or TV show).
 * @returns {Promise<Object>} - An object containing the comparison result and the fetched data.
 * @throws {Error} - If the API request fails.
 */
const compareUsersRating = async (allocineHomepage, betaseriesHomepage, theMoviedbId, item_type) => {
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId);
  const users_rating = allocineFirstInfo.allocineUsersRating;

  console.log(`users_rating fetched remotely: ${users_rating}`);

  const item_type_api = item_type === "movie" ? "movie" : "tv";
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${theMoviedbId}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { _id, ...dataWithoutId } = await response.json();

    console.log(`users_rating fetched from the db: ${dataWithoutId.allocine.users_rating}`);

    if (dataWithoutId.allocine.users_rating === users_rating) {
      return {
        isEqual: true,
        data: dataWithoutId,
      };
    } else {
      console.log("The users_rating values are not equal.");
      return {
        isEqual: false,
      };
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

module.exports = compareUsersRating;
