const { getImdbEpisodesPagination } = require("./getImdbEpisodesPagination");
const { logErrors } = require("../utils/logErrors");

const sortEpisodes = (episodes) =>
  episodes.sort((a, b) => {
    const seasonA = Number.isFinite(a?.season)
      ? a.season
      : Number.MAX_SAFE_INTEGER;
    const seasonB = Number.isFinite(b?.season)
      ? b.season
      : Number.MAX_SAFE_INTEGER;

    if (seasonA !== seasonB) return seasonA - seasonB;

    const episodeA = Number.isFinite(a?.episode)
      ? a.episode
      : Number.MAX_SAFE_INTEGER;
    const episodeB = Number.isFinite(b?.episode)
      ? b.episode
      : Number.MAX_SAFE_INTEGER;

    return episodeA - episodeB;
  });

const mergeEpisodes = (originalEpisodes, paginatedEpisodes) => {
  const episodesMap = new Map();
  [...originalEpisodes, ...paginatedEpisodes].forEach((episode) => {
    if (episode?.id && !episodesMap.has(episode.id)) {
      episodesMap.set(episode.id, episode);
    }
  });
  return Array.from(episodesMap.values());
};

/**
 * Merge the first-page episodes with any paginated ones and sort when needed.
 *
 * @param {Array<Object>} episodesDetails - Episodes already scraped from IMDb pages.
 * @param {string} imdbId - IMDb title ID (e.g., "tt2044128").
 * @param {string|null} paginationCursor - Cursor to fetch additional episodes (endCursor).
 * @returns {Promise<Array<Object>>} Episodes merged (deduped) and sorted when applicable.
 */
const processEpisodesPagination = async (
  episodesDetails,
  imdbId,
  paginationCursor,
) => {
  let mergedEpisodes = episodesDetails;

  try {
    if (paginationCursor) {
      console.log(
        `Fetching paginated episodes with cursor ${paginationCursor} for ${imdbId}`,
      );

      const paginatedEpisodes = await getImdbEpisodesPagination(
        imdbId,
        paginationCursor,
      );

      if (Array.isArray(paginatedEpisodes) && paginatedEpisodes.length > 0) {
        mergedEpisodes = mergeEpisodes(episodesDetails, paginatedEpisodes);
      }
    }

    mergedEpisodes = sortEpisodes(mergedEpisodes);
  } catch (error) {
    logErrors(error, imdbId, "processEpisodesPagination");
  }

  return mergedEpisodes;
};

module.exports = { processEpisodesPagination };
