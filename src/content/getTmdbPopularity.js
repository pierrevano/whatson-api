const { config } = require("../config");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("../utils/getHomepageResponseWithRateLimitRetry");
const { isNotNull } = require("../utils/isNotNull");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

const cache = new Map();

const POPULAR_MAX_ITEMS = 500;
const POPULAR_MIN_VOTES = 400;

/**
 * Fetches the popular list for the given media type.
 *
 * @param {string} type - The media type (e.g., movie, tv)
 * @returns {Promise<Array<object>>} The popular entries (partial or empty on failure).
 */
const fetchTmdbPopular = async (type) => {
  if (cache.has(type)) return cache.get(type);

  const popular = [];

  try {
    for (let page = 1; popular.length < POPULAR_MAX_ITEMS; page++) {
      const response = await getHomepageResponseWithRateLimitRetry(
        `${config.baseURLTMDBAPI}/${type}/popular?page=${page}&api_key=${config.tmdbApiKey}`,
        { serviceName: "TMDB", allowedStatuses: [200, 429] },
      );
      const results = response.data?.results;

      if (!Array.isArray(results)) break;

      popular.push(
        ...results.filter((item) => item?.vote_count >= POPULAR_MIN_VOTES),
      );
    }
  } catch (error) {
    const message = `${error}`.replaceAll(config.tmdbApiKey, "***");
    logAndAppendTempErrorLog(`${type} - fetchTmdbPopular - ${message}`);
  }

  if (popular.length) cache.set(type, popular);

  return popular;
};

/**
 * Extracts the popularity rank from the popular list.
 *
 * @param {string} tmdbHomepage - The homepage URL.
 * @param {number} tmdbId - The ID of the item.
 * @param {string} item_type - The type of the item (e.g., movie, tvshow)
 * @returns {Promise<{ popularity: number|null }>} The popularity rank (null when missing or on failure).
 */
const getTmdbPopularity = async (tmdbHomepage, tmdbId, item_type) => {
  let popularity = null;

  try {
    if (isNotNull(tmdbId)) {
      const mediaKey = item_type === "movie" ? "movie" : "tv";
      const popular = await fetchTmdbPopular(mediaKey);
      const rank = popular.findIndex((item) => item?.id === tmdbId) + 1;

      popularity = rank || null;
    }
  } catch (error) {
    logErrors(error, tmdbHomepage, "getTmdbPopularity");
  }

  return { popularity };
};

module.exports = { getTmdbPopularity };
