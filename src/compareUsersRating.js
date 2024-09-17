const axios = require("axios");

const { config } = require("./config");
const { getAllocineInfo } = require("./content/getAllocineInfo");
const { getAllocinePopularity } = require("./content/getAllocinePopularity");
const { getImdbPopularity } = require("./content/getImdbPopularity");
const { getObjectByImdbId } = require("./content/getMojoBoxOffice");
const { logErrors } = require("./utils/logErrors");

/**
 * Compares the users rating of a movie or tvshow from AlloCiné with the rating
 * fetched from the What's on? API.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL.
 * @param {string} allocineURL - The AlloCiné URL specific to the item.
 * @param {string} betaseriesHomepage - The BetaSeries homepage URL.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {string} imdbId - The IMDb ID of the item.
 * @param {boolean} isActive - Active status of the item.
 * @param {string} item_type - The type of item (movie or tvshow).
 * @param {Array<Object>} mojoBoxOfficeArray - Array of Mojo box office objects.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @param {boolean} compare - A flag to determine if comparison is required.
 * @returns {Promise<Object>} - An object containing the comparison result and the fetched data.
 * @throws {Error} - If the API request fails.
 */
const compareUsersRating = async (
  allocineHomepage,
  allocineURL,
  betaseriesHomepage,
  imdbHomepage,
  imdbId,
  isActive,
  item_type,
  mojoBoxOfficeArray,
  tmdbId,
  compare,
) => {
  const isEqualObj = { isEqual: false };

  const item_type_api = item_type === "movie" ? "movie" : "tvshow";
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${tmdbId}?api_key=${process.env.INTERNAL_API_KEY}`;

  try {
    const users_rating = (
      await getAllocineInfo(
        allocineHomepage,
        betaseriesHomepage,
        tmdbId,
        compare,
      )
    ).allocineUsersRating;

    const allocinePopularity = (
      await getAllocinePopularity(allocineURL, item_type)
    ).popularity;

    const imdbPopularity = (
      await getImdbPopularity(imdbHomepage, allocineURL, item_type)
    ).popularity;

    const mojoValues = await getObjectByImdbId(
      mojoBoxOfficeArray,
      imdbId,
      item_type,
    );

    const response = await axios.get(apiUrl);

    if (response.status !== 200) {
      if (response.status > 500) {
        console.error(
          `Failed to fetch What's on? API data: status code ${response.status}`,
        );
        process.exit(1);
      }
      return isEqualObj;
    }

    const mojoObj =
      mojoValues !== null
        ? {
            rank: mojoValues.rank,
            url: mojoValues.url,
            lifetime_gross: mojoValues.lifetimeGross,
          }
        : null;

    if (response && response.data) {
      const { _id, ...dataWithoutId } = response.data;

      dataWithoutId.is_active = isActive;
      dataWithoutId.allocine.popularity = allocinePopularity;
      dataWithoutId.imdb.popularity = imdbPopularity;
      dataWithoutId.mojo = mojoObj;

      if (
        dataWithoutId.allocine.users_rating !== null &&
        dataWithoutId.imdb.users_rating === null
      ) {
        return isEqualObj;
      }

      if (dataWithoutId.allocine.users_rating === users_rating) {
        return {
          isEqual: true,
          data: dataWithoutId,
        };
      }
    }

    return isEqualObj;
  } catch (error) {
    logErrors(error, apiUrl, "compareUsersRating");

    return isEqualObj;
  }
};

module.exports = compareUsersRating;
