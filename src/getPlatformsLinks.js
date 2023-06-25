/**
 * Loads environment variables from a .env file into process.env.
 * @returns None
 */
require("dotenv").config();

const axios = require("axios");

/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/**
 * It gets the platforms links of a series from the allocine homepage
 * @param allocineHomepage - the URL of the show's page on Allocine
 * @param imdbHomepage - the IMDB homepage of the series
 * @returns An array of objects containing the name and link_url of the platforms.
 */
const getPlatformsLinks = async (allocineHomepage, imdbHomepage) => {
  try {
    let platformsLinks = null;

    if (allocineHomepage.includes(config.baseURLTypeSeries)) {
      const betaseries_api_key = process.env.BETASERIES_API_KEY;
      const baseURLBetaseriesAPI = config.baseURLBetaseriesAPI;
      const imdbHomepageId = imdbHomepage.split("/")[4];
      const url = `${baseURLBetaseriesAPI}?key=${betaseries_api_key}&imdb_id=${imdbHomepageId}`;

      const options = { validateStatus: (status) => status < 500 };
      const { data, status } = await axios.get(url, options);
      if (status !== 200) {
        platformsLinks = null;

        return platformsLinks;
      }

      if (data.show.platforms && data.show.platforms.svods) {
        const svods = data.show.platforms.svods;
        platformsLinks = [];
        svods.forEach((element) => {
          platformsLinks.push({
            name: element.name,
            link_url: element.link_url,
          });
        });

        if (platformsLinks.length === 0) platformsLinks = null;
      }
    }

    return platformsLinks;
  } catch (error) {
    console.log(`getPlatformsLinks - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getPlatformsLinks };
