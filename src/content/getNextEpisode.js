const axios = require("axios");

const { config } = require("../config");
const { getTMDBResponse } = require("../getTMDBResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the next episode to be aired for a specific tvshow based on its TMDB ID.
 * This function fetches data from TMDB and Trakt APIs to determine the next episode.
 *
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {number} tmdbId - The TMDB ID of the movie or tvshow.
 * @returns {Promise<Object|null>} - An object containing the next episode information or null if not found.
 * @throws {Error} - If there is an error retrieving the data.
 */
const getNextEpisode = async (allocineHomepage, tmdbId) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let nextEpisode = null;

  try {
    const { data } = await getTMDBResponse(allocineHomepage, tmdbId);

    const nextEpisodeToAirFromTMDB = data?.next_episode_to_air || null;

    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    const response = await axios.get(
      `${config.baseURLTraktAPI}/calendars/all/shows/${today}/7`,
      {
        headers: {
          "trakt-api-key": config.traktApiKey,
          "trakt-api-version": 2,
        },
      },
    );

    const filteredEpisodes = response.data.filter(
      (ep) => ep?.show?.ids?.tmdb && ep.show.ids.tmdb === tmdbId,
    );

    if (filteredEpisodes.length > 0) {
      const mostRecentEpisode = filteredEpisodes.reduce((latest, current) => {
        return new Date(current.first_aired) > new Date(latest.first_aired)
          ? current
          : latest;
      });

      const title = mostRecentEpisode?.episode?.title ?? null;
      const description = nextEpisodeToAirFromTMDB?.overview ?? null;
      const firstAired = mostRecentEpisode?.first_aired ?? null;
      const episode = mostRecentEpisode?.episode?.number ?? null;
      const episodeType = nextEpisodeToAirFromTMDB?.episode_type ?? null;
      const season = mostRecentEpisode?.episode?.season ?? null;
      const id = mostRecentEpisode?.episode?.ids?.imdb ?? null;
      const url = id ? `${config.baseURLIMDB}${id}` : null;

      if ([title, firstAired, episode, season, id, url].includes(null)) {
        nextEpisode = null;
      } else {
        nextEpisode = {
          title: title,
          description: description,
          air_date: firstAired,
          episode: episode,
          episode_type: episodeType,
          season: season,
          id: id,
          url: url,
        };
      }
    }
  } catch (error) {
    logErrors(error, tmdbId, "getNextEpisode");
  }

  return nextEpisode;
};

module.exports = { getNextEpisode };
