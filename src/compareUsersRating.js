const axios = require("axios");

const { config } = require("./config");
const { getAllocineInfo } = require("./content/getAllocineInfo");
const { getAllocinePopularity } = require("./content/getAllocinePopularity");
const { getImdbPopularity } = require("./content/getImdbPopularity");
const { getImdbRating } = require("./content/getImdbRating");
const { getObjectByImdbId } = require("./content/getMojoBoxOffice");

/**
 * Compares the users rating of a movie or tvshow from AlloCiné with the rating
 * fetched from a remote API.
 * @param {string} allocineHomepage - The AlloCiné homepage URL.
 * @param {string} allocineURL - The AlloCiné URL specific to the item.
 * @param {string} betaseriesHomepage - The BetaSeries homepage URL.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {boolean} isActive - Active status of the item.
 * @param {string} item_type - The type of item (movie or tvshow).
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
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
  const users_rating = (
    await getAllocineInfo(allocineHomepage, betaseriesHomepage, tmdbId, compare)
  ).allocineUsersRating;
  const allocinePopularity = (
    await getAllocinePopularity(allocineURL, item_type)
  ).popularity;
  const imdb_users_rating = await getImdbRating(imdbHomepage);
  const imdbPopularity = (
    await getImdbPopularity(imdbHomepage, allocineURL, item_type)
  ).popularity;
  const mojoValues = await getObjectByImdbId(
    mojoBoxOfficeArray,
    imdbId,
    item_type,
  );

  const isEqualObj = {
    isEqual: false,
  };

  const item_type_api = item_type === "movie" ? "movie" : "tvshow";
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${tmdbId}`;

  try {
    const response = await axios.get(apiUrl);

    if (response.status !== 200) {
      if (response.status > 500) {
        console.error(`API: ${apiUrl} cannot be reached, aborting.`);
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

      if (
        dataWithoutId.allocine.users_rating === users_rating &&
        dataWithoutId.imdb.users_rating === imdb_users_rating
      ) {
        return {
          isEqual: true,
          data: dataWithoutId,
        };
      } else {
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
