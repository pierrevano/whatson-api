/**
 * Retrieves composer names from the item metadata.
 * @param {object} data - The item metadata.
 * @param {object} [tmdbData] - TMDB data.
 * @param {object} [imdbCredits] - IMDb credits.
 * @returns {string[]|null} Composer names when available.
 */
const getComposers = (data, tmdbData, imdbCredits) => {
  const musicBy = data?.musicBy;
  const allocineComposers =
    data?.composers ||
    (Array.isArray(musicBy) ? musicBy : [musicBy])
      .map((person) => person?.name)
      .filter((name) => typeof name === "string" && name.trim());
  if (allocineComposers.length) return [...new Set(allocineComposers)];

  if (imdbCredits?.composers?.length) return imdbCredits.composers;

  const tmdbComposers = tmdbData?.credits?.crew
    ?.filter((person) => person.job === "Original Music Composer")
    .map((person) => person.name);
  return tmdbComposers?.length ? [...new Set(tmdbComposers)] : null;
};

module.exports = { getComposers };
