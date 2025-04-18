const axios = require("axios");

const { config } = require("./config");
const { getAllocineInfo } = require("./content/getAllocineInfo");
const { getAllocinePopularity } = require("./content/getAllocinePopularity");
const { getEpisodesDetails } = require("./content/getEpisodesDetails");
const { getImdbPopularity } = require("./content/getImdbPopularity");
const { getImdbRating } = require("./content/getImdbRating");
const { getLastEpisode } = require("./content/getLastEpisode");
const { getNextEpisode } = require("./content/getNextEpisode");
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
  const apiUrl = `${config.baseURLRemote}/${item_type_api}/${tmdbId}?append_to_response=${config.appendToResponse}&api_key=${config.internalApiKey}`;

  try {
    const { allocineUsersRating: allocine_users_rating, status } =
      await getAllocineInfo(
        allocineHomepage,
        betaseriesHomepage,
        tmdbId,
        compare,
      );
    const imdb_users_rating = await getImdbRating(imdbHomepage);

    const isTvshowNotEnded = status && status !== "Ended";
    let episodesDetails, lastEpisode, nextEpisode;
    if (isTvshowNotEnded) {
      episodesDetails = await getEpisodesDetails(
        allocineHomepage,
        imdbHomepage,
        imdbId,
      );
      lastEpisode = await getLastEpisode(
        allocineHomepage,
        episodesDetails,
        tmdbId,
      );
      nextEpisode = await getNextEpisode(
        allocineHomepage,
        episodesDetails,
        imdbId,
        tmdbId,
      );
    }

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

      if (isTvshowNotEnded) {
        dataWithoutId.episodes_details = episodesDetails;
        dataWithoutId.last_episode = lastEpisode;
        dataWithoutId.next_episode = nextEpisode;
      }

      dataWithoutId.allocine.popularity = allocinePopularity;
      dataWithoutId.imdb.popularity = imdbPopularity;
      dataWithoutId.mojo = mojoObj;

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      if (
        (dataWithoutId.allocine.users_rating !== null &&
          dataWithoutId.imdb.users_rating === null) ||
        new Date(dataWithoutId.updated_at) <= lastMonth
      ) {
        return isEqualObj;
      }

      if (
        dataWithoutId.allocine.users_rating === allocine_users_rating &&
        dataWithoutId.imdb.users_rating === imdb_users_rating
      ) {
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
