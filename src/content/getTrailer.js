const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getContentUrl } = require("../utils/getContentUrl");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");
const { removeExtraChar } = require("../utils/removeExtraChar");

/**
 * Retrieves a trailer URL from provided metadata or fallback sources.
 *
 * @param {string} allocineHomepage - Source page URL for the item.
 * @param {string|null} betaseriesHomepage - Fallback provider URL.
 * @param {string|null} betaseriesId - Fallback provider identifier.
 * @param {{ trailer?: string|null }|null} [data] - Previously fetched metadata.
 * @returns {Promise<string|null>} The trailer URL, or null when unavailable.
 */
const getTrailer = async (
  allocineHomepage,
  betaseriesHomepage,
  betaseriesId,
  data,
) => {
  let trailer = null;
  let $;

  const fetchContent = async (url) => {
    await getHomepageResponse(url, { allowedStatuses: [200, 429] });
    return getCheerioContent(url, undefined, "getTrailer");
  };

  try {
    const traktTrailer = data?.trailer || null;
    if (traktTrailer) return traktTrailer;

    if (isNotNull(betaseriesId)) {
      $ = await fetchContent(betaseriesHomepage);

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
        if (isNotNull(betaseriesId)) {
          $ = await fetchContent(betaseriesHomepage);

          const content = getContentUrl($, false, allocineHomepage);
          if (content && content.video && content.video.embedUrl)
            trailer = content.video.embedUrl;
        }

        /*
         * Checking to see if the trailer variable is `null`.
         * If it is, it will run the code below as a backup video link.
         */
        if (!trailer) {
          $ = await fetchContent(allocineHomepage);

          const hasInactiveVideos = [...$(".third-nav .inactive")]
            .map((e) => removeExtraChar($(e).text()).trim())
            .includes("Vidéos");
          if (!hasInactiveVideos) {
            const allocineId = parseInt(
              allocineHomepage.match(/=(.*)\./).pop(),
            );
            $ = await fetchContent(
              `${config.baseURLAllocine}${config.baseURLCriticDetailsSeries}${allocineId}/videos/`,
            );

            const linkToVideo = $(".meta-title-link").first().attr("href");
            if (linkToVideo) {
              $ = await fetchContent(`${config.baseURLAllocine}${linkToVideo}`);

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
        $ = await fetchContent(allocineHomepage);

        const hasInactiveVideos = [...$(".third-nav .inactive")]
          .map((e) => removeExtraChar($(e).text()).trim())
          .includes("Bandes-annonces");
        if (hasInactiveVideos) return trailer;

        const itemJSON = getContentUrl($, true, allocineHomepage);
        if (itemJSON?.trailer?.url) {
          $ = await fetchContent(itemJSON.trailer.url);

          const content = getContentUrl($, true, allocineHomepage);
          if (content && content.contentUrl) trailer = content.contentUrl;
        }
      }
    }
  } catch (error) {
    logErrors(error, allocineHomepage, "getTrailer");
  }

  return trailer ? trailer.split("?")[0] : trailer;
};

module.exports = { getTrailer };
