const { config } = require("./config");
const { getNodeVarsValues } = require("./getNodeVarsValues");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

const fetchAndCheckItemCount = async (index) => {
  const baseURLAllocineType = getNodeVarsValues.item_type === "movie" ? config.baseURLAllocineFilms : config.baseURLAllocineSeries;
  const baseURLType = getNodeVarsValues.item_type === "movie" ? config.baseURLTypeFilms : config.baseURLTypeSeries;

  const countItems = await getAllocineItemsNumber(baseURLAllocineType, baseURLType, index);

  if (countItems <= 5) {
    console.error(`Found ${countItems} items. Something is wrong on AlloCiné, aborting.`);
    process.exit(1);
  }
};

const getAllocineItemsNumber = async (baseURLAllocineType, baseURLType, index) => {
  let countItems = (errorCounter = 0);

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    const url = `${baseURLAllocineType}${index > 1 ? "?page=" + index : ""}`;
    $ = await getCheerioContent(`${url}`, options);
    const links = $("a.meta-title-link");

    links.each((_i, link) => {
      const href = $(link).attr("href");

      if (!href.includes(baseURLType)) {
        return false;
      }

      countItems++;
    });

    errorCounter = 0;
  } catch (error) {
    logErrors(errorCounter, error, baseURLAllocineType);
  }

  return countItems;
};

module.exports = { fetchAndCheckItemCount };
