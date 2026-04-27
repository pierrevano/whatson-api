const { config } = require("../config");
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
const { logErrors } = require("../utils/logErrors");

/**
 * Refreshes the fields that are always updated on the stored What's on? payload
 * and checks whether the item can be reused based on the current IMDb rating data.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL.
 * @param {string} allocineURL - The AlloCiné URL specific to the item.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {string} imdbId - The IMDb ID of the item.
 * @param {boolean} isActive - Active status of the item.
 * @param {string} item_type - The type of item (movie or tvshow).
 * @param {Array<Object>} mojoBoxOfficeArray - Array of Mojo box office objects.
 * @param {number} tmdbId - TMDB ID for the movie or tvshow.
 * @param {object|null} [imdbData] - IMDb data.
 * @returns {Promise<Object>} - An object indicating whether the item can be reused,
 *     and the refreshed payload when it can.
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
  imdbData,
) => {
  const isEqualObj = { isEqual: false };

  const item_type_api = item_type === "movie" ? "movie" : "tvshow";

  try {
    /**
     * Loads the external data used to compare the stored payload with the latest values.
     */
    const tmdbHomepage =
      item_type_api === "movie"
        ? `${config.baseURLTMDBFilm}${tmdbId}`
        : `${config.baseURLTMDBSerie}${tmdbId}`;
    const [imdbRatingData, tmdbResponse, whatsonResponse] = await Promise.all([
      getImdbRating(imdbHomepage, imdbData),
      tmdbId
        ? getTMDBResponse(allocineHomepage, tmdbId)
        : Promise.resolve(null),
      getWhatsonResponse(item_type_api, tmdbId, config.appendToResponse),
    ]);
    const tmdbData = tmdbResponse?.data;

    const { status: responseStatus, data: responseData } =
      whatsonResponse ?? {};

    if (responseStatus >= 500) {
      throw new Error(
        `Failed to fetch What's on? API data: status code ${responseStatus}`,
      );
    }

    if (responseStatus !== 200) {
      return isEqualObj;
    }

    if (!responseData) {
      return isEqualObj;
    }

    /**
     * Returns true when the stored IMDb rating and vote count match the latest fetched values.
     *
     * @param {Object} data - The stored What's on? payload (without _id).
     * @returns {boolean}
     */
    const imdbRatingsMatch = (data) =>
      data.imdb?.users_rating === imdbRatingData.usersRating &&
      data.imdb?.users_rating_count === imdbRatingData.usersRatingCount;

    const { _id, ...dataWithoutId } = responseData;

    dataWithoutId.is_active = isActive;

    /**
     * Refreshes popularity and box office fields, which are updated even when the item is reused.
     */
    const [
      allocinePopularityResult,
      imdbPopularityResult,
      tmdbPopularityResult,
      mojoValues,
    ] = await Promise.all([
      getAllocinePopularity(allocineURL, item_type),
      getImdbPopularity(imdbHomepage, allocineURL, item_type, imdbData),
      tmdbData
        ? getTmdbPopularity(tmdbHomepage, tmdbId, tmdbData)
        : Promise.resolve(null),
      getObjectByImdbId(mojoBoxOfficeArray, imdbId, item_type),
    ]);
    const allocinePopularity =
      typeof allocinePopularityResult?.popularity === "number"
        ? allocinePopularityResult.popularity
        : undefined;
    const imdbPopularity =
      typeof imdbPopularityResult?.popularity === "number"
        ? imdbPopularityResult.popularity
        : undefined;
    const tmdbPopularity =
      typeof tmdbPopularityResult?.popularity === "number"
        ? tmdbPopularityResult.popularity
        : undefined;

    const mojoObj =
      mojoValues !== null
        ? {
            rank: mojoValues.rank,
            url: mojoValues.url,
            lifetime_gross: mojoValues.lifetimeGross,
          }
        : null;

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

    const updatedAt = new Date(dataWithoutId.updated_at);
    const hasValidUpdatedAt = !Number.isNaN(updatedAt.getTime());
    const recentUpdateCutoffDate = new Date(
      Date.now() - config.recentUpdateHours * 60 * 60 * 1000,
    );
    const updatedAtCutoffDate = new Date();
    updatedAtCutoffDate.setDate(
      updatedAtCutoffDate.getDate() - config.maxAgeInDays,
    );

    /**
     * Stops when the stored payload has no usable update timestamp.
     */
    if (!hasValidUpdatedAt) {
      return isEqualObj;
    }

    /**
     * Reuses recently updated items before rebuilding TV show episode fields when
     * the stored IMDb rating and vote count still match the latest values.
     */
    if (updatedAt > recentUpdateCutoffDate && imdbRatingsMatch(dataWithoutId)) {
      return {
        isEqual: true,
        data: dataWithoutId,
      };
    }

    /**
     * Stops when the stored payload is older than the allowed reuse window.
     */
    if (updatedAt <= updatedAtCutoffDate) {
      return isEqualObj;
    }

    /**
     * Stops early when the stored IMDb ratings no longer match.
     */
    if (!imdbRatingsMatch(dataWithoutId)) {
      return isEqualObj;
    }

    /**
     * Rebuilds the TV show-specific fields that depend on episode data when TMDB data is available.
     */
    const isTvShow = item_type_api === "tvshow";
    const hasTvShowTmdbData = isTvShow && Boolean(tmdbData);
    let seasonsNumber,
      episodesDetails,
      lastEpisode,
      nextEpisode,
      highestEpisode,
      lowestEpisode;
    if (hasTvShowTmdbData) {
      const imdb_seasons_number = config.specialItems.includes(imdbId)
        ? imdbRatingData.seasonsNumber
        : null;
      const seasonsNumberPromise =
        imdb_seasons_number != null
          ? Promise.resolve(imdb_seasons_number)
          : getSeasonsNumber(allocineHomepage, tmdbData);
      episodesDetails = await getEpisodesDetails(
        allocineHomepage,
        imdbHomepage,
        imdbId,
        tmdbData,
      );
      [seasonsNumber, lastEpisode, highestEpisode, lowestEpisode] =
        await Promise.all([
          seasonsNumberPromise,
          getLastEpisode(allocineHomepage, episodesDetails, tmdbData),
          getHighestRatedEpisode(allocineHomepage, episodesDetails),
          getLowestRatedEpisode(allocineHomepage, episodesDetails),
        ]);
      nextEpisode = await getNextEpisode(
        allocineHomepage,
        episodesDetails,
        lastEpisode,
        tmdbData,
      );
    }

    /**
     * Merges the refreshed TV show fields into the stored payload before the final reuse check.
     */
    if (hasTvShowTmdbData) {
      dataWithoutId.seasons_number = seasonsNumber;
      dataWithoutId.episodes_details = episodesDetails;
      dataWithoutId.last_episode = lastEpisode;
      dataWithoutId.next_episode = nextEpisode;
      dataWithoutId.highest_episode = highestEpisode;
      dataWithoutId.lowest_episode = lowestEpisode;
    }

    /**
     * Reuses the payload if IMDb ratings still match after the full rebuild.
     * Unlike the fast path, updated_at is refreshed here because episode data was re-fetched.
     */
    if (imdbRatingsMatch(dataWithoutId)) {
      dataWithoutId.updated_at = new Date().toISOString();
      return {
        isEqual: true,
        data: dataWithoutId,
      };
    }

    return isEqualObj;
  } catch (error) {
    logErrors(error, tmdbId, "compareUsersRating");
  }
};

module.exports = compareUsersRating;
