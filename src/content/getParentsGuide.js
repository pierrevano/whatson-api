const { config } = require("../config");
const { getNextData } = require("./getCertification");

/**
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @returns {Promise<{
 *   url: string|null,
 *   categories: Array<{title: string|undefined, severity: string|null}>|null
 * }>} Parents guide categories derived from the parental guide payload.
 */
const getParentsGuide = async (imdbHomepage) => {
  const nextData = await getNextData(imdbHomepage, "getParentsGuide");
  const categories = (
    nextData?.props?.pageProps?.contentData?.categories || []
  ).map((category) => ({
    title: category?.title,
    severity: category?.severitySummary?.text || null,
  }));

  return {
    url: imdbHomepage ? `${imdbHomepage}${config.imdbParentalGuidePath}` : null,
    categories: categories.length ? categories : null,
  };
};

module.exports = { getParentsGuide };
