const { appendFile } = require("fs");

const { config } = require("../config");
const { getWhatsonResponse } = require("../utils/getWhatsonResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Retrieves the number of seasons for a tvshow from TMDB.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the movie or tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @param {string} [imdbId] - Optional IMDb ID used only to log discrepancies with the What's on? API.
 * @returns {Promise<number|null>} - A promise that resolves with the TMDB number of seasons, or null if the number cannot be determined.
 */
const getSeasonsNumber = async (allocineHomepage, data, imdbId) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let seasonsNumber = null;

  try {
    seasonsNumber = Number(data?.number_of_seasons);
    if (Number.isNaN(seasonsNumber)) {
      seasonsNumber = null;
    }

    if (seasonsNumber && imdbId) {
      const whatsonResponse = await getWhatsonResponse(
        imdbId,
        "next_episode,last_episode",
      );

      const nextEpisodeSeason = Number(whatsonResponse?.next_episode?.season);
      const lastEpisodeSeason = Number(whatsonResponse?.last_episode?.season);

      let whatsonSeason = null;

      if (!Number.isNaN(nextEpisodeSeason)) {
        whatsonSeason = nextEpisodeSeason;
      } else if (!Number.isNaN(lastEpisodeSeason)) {
        whatsonSeason = lastEpisodeSeason;
      }

      if (whatsonSeason && whatsonSeason < seasonsNumber) {
        const diffValues = `getSeasonsNumber diff for ${imdbId || "unknown"}: tmdb=${seasonsNumber}, whatson=${whatsonSeason}`;
        console.log(diffValues);
        appendFile(
          "temp_error.log",
          `${new Date().toISOString()} - ${diffValues}\n`,
          () => {},
        );
      }
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getSeasonsNumber");
  }

  return seasonsNumber;
};

module.exports = { getSeasonsNumber };
