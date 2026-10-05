const { getImdbData } = require("../utils/getImdbData");

/**
 * Retrieves item credits.
 * @param {string} imdbHomepage - The IMDb homepage URL of the item.
 * @param {object} imdbData - IMDb data.
 * @param {object} data - The item metadata.
 * @returns {Promise<object|null>} Item credits when needed.
 */
const getImdbCredits = async (imdbHomepage, imdbData, data) => {
  if (data?.composers?.length && data?.directors?.length) return null;

  const { nextData } = await getImdbData(`${imdbHomepage}fullcredits/`);
  const categories = nextData.props?.pageProps?.contentData?.categories;

  const getNames = (categoryPattern, useCreditedName = false) => {
    const section = categories?.find((category) =>
      categoryPattern.test(category.name),
    )?.section;
    if (!section?.items?.length) return null;
    if (section.items.length < section.total) {
      return null;
    }

    const names = section.items
      .map((item) =>
        useCreditedName
          ? item.attributes?.match(/\(as ([^)]+)\)/)?.[1] || item.rowTitle
          : item.rowTitle,
      )
      .map((name) => name.trim());
    return [...new Set(names)];
  };

  const principalDirectors =
    imdbData.nextData.props?.pageProps?.aboveTheFoldData?.principalCreditsV2
      ?.filter((group) => /^Directors?$/.test(group.grouping?.text))
      .flatMap((group) => group.credits || [])
      .map((credit) => credit.name.nameText.text) || [];

  return {
    composers: getNames(/^Composers?$/, true),
    directors:
      getNames(/^Directors?$/) ||
      (principalDirectors.length ? [...new Set(principalDirectors)] : null),
  };
};

module.exports = { getImdbCredits };
