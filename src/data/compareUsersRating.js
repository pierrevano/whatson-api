const axios = require("axios");

const { config } = require("../config");
const { getAllocineInfo } = require("../content/getAllocineInfo");
const { getAllocinePopularity } = require("../content/getAllocinePopularity");
const { getEpisodesDetails } = require("../content/getEpisodesDetails");
const { getHighestRatedEpisode } = require("../content/getHighestRatedEpisode");
const { getImdbPopularity } = require("../content/getImdbPopularity");
const { getImdbRating } = require("../content/getImdbRating");
const { getLastEpisode } = require("../content/getLastEpisode");
const { getLowestRatedEpisode } = require("../content/getLowestRatedEpisode");
const { getNextEpisode } = require("../content/getNextEpisode");
const { getObjectByImdbId } = require("../content/getMojoBoxOffice");
const { getWhatsonResponse } = require("../utils/getWhatsonResponse");
const { logErrors } = require("../utils/logErrors");

// Helper function to determine if the show has ended
async function hasTvShowEnded(status, imdbId) {
  if (status !== "Ended") {
    return false; // The show is not marked as ended
  }

  const whatsonResponse = await getWhatsonResponse(imdbId);
  const lastWhatsOnEpisode = whatsonResponse?.episodes_details?.slice(-1)[0];

  if (!lastWhatsOnEpisode?.release_date) {
    return false; // No release date info, assume not ended
  }

  return formatDate(lastWhatsOnEpisode.release_date) < formatDate(new Date());
}

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
        false,
      );
    const { usersRating: imdb_users_rating } =
      await getImdbRating(imdbHomepage);

    const tvShowEnded = await hasTvShowEnded(status, imdbId);
    let episodesDetails,
      lastEpisode,
      nextEpisode,
      highestEpisode,
      lowestEpisode;
    if (!tvShowEnded) {
      episodesDetails = await getEpisodesDetails(
        allocineHomepage,
        betaseriesHomepage,
        imdbHomepage,
        imdbId,
        tmdbId,
      );
      lastEpisode = await getLastEpisode(
        allocineHomepage,
        episodesDetails,
        tmdbId,
      );
      nextEpisode = await getNextEpisode(
        allocineHomepage,
        betaseriesHomepage,
        episodesDetails,
        lastEpisode,
        tmdbId,
      );
      highestEpisode = await getHighestRatedEpisode(
        allocineHomepage,
        episodesDetails,
      );
      lowestEpisode = await getLowestRatedEpisode(
        allocineHomepage,
        episodesDetails,
      );
    }

    const allocinePopularity =
      (await getAllocinePopularity(allocineURL, item_type))?.popularity ?? null;
    const imdbPopularity =
      (await getImdbPopularity(imdbHomepage, allocineURL, item_type))
        ?.popularity ?? null;

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

      if (!tvShowEnded) {
        dataWithoutId.episodes_details = episodesDetails;
        dataWithoutId.last_episode = lastEpisode;
        dataWithoutId.next_episode = nextEpisode;
        dataWithoutId.highest_episode = highestEpisode;
        dataWithoutId.lowest_episode = lowestEpisode;
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
