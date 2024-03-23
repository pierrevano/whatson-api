/**
 * Loads environment variables from a .env file into process.env.
 * @returns None
 */
require("dotenv").config();

const axios = require("axios");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * It gets the platforms links of a movie or tvshow from the BetaSeries API
 * @param betaseriesId - the BetaSeries ID
 * @param allocineHomepage - the URL of the movie or tvshow's page on AlloCiné
 * @param imdbId - the IMDb ID
 * @returns An array of objects containing the name and link_url of the platforms.
 */
const getPlatformsLinks = async (betaseriesId, allocineHomepage, imdbId) => {
  let platformsLinks = null;

  try {
    if (betaseriesId) {
      const baseURLBetaseriesAPI = allocineHomepage.includes(config.baseURLTypeSeries) ? config.baseURLBetaseriesAPISeries : config.baseURLBetaseriesAPIFilms;
      const url = `${baseURLBetaseriesAPI}?key=${process.env.BETASERIES_API_KEY}&imdb_id=${imdbId}`;

      const options = { validateStatus: (status) => status < 500 };
      const { data, status } = await axios.get(url, options);
      if (status !== 200) {
        platformsLinks = null;

        return platformsLinks;
      }

      const processSvods = (svods) => {
        platformsLinks = [];
        svods.forEach((element) => {
          platformsLinks.push({
            name: element.name,
            link_url: element.link_url,
          });
        });
      };

      if (data.show && data.show.platforms && data.show.platforms.svods) {
        processSvods(data.show.platforms.svods);
      } else if (data.movie && data.movie.platforms_svod) {
        processSvods(data.movie.platforms_svod);
      }

      if (platformsLinks.length === 0) platformsLinks = null;
    }
  } catch (error) {
    console.log(`getPlatformsLinks - ${allocineHomepage}: ${error}`);
  }

  return platformsLinks;
};

module.exports = { getPlatformsLinks };
