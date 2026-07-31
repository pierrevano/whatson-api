const { config } = require("../config");
const {
  getHomepageResponseWithRateLimitRetry,
} = require("../utils/getHomepageResponseWithRateLimitRetry");
const { isNotNull } = require("../utils/isNotNull");
const { logAndAppendTempErrorLog, logErrors } = require("../utils/logErrors");

const cache = new Map();

/**
 * Fetches the trending list for the given media type.
 *
 * @param {string} type - The media type (e.g., movies, shows)
 * @returns {Promise<Array<object>>} The trending entries (empty on failure).
 */
const fetchTraktTrending = async (type) => {
  if (cache.has(type)) return cache.get(type);

  const apiUrl = `${config.baseURLTraktAPI}/${type}/trending?limit=250`;
  let trending = [];

  try {
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

    if (Array.isArray(response.data)) trending = response.data;
  } catch (error) {
    logAndAppendTempErrorLog(`${apiUrl} - fetchTraktTrending - ${error}`);
  }

  if (trending.length) cache.set(type, trending);

  return trending;
};

/**
 * Extracts the popularity score from the trending list.
 *
 * @param {string} traktHomepage - The homepage URL.
 * @param {number|string} traktId - The ID of the item.
 * @param {string} item_type - The type of the item (e.g., movie, tvshow)
 * @returns {Promise<{ popularity: number|null }>} The popularity value (null when missing or on failure).
 */
const getTraktPopularity = async (traktHomepage, traktId, item_type) => {
  let popularity = null;

  try {
    if (isNotNull(traktId)) {
      const mediaKey = item_type === "movie" ? "movie" : "show";
      const trending = await fetchTraktTrending(`${mediaKey}s`);
      const foundItem =
        trending.find((item) => item?.[mediaKey]?.ids?.slug === traktId) ??
        trending.find((item) => item?.[mediaKey]?.ids?.trakt === traktId);

      popularity = foundItem?.watchers ?? null;
    }
  } catch (error) {
    logErrors(error, traktHomepage, "getTraktPopularity");
  }

  return { popularity };
};

module.exports = { getTraktPopularity };
