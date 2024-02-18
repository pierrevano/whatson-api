const { config } = require("./config");
const { getNodeVarsValues } = require("./getNodeVarsValues");
const { getCheerioContent } = require("./utils/getCheerioContent");
const { logErrors } = require("./utils/logErrors");

const fetchAndCheckItemCount = async (index) => {
  const baseURLAllocineType = getNodeVarsValues.item_type === "movie" ? config.baseURLAllocineFilms : config.baseURLAllocineSeries;
  const baseURLType = getNodeVarsValues.item_type === "movie" ? config.baseURLTypeFilms : config.baseURLTypeSeries;

  const countItems = await getAllocineItemsNumber(baseURLAllocineType, baseURLType, index);

  if (countItems < 15) {
    console.error(`Found ${countItems} items. Something is wrong on AlloCiné, aborting.`);
    process.exit(1);
  }
};

const getAllocineItemsNumber = async (baseURLAllocineType, baseURLType, index) => {
  let countItems = 0;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    const url = `${baseURLAllocineType}${index > 1 ? "?page=" + index : ""}`;
    $ = await getCheerioContent(`${url}`, options, "getAllocineItemsNumber");
    const links = $("a.meta-title-link");

    links.each((_i, link) => {
      const href = $(link).attr("href");

      if (href.includes(baseURLType)) {
        countItems++;
      }
    });
  } catch (error) {
    logErrors(error, baseURLAllocineType, "getAllocineItemsNumber");
  }

  return countItems;
};

module.exports = { fetchAndCheckItemCount };
