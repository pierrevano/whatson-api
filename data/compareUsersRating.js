const axios = require("axios");

const { config } = require("../src/config");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getAllocinePopularity } = require("../src/getAllocinePopularity");
const { getImdbPopularity } = require("../src/getImdbPopularity");

/**
 * Compares the users rating of a movie or TV show from Allocine with the rating
 * fetched from a remote API.
 * @param {string} allocineHomepage - The Allocine homepage URL.
 * @param {string} allocineURL - The Allocine URL specific to the item.
 * @param {string} betaseriesHomepage - The Betaseries homepage URL.
 * @param {string} imdbHomepage - The IMDB homepage URL.
 * @param {boolean} isActive - Active status of the item.
 * @param {string} item_type - The type of item (movie or TV show).
 * @param {string} theMoviedbId - The ID of the movie or TV show on The Movie Database.
 * @returns {Promise<Object>} - An object containing the comparison result and the fetched data.
 * @throws {Error} - If the API request fails.
 */
const compareUsersRating = async (allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, isActive, item_type, theMoviedbId) => {
  const users_rating = (await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId)).allocineUsersRating;
  const allocinePopularity = (await getAllocinePopularity(allocineURL)).popularity;
  const imdbPopularity = (await getImdbPopularity(imdbHomepage)).popularity;

  const isEqualObj = {
    isEqual: false,
  };

  console.log(`users_rating fetched remotely: ${users_rating}`);

  const item_type_api = item_type === "movie" ? "movie" : "tv";
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${theMoviedbId}`;

  try {
    const response = await axios.get(apiUrl);

    if (response.status !== 200) {
      return isEqualObj;
    }

    if (response && response.data) {
      const { _id, ...dataWithoutId } = response.data;
      dataWithoutId.is_active = isActive;
      dataWithoutId.allocine.popularity = allocinePopularity;
      dataWithoutId.imdb.popularity = imdbPopularity;

      console.log(`users_rating fetched from the db: ${dataWithoutId.allocine.users_rating}`);
      console.log(`imdb_rating fetched from the db: ${dataWithoutId.imdb.users_rating}`);

      if (dataWithoutId.allocine.users_rating !== null && dataWithoutId.imdb.users_rating === null) {
        return isEqualObj;
      }

      if (dataWithoutId.allocine.users_rating === users_rating) {
        return {
          isEqual: true,
          data: dataWithoutId,
        };
      } else {
        console.log("The users_rating values are not equal.");
        return isEqualObj;
      }
    } else {
      return isEqualObj;
    }
  } catch (error) {
    throw new Error(`Error fetching data: ${error.message}`);
  }
};

module.exports = compareUsersRating;
