const { config } = require("../config");
const { formatDate } = require("../utils/formatDate");
const { getAllocineInfo } = require("./getAllocineInfo");
const { logErrors } = require("../utils/logErrors");
const { updateToReadableString } = require("../utils/updateToReadableString");

/**
 * Returns the episode that follows the provided last episode in the episodes list.
 * @param {Object|null} lastEpisode - Last aired episode returned for a tvshow.
 * @param {Array<Object>} normalizedEpisodes - Full episodes list in airing order.
 * @returns {Object|null} The sequential episode, or null when not found.
 */
const getSequentialEpisode = (lastEpisode, normalizedEpisodes) => {
  if (!lastEpisode?.id) return null;
  const currentIndex = normalizedEpisodes.findIndex(
    (episode) => episode.id === lastEpisode.id,
  );
  if (currentIndex < 0) return null;
  return normalizedEpisodes[currentIndex + 1] ?? null;
};

/**
 * Retrieves details of the next episode to air for a given tvshow, excluding ended shows and past episodes.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {Array<Object>} episodesDetails - Array of episode objects for the tvshow.
 * @param {Object|null} lastEpisode - The last aired episode with season and episode numbers.
 * @param {Object} data - The TMDB API response data for the tvshow.
 * @returns {Promise<Object|null>} A promise resolving to the next episode's details, or null if not applicable.
 */
const getNextEpisode = async (
  allocineHomepage,
  episodesDetails,
  lastEpisode,
  data,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let nextEpisodeDetails = null;

  try {
    const normalizedEpisodes = Array.isArray(episodesDetails)
      ? episodesDetails
      : [];

    const isFutureEpisode = (episode) =>
      episode?.release_date &&
      formatDate(episode.release_date) >= formatDate(new Date());

    const nextEpisode = getSequentialEpisode(lastEpisode, normalizedEpisodes);
    if (!nextEpisode) return null;
    if (!isFutureEpisode(nextEpisode)) return null;

    // Ensure the next episode is always after the last episode
    const isAfter = (nEpisode, lEpisode) => {
      if (!nEpisode || !lEpisode) return true;
      if (nEpisode.season > lEpisode.season) return true;
      if (
        nEpisode.season === lEpisode.season &&
        nEpisode.episode > lEpisode.episode
      )
        return true;
      return false;
    };

    if (!isAfter(nextEpisode, lastEpisode)) return null;

    let episode_type = null;
    if (data?.next_episode_to_air) {
      const {
        season_number,
        episode_number,
        episode_type: type,
      } = data.next_episode_to_air;

      if (
        season_number === nextEpisode.season &&
        episode_number === nextEpisode.episode
      ) {
        episode_type = type;
      }
    }

    if ((await getAllocineInfo(allocineHomepage, false)).status !== "Ended") {
      nextEpisodeDetails = {
        season: nextEpisode.season,
        episode: nextEpisode.episode,
        episode_type: updateToReadableString(episode_type),
        title: nextEpisode.title,
        description: nextEpisode.description,
        id: nextEpisode.id,
        url: nextEpisode.url,
        release_date: nextEpisode.release_date,
        users_rating: nextEpisode.users_rating,
        users_rating_count: nextEpisode.users_rating_count,
      };
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getNextEpisode");
  }

  return nextEpisodeDetails;
};

module.exports = { getNextEpisode };
