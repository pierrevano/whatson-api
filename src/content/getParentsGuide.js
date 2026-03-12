const { config } = require("../config");
const { getNextData } = require("./getCertification");

const getParentsGuideFromNextData = (nextData, imdbHomepage = null) => {
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

const getParentsGuide = async (imdbHomepage) =>
  getParentsGuideFromNextData(
    await getNextData(imdbHomepage, "getParentsGuide"),
    imdbHomepage,
  );

module.exports = {
  getParentsGuide,
  getParentsGuideFromNextData,
};
