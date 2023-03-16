/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const axiosRetry = require("axios-retry");
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

      axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
      const options = { validateStatus: (status) => status === 200 };
      const response = await axios.get(url, options);

      if (response.data.show.platforms && response.data.show.platforms.svods) {
        const svods = response.data.show.platforms.svods;
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
