const axios = require("axios");

const { config } = require("../src/config");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getAllocinePopularity } = require("../src/getAllocinePopularity");
const { getImdbPopularity } = require("../src/getImdbPopularity");

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
const compareUsersRating = async (allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, isActive, item_type, theMoviedbId) => {
  const users_rating = (await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId)).allocineUsersRating;
  const allocinePopularity = (await getAllocinePopularity(allocineURL)).popularity;
  const imdbPopularity = (await getImdbPopularity(imdbHomepage)).popularity;

  console.log(`users_rating fetched remotely: ${users_rating}`);

  const item_type_api = item_type === "movie" ? "movie" : "tv";
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${theMoviedbId}`;

  try {
    const response = await axios.get(apiUrl);

    if (response.status !== 200) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { _id, ...dataWithoutId } = response.data;
    dataWithoutId.is_active = isActive;
    dataWithoutId.allocine.popularity = allocinePopularity;
    dataWithoutId.imdb.popularity = imdbPopularity;

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
