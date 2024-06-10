const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getContentUrl } = require("../utils/getContentUrl");
const { logErrors } = require("../utils/logErrors");
const { removeExtraChar } = require("../utils/removeExtraChar");

/**
 * It gets the trailer link for a movie or tvshow
 * @param allocineHomepage - The URL of the movie or tvshow on AlloCiné.
 * @param betaseriesHomepage - The URL of the tvshow on BetaSeries.
 * @param options - This is the options object that is passed to the getCheerioContent function.
 * @returns The trailer link.
 */
const getTrailer = async (allocineHomepage, betaseriesHomepage, options) => {
  let trailer = null;
  let $;

  try {
    if (betaseriesHomepage) {
      $ = await getCheerioContent(betaseriesHomepage, options, "getTrailer");

      const dailymotionId = $(".video-embed-container div").first().attr("id");
      if (dailymotionId)
        trailer = `${config.baseURLDailymotion}${dailymotionId.split("-")[1]}`;
    }

    /*
     * If the ID has not been found previously we fallback to this logic
     * to get the trailer link from the BetaSeries page directly (for tvshows only).
     */
    if (!trailer) {
      if (allocineHomepage.includes(config.baseURLTypeSeries)) {
        $ = await getCheerioContent(betaseriesHomepage, options, "getTrailer");

        const content = getContentUrl($, false, allocineHomepage);
        if (content && content.video && content.video.embedUrl)
          trailer = content.video.embedUrl;

        /*
         * Checking to see if the trailer variable is `null`.
         * If it is, it will run the code below as a backup video link.
         */
        if (!trailer) {
          $ = await getCheerioContent(allocineHomepage, options, "getTrailer");

          const hasInactiveVideos = [...$(".third-nav .inactive")]
            .map((e) => removeExtraChar($(e).text()).trim())
            .includes("Vidéos");
          if (!hasInactiveVideos) {
            const allocineId = parseInt(
              allocineHomepage.match(/=(.*)\./).pop(),
            );
            $ = await getCheerioContent(
              `${config.baseURLAllocine}${config.baseURLCriticDetailsSeries}${allocineId}/videos/`,
              options,
              "getTrailer",
            );

            const linkToVideo = $(".meta-title-link").first().attr("href");
            if (linkToVideo) {
              $ = await getCheerioContent(
                `${config.baseURLAllocine}${linkToVideo}`,
                options,
                "getTrailer",
              );

              if ($) {
                const content = getContentUrl($, true, allocineHomepage);
                if (content && content.contentUrl) trailer = content.contentUrl;
              }
            }
          }
        }
      } else {
        /*
         * If the ID has not been found previously we fallback to this logic
         * to get the trailer link from the AlloCiné page directly (for movies only).
         */
        $ = await getCheerioContent(allocineHomepage, options, "getTrailer");

        const hasInactiveVideos = [...$(".third-nav .inactive")]
          .map((e) => removeExtraChar($(e).text()).trim())
          .includes("Bandes-annonces");
        if (hasInactiveVideos) return trailer;

        const itemJSON = getContentUrl($, true, allocineHomepage);
        if (itemJSON && itemJSON.trailer && itemJSON.trailer.url) {
          $ = await getCheerioContent(
            itemJSON.trailer.url,
            options,
            "getTrailer",
          );

          const content = getContentUrl($, true, allocineHomepage);
          if (content && content.contentUrl) trailer = content.contentUrl;
        }
      }
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getTrailer");
  }

  return trailer;
};

module.exports = { getTrailer };
