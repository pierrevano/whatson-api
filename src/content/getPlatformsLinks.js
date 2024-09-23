const axios = require("axios");

const { config } = require("../config");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");
const { writeItemsNumber } = require("../utils/writeItemsNumber");

const platformsNamesCount = {};

const processSvods = (svods) => {
  let platformsLinks = [];

  if (Array.isArray(svods)) {
    platformsLinks = svods.map((element) => {
      const platformName = element.name;
      platformsNamesCount[platformName] =
        (platformsNamesCount[platformName] || 0) + 1;
      return {
        name: platformName,
        link_url: element.link_url,
      };
    });
  } else if (typeof svods === "object") {
    platformsLinks = Object.values(svods).map((element) => {
      const platformName = element.name;
      platformsNamesCount[platformName] =
        (platformsNamesCount[platformName] || 0) + 1;
      return {
        name: platformName,
        link_url: element.link_url,
      };
    });
  }

  return platformsLinks;
};

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
    if (isNotNull(betaseriesId)) {
      const baseURLBetaseriesAPI = allocineHomepage.includes(
        config.baseURLTypeSeries,
      )
        ? config.baseURLBetaseriesAPISeries
        : config.baseURLBetaseriesAPIFilms;
      const url = `${baseURLBetaseriesAPI}?key=${config.betaseriesApiKey}&imdb_id=${imdbId}`;

      const options = { validateStatus: (status) => status < 500 };
      const { data, status } = await axios.get(url, options);
      if (status !== 200) {
        platformsLinks = null;

        return platformsLinks;
      }

      if (data.show && data.show.platforms && data.show.platforms.svods) {
        platformsLinks = processSvods(data.show.platforms.svods);
      } else if (data.movie && data.movie.platforms_svod) {
        platformsLinks = processSvods(data.movie.platforms_svod);
      }

      if (platformsLinks && platformsLinks.length === 0) platformsLinks = null;

      writeItemsNumber(
        allocineHomepage,
        platformsNamesCount,
        "platforms_names",
      );
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getPlatformsLinks");
  }

  return platformsLinks;
};

module.exports = { getPlatformsLinks };
