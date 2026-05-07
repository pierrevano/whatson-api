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
     * Returns true when the stored IMDb rating matches and the vote count is within the configured tolerance.
     *
     * @param {Object} data - The stored What's on? payload (without _id).
     * @returns {boolean}
     */
    const imdbRatingsMatch = (data) => {
      if (data.imdb?.users_rating !== imdbRatingData.usersRating) return false;
      const storedCount = data.imdb?.users_rating_count;
      const latestCount = imdbRatingData.usersRatingCount;
      const tolerance =
        latestCount * (config.imdbRatingCountTolerancePct / 100);
      return (
        storedCount >= latestCount - tolerance &&
        storedCount <= latestCount + tolerance
      );
    };

    const { _id, ...dataWithoutId } = responseData;

    dataWithoutId.is_active = isActive;

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
      console.log("Invalid updated_at, full refresh required");
      return isEqualObj;
    }

    /**
     * Stops when the stored payload is older than the allowed reuse window.
     */
    if (updatedAt <= updatedAtCutoffDate) {
      console.log(
        `Payload too old (updated_at=${dataWithoutId.updated_at}), full refresh required`,
      );
      return isEqualObj;
    }

    /**
     * Stops early when the stored IMDb ratings no longer match.
     */
    if (!imdbRatingsMatch(dataWithoutId)) {
      console.log(
        `IMDb ratings changed (stored=${dataWithoutId.imdb?.users_rating}/${dataWithoutId.imdb?.users_rating_count}, latest=${imdbRatingData.usersRating}/${imdbRatingData.usersRatingCount}), full refresh required`,
      );
      return isEqualObj;
    }

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

    /**
     * Forces a full refresh when the next episode has already aired.
     */
    const nextEpisodeReleaseDate = dataWithoutId.next_episode?.release_date;
    if (
      nextEpisodeReleaseDate &&
      new Date(nextEpisodeReleaseDate) < new Date()
    ) {
      console.log(
        `next_episode already aired (release_date=${nextEpisodeReleaseDate}), full refresh required`,
      );
      return isEqualObj;
    }

    /**
     * Reuses recently updated items without rebuilding TV show episode fields,
     * since IMDb ratings already match and the payload is fresh enough.
     */
    if (updatedAt > recentUpdateCutoffDate) {
      console.log(
        `Fast path — recently updated and IMDb ratings match (rating=${imdbRatingData.usersRating}, count=${imdbRatingData.usersRatingCount}), reusing`,
      );
      return {
        isEqual: true,
        data: dataWithoutId,
      };
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
     * Merges the refreshed TV show fields into the stored payload.
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
     * Reuses the payload after the full rebuild, refreshing updated_at because episode data was re-fetched.
     */
    dataWithoutId.updated_at = new Date().toISOString();
    return {
      isEqual: true,
      data: dataWithoutId,
    };
  } catch (error) {
    logErrors(error, tmdbId, "compareUsersRating");
  }
};

module.exports = compareUsersRating;
