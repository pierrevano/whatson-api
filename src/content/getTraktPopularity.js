const { config } = require("../config");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("../utils/getHomepageResponseWithRateLimitRetry");
const { isNotNull } = require("../utils/isNotNull");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

const cache = new Map();

const TRENDING_PAGE_LIMIT = 250;
const TRENDING_MAX_ITEMS = 1000;

/**
 * Fetches the trending list for the given media type.
 *
 * @param {string} type - The media type (e.g., movies, shows)
 * @returns {Promise<Array<object>>} The trending entries (partial or empty on failure).
 */
const fetchTraktTrending = async (type) => {
  if (cache.has(type)) return cache.get(type);

  const trending = [];
  let apiUrl = "";

  try {
    for (let page = 1; trending.length < TRENDING_MAX_ITEMS; page++) {
      apiUrl = `${config.baseURLTraktAPI}/${type}/trending?limit=${TRENDING_PAGE_LIMIT}&page=${page}`;

      const response = await getHomepageResponseWithRateLimitRetry(apiUrl, {
        serviceName: "Trakt",
        allowedStatuses: [200, 429],
        requestConfig: {
          headers: {
            "trakt-api-key": config.traktApiKey,
            "trakt-api-version": 2,
          },
        },
      });

      if (!Array.isArray(response.data)) break;

      trending.push(...response.data);

      if (response.data.length < TRENDING_PAGE_LIMIT) break;
    }
  } catch (error) {
    logAndAppendTempErrorLog(`${apiUrl} - fetchTraktTrending - ${error}`);
  }

  if (trending.length) cache.set(type, trending);

  return trending;
};

/**
 * Extracts the popularity rank from the trending list.
 *
 * @param {string} traktHomepage - The homepage URL.
 * @param {number|string} traktId - The ID of the item.
 * @param {string} item_type - The type of the item (e.g., movie, tvshow)
 * @returns {Promise<{ popularity: number|null }>} The popularity rank (null when missing or on failure).
 */
const getTraktPopularity = async (traktHomepage, traktId, item_type) => {
  let popularity = null;

  try {
    if (isNotNull(traktId)) {
      const mediaKey = item_type === "movie" ? "movie" : "show";
      const trending = await fetchTraktTrending(`${mediaKey}s`);
      const rank =
        trending.findIndex(
          (item) =>
            item?.[mediaKey]?.ids?.slug === traktId ||
            item?.[mediaKey]?.ids?.trakt === traktId,
        ) + 1;

      popularity = rank || null;
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktPopularity");
  }

  return { popularity };
};

module.exports = { getTraktPopularity };
