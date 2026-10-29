const { buildAppendIncludes } = require("../utils/buildAppendIncludes");
const { config } = require("../config");

/**
 * Builds exclusions for unrequested episode fields.
 * @param {string} [appendToResponse] - Optional item fields to include.
 * @param {string} [episodesAppendToResponse] - Optional episode fields to include.
 * @returns {object} MongoDB exclusion projection.
 */
function buildEpisodesProjection(appendToResponse, episodesAppendToResponse) {
  const includes = buildAppendIncludes(appendToResponse);
  if (!includes("episodes_details")) return { episodes_details: 0 };

  const includesEpisode = buildAppendIncludes(episodesAppendToResponse);
  return Object.fromEntries(
    config.episodesAppendToResponseValues
      .filter((field) => !includesEpisode(field))
      .map((field) => [`episodes_details.${field}`, 0]),
  );
}

module.exports = { buildEpisodesProjection };
