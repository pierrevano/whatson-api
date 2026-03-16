const { buildEpisodeSummary } = require("./buildEpisodeSummary");
const { formatDate } = require("./formatDate");

const isRankableEpisode = (episode) =>
  Boolean(
    episode?.release_date &&
    episode?.users_rating != null &&
    episode?.users_rating_count != null,
  );

/**
 * Compares two episodes using rating, rating count, release date, season, and episode number.
 *
 * @param {object} a - First episode.
 * @param {object} b - Second episode.
 * @param {"asc"|"desc"} [order="desc"] - Rating sort order.
 * @returns {number} Sort result.
 */
const compareEpisodes = (a, b, order = "desc") => {
  const isAscending = order === "asc";

  if (a.users_rating !== b.users_rating) {
    return isAscending
      ? a.users_rating - b.users_rating
      : b.users_rating - a.users_rating;
  }

  if (a.users_rating_count !== b.users_rating_count) {
    return b.users_rating_count - a.users_rating_count;
  }

  const formattedDateA = formatDate(a.release_date);
  const formattedDateB = formatDate(b.release_date);

  if (formattedDateA !== formattedDateB) {
    return isAscending
      ? new Date(formattedDateA) - new Date(formattedDateB)
      : new Date(formattedDateB) - new Date(formattedDateA);
  }

  if (a.season !== b.season) {
    return a.season - b.season;
  }

  return a.episode - b.episode;
};

/**
 * Returns the highest- or lowest-ranked episode from a list.
 *
 * @param {Array<object>|null|undefined} episodesDetails - Episodes to rank.
 * @param {"asc"|"desc"} [order="desc"] - Rating sort order.
 * @returns {object|null} Ranked episode summary or `null`.
 */
const getRankedEpisode = (episodesDetails, order = "desc") => {
  const validEpisodes = Array.isArray(episodesDetails)
    ? episodesDetails.filter(isRankableEpisode)
    : [];

  if (validEpisodes.length === 0) {
    return null;
  }

  validEpisodes.sort((a, b) => compareEpisodes(a, b, order));

  return buildEpisodeSummary(validEpisodes[0]);
};

/**
 * Returns Mongo sort fields for episode ranking.
 *
 * @param {string} [prefix=""] - Optional field prefix.
 * @param {"asc"|"desc"} [order="desc"] - Rating sort order.
 * @returns {object} Mongo sort fields.
 */
const getEpisodeSortFields = (prefix = "", order = "desc") => {
  const isAscending = order === "asc";

  return {
    [`${prefix}users_rating`]: isAscending ? 1 : -1,
    [`${prefix}users_rating_count`]: -1,
    [`${prefix}release_date`]: isAscending ? 1 : -1,
    [`${prefix}season`]: 1,
    [`${prefix}episode`]: 1,
  };
};

module.exports = {
  getEpisodeSortFields,
  getRankedEpisode,
};
