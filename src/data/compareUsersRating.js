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
const { getSeasonsNumber } = require("../content/getSeasonsNumber");
const { getTmdbPopularity } = require("../content/getTmdbPopularity");
const { getTMDBResponse } = require("../utils/getTMDBResponse");
const { getWhatsonResponse } = require("../utils/getWhatsonResponse");
const {
  hasTvShowEnded,
  wasLastEpisodeReleasedRecently,
} = require("../utils/tvShowStatus");
const { logErrors } = require("../utils/logErrors");

/**
 * Compares the users rating of a movie or tvshow from AlloCiné with the rating
 * fetched from the What's on? API.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL.
 * @param {string} allocineURL - The AlloCiné URL specific to the item.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {string} imdbId - The IMDb ID of the item.
 * @param {boolean} isActive - Active status of the item.
 * @param {string} item_type - The type of item (movie or tvshow).
 * @param {Array<Object>} mojoBoxOfficeArray - Array of Mojo box office objects.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @returns {Promise<Object>} - An object containing the comparison result and the fetched data.
 * @throws {Error} - If the API request fails.
 */
const compareUsersRating = async (
  allocineHomepage,
  allocineURL,
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
    const tmdbHomepage =
      item_type_api === "movie"
        ? `${config.baseURLTMDBFilm}${tmdbId}`
        : `${config.baseURLTMDBSerie}${tmdbId}`;
    const tmdbResponse = tmdbId
      ? await getTMDBResponse(allocineHomepage, tmdbId)
      : null;
    const tmdbData = tmdbResponse?.data;

    const allocineInfo = await getAllocineInfo(allocineHomepage, false);
    if (!allocineInfo || allocineInfo.error) {
      return isEqualObj;
    }
    const { allocineUsersRating: allocine_users_rating, status } = allocineInfo;
    const { usersRating: imdb_users_rating } =
      await getImdbRating(imdbHomepage);

    const isTvShow = item_type_api === "tvshow";
    const whatsonLastEpisode = isTvShow
      ? ((await getWhatsonResponse(imdbId, "last_episode"))?.last_episode ??
        null)
      : null;
    const lastEpisodeReleasedRecently = isTvShow
      ? wasLastEpisodeReleasedRecently(whatsonLastEpisode)
      : false;
    const tvShowEnded = isTvShow
      ? hasTvShowEnded(status, whatsonLastEpisode)
      : false;
    let seasonsNumber,
      episodesDetails,
      lastEpisode,
      nextEpisode,
      highestEpisode,
      lowestEpisode;
    if (isTvShow && !tvShowEnded && !lastEpisodeReleasedRecently) {
      if (tmdbData) {
        seasonsNumber = await getSeasonsNumber(
          allocineHomepage,
          tmdbData,
          imdbId,
        );
        episodesDetails = await getEpisodesDetails(
          allocineHomepage,
          imdbHomepage,
          imdbId,
          tmdbData,
        );
        lastEpisode = await getLastEpisode(
          allocineHomepage,
          episodesDetails,
          tmdbData,
        );
        nextEpisode = await getNextEpisode(
          allocineHomepage,
          episodesDetails,
          lastEpisode,
          tmdbData,
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
    }

    const allocinePopularityResult = await getAllocinePopularity(
      allocineURL,
      item_type,
    );
    const allocinePopularity =
      typeof allocinePopularityResult?.popularity === "number"
        ? allocinePopularityResult.popularity
        : undefined;
    const imdbPopularityResult = await getImdbPopularity(
      imdbHomepage,
      allocineURL,
      item_type,
    );
    const imdbPopularity =
      typeof imdbPopularityResult?.popularity === "number"
        ? imdbPopularityResult.popularity
        : undefined;
    const tmdbPopularityResult =
      tmdbData && (await getTmdbPopularity(tmdbHomepage, tmdbId, tmdbData));
    const tmdbPopularity =
      typeof tmdbPopularityResult?.popularity === "number"
        ? tmdbPopularityResult.popularity
        : undefined;

    const mojoValues = await getObjectByImdbId(
      mojoBoxOfficeArray,
      imdbId,
      item_type,
    );

    const response = await axios.get(apiUrl, {
      validateStatus: () => true,
    });

    if (response.status >= 500) {
      throw new Error(
        `Failed to fetch What's on? API data: status code ${response.status}`,
      );
    }
    if (response.status !== 200) {
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

      if (isTvShow && !tvShowEnded && !lastEpisodeReleasedRecently) {
        dataWithoutId.seasons_number = seasonsNumber;
        dataWithoutId.episodes_details = episodesDetails;
        dataWithoutId.last_episode = lastEpisode;
        dataWithoutId.next_episode = nextEpisode;
        dataWithoutId.highest_episode = highestEpisode;
        dataWithoutId.lowest_episode = lowestEpisode;
      }

      if (dataWithoutId.allocine && typeof allocinePopularity === "number") {
        dataWithoutId.allocine.popularity = allocinePopularity;
      }

      if (dataWithoutId.imdb && typeof imdbPopularity === "number") {
        dataWithoutId.imdb.popularity = imdbPopularity;
      }

      if (dataWithoutId.tmdb && typeof tmdbPopularity === "number") {
        dataWithoutId.tmdb.popularity = tmdbPopularity;
      }

      dataWithoutId.mojo = mojoObj;

      const updatedAtCutoffDate = new Date();
      updatedAtCutoffDate.setDate(
        updatedAtCutoffDate.getDate() - config.maxAgeInDays,
      );

      if (
        (dataWithoutId.allocine?.users_rating !== null &&
          dataWithoutId.imdb?.users_rating === null) ||
        new Date(dataWithoutId.updated_at) <= updatedAtCutoffDate
      ) {
        return isEqualObj;
      }

      if (
        dataWithoutId.allocine?.users_rating === allocine_users_rating &&
        dataWithoutId.imdb?.users_rating === imdb_users_rating
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
