const { config } = require("../config");
const {
  getAllocineCriticsRating,
} = require("../content/getAllocineCriticsRating");
const { getAllocineInfo } = require("../content/getAllocineInfo");
const { getBetaseriesRating } = require("../content/getBetaseriesRating");
const { getImdbRating } = require("../content/getImdbRating");
const { getLetterboxdRating } = require("../content/getLetterboxdRating");
const { getMetacriticRating } = require("../content/getMetacriticRating");
const {
  getRottenTomatoesRating,
} = require("../content/getRottenTomatoesRating");
const { getSensCritiqueRating } = require("../content/getSensCritiqueRating");
const { getTmdbRating } = require("../content/getTmdbRating");
const { getTraktRating } = require("../content/getTraktRating");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastCallAt = 0;

/**
 * Collects rating details using source pages and previously fetched metadata.
 *
 * @param {object} params - Provider URLs, identifiers, and response data.
 * @returns {Promise<object>} Collected metadata grouped by provider.
 */
const getRatingsData = async ({
  allocineCriticsDetails,
  allocineHomepage,
  betaseriesHomepage,
  betaseriesId,
  imdbData,
  imdbHomepage,
  letterboxdHomepage,
  letterboxdId,
  metacriticHomepage,
  metacriticId,
  rottenTomatoesHomepage,
  rottenTomatoesId,
  sensCritiqueHomepage,
  sensCritiqueId,
  tmdbData,
  tmdbHomepage,
  tmdbId,
  traktData,
  traktHomepage,
  traktId,
}) => {
  const now = Date.now();
  const waitMs = Math.max(0, config.ratingsDelayMs - (now - lastCallAt));
  if (waitMs > 0) {
    await delay(waitMs);
  }
  lastCallAt = Date.now();

  const allocineFirstInfo = await getAllocineInfo(allocineHomepage, false);
  const allocineCriticInfo = await getAllocineCriticsRating(
    allocineCriticsDetails,
  );

  if (process.env.SEQUENTIAL_RATINGS_FETCH === "true") {
    const betaseriesRating = await getBetaseriesRating(
      allocineHomepage,
      betaseriesHomepage,
      betaseriesId,
    );
    const letterboxdRating = await getLetterboxdRating(
      letterboxdHomepage,
      letterboxdId,
    );
    const metacriticRating = await getMetacriticRating(
      metacriticHomepage,
      metacriticId,
    );
    const rottenTomatoesRating = await getRottenTomatoesRating(
      rottenTomatoesHomepage,
      rottenTomatoesId,
    );
    const sensCritiqueRating = await getSensCritiqueRating(
      sensCritiqueHomepage,
      sensCritiqueId,
    );
    const traktRating = await getTraktRating(traktHomepage, traktId, traktData);
    const [imdbRatingData, tmdbRating] = await Promise.all([
      getImdbRating(imdbHomepage, imdbData),
      getTmdbRating(tmdbHomepage, tmdbId, tmdbData),
    ]);

    return {
      allocineCriticInfo,
      allocineFirstInfo,
      betaseriesRating,
      imdbRatingData,
      letterboxdRating,
      metacriticRating,
      rottenTomatoesRating,
      sensCritiqueRating,
      tmdbRating,
      traktRating,
    };
  }

  const [
    betaseriesRating,
    imdbRatingData,
    letterboxdRating,
    metacriticRating,
    rottenTomatoesRating,
    sensCritiqueRating,
    tmdbRating,
    traktRating,
  ] = await Promise.all([
    getBetaseriesRating(allocineHomepage, betaseriesHomepage, betaseriesId),
    getImdbRating(imdbHomepage, imdbData),
    getLetterboxdRating(letterboxdHomepage, letterboxdId),
    getMetacriticRating(metacriticHomepage, metacriticId),
    getRottenTomatoesRating(rottenTomatoesHomepage, rottenTomatoesId),
    getSensCritiqueRating(sensCritiqueHomepage, sensCritiqueId),
    getTmdbRating(tmdbHomepage, tmdbId, tmdbData),
    getTraktRating(traktHomepage, traktId, traktData),
  ]);

  return {
    allocineCriticInfo,
    allocineFirstInfo,
    betaseriesRating,
    imdbRatingData,
    letterboxdRating,
    metacriticRating,
    rottenTomatoesRating,
    sensCritiqueRating,
    tmdbRating,
    traktRating,
  };
};

module.exports = { getRatingsData };
