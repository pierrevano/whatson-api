/* Importing the config.js file and assigning it to the config variable. */
const { config } = require("./config");

/* Importing the functions from the files in the utils folder. */
const { getCheerioContent } = require("./utils/getCheerioContent");
const { getContentUrl } = require("./utils/getContentUrl");
const { removeExtraChar } = require("./utils/removeExtraChar");

/**
 * It gets the trailer link for a movie or TV show
 * @param allocineHomepage - The URL of the movie or TV show on Allocine.
 * @param betaseriesHomepage - The URL of the TV Show on BetaSeries.
 * @param options - This is the options object that is passed to the getCheerioContent function.
 * @returns The trailer link.
 */
const getTrailer = async (allocineHomepage, betaseriesHomepage, options) => {
  try {
    let trailer = null;
    /* TV Show logic to get trailer link. */
    if (allocineHomepage.includes(config.baseURLTypeSeries)) {
      let url = `${betaseriesHomepage}`;
      let $ = await getCheerioContent(url, options);
      const content = getContentUrl($, false);
      if (content && content.video && content.video.embedUrl) trailer = content.video.embedUrl;
      console.log(`trailer: ${trailer}`);

      /* Checking to see if the trailer variable is null. If it is, it will run the code below as a backup video link. */
      if (!trailer) {
        url = `${allocineHomepage}`;
        console.log(`url: ${url}`);

        $ = await getCheerioContent(url, options);
        const hasInactiveVideos = [...$(".third-nav .inactive")].map((e) => removeExtraChar($(e).text()).trim()).includes("Vidéos");
        console.log(`hasInactiveVideos: ${hasInactiveVideos}`);

        if (!hasInactiveVideos) {
          const allocineId = parseInt(allocineHomepage.match(/=(.*)\./).pop());
          url = `${config.baseURLAllocine}${config.baseURLCriticDetailsSeries}${allocineId}/videos/`;
          console.log(`url: ${url}`);

          $ = await getCheerioContent(url, options);
          const linkToVideo = $(".meta-title-link").first().attr("href");
          url = `${config.baseURLAllocine}${linkToVideo}`;
          console.log(`url: ${url}`);

          if (linkToVideo) {
            $ = await getCheerioContent(url, options);
            const isPageBroken = $.html().length === 0;
            console.log(`isPageBroken: ${isPageBroken}`);
            if (!isPageBroken) {
              const content = getContentUrl($, true);
              trailer = content.contentUrl;
              console.log(`trailer: ${trailer}`);
            }
          }
        }
      }
    } else {
      /* Movie logic to get trailer link */
      const url = `${allocineHomepage}`;
      console.log(`url: ${url}`);

      $ = await getCheerioContent(url, options);
      const itemJSON = getContentUrl($, true);
      if (itemJSON && itemJSON.trailer) {
        const url = itemJSON.trailer.url;
        $ = await getCheerioContent(url, options);
        const content = getContentUrl($, true);
        trailer = content.contentUrl;
        console.log(`trailer: ${trailer}`);
      }
    }

    return trailer;
  } catch (error) {
    console.log(`getTrailer - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { getTrailer };
