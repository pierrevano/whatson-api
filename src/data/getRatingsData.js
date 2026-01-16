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
const { getTVTimeRating } = require("../content/getTVTimeRating");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastCallAt = 0;

const getRatingsData = async ({
  allocineCriticsDetails,
  allocineHomepage,
  betaseriesHomepage,
  betaseriesId,
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
  traktHomepage,
  traktId,
  tvtimeHomepage,
  tvtimeId,
}) => {
  const now = Date.now();
  const waitMs = Math.max(0, config.ratingsDelayMs - (now - lastCallAt));
  if (waitMs > 0) {
    await delay(waitMs);
  }
  lastCallAt = Date.now();

  const [
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
    tvtimeRating,
  ] = await Promise.all([
    getAllocineCriticsRating(allocineCriticsDetails),
    getAllocineInfo(allocineHomepage, false, tmdbData),
    getBetaseriesRating(allocineHomepage, betaseriesHomepage, betaseriesId),
    getImdbRating(imdbHomepage),
    getLetterboxdRating(letterboxdHomepage, letterboxdId),
    getMetacriticRating(metacriticHomepage, metacriticId),
    getRottenTomatoesRating(rottenTomatoesHomepage, rottenTomatoesId),
    getSensCritiqueRating(sensCritiqueHomepage, sensCritiqueId),
    getTmdbRating(tmdbHomepage, tmdbId, tmdbData),
    getTraktRating(allocineHomepage, traktHomepage, traktId),
    getTVTimeRating(tvtimeHomepage, tvtimeId),
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
    tvtimeRating,
  };
};

module.exports = { getRatingsData };
