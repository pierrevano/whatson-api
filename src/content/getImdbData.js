const { getCheerioContent } = require("../utils/getCheerioContent");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { logErrors } = require("../utils/logErrors");

const imdbLocaleRequestOptions = {
  headers: {
    "Accept-Language": "en-US,en;q=0.9",
  },
};

/**
 * Fetches IMDb page content and parses the NEXT_DATA payload.
 *
 * @param {string} imdbHomepage - The IMDb homepage URL of the item.
 * @returns {Promise<{ $: import("cheerio").CheerioAPI, nextData: object }>}
 */
const getImdbData = async (imdbHomepage) => {
  try {
    await getHomepageResponse(imdbHomepage, {
      serviceName: "IMDb",
      allowedStatuses: [200, 202],
      requestConfig: imdbLocaleRequestOptions,
    });

    const $ = await getCheerioContent(
      imdbHomepage,
      imdbLocaleRequestOptions,
      "getImdbData",
    );

    if (typeof $ !== "function") {
      throw new Error("IMDb page content is unavailable.");
    }

    const jsonText = $("#__NEXT_DATA__").html();

    if (!jsonText) {
      throw new Error("IMDb NEXT_DATA payload is missing.");
    }

    const nextData = JSON.parse(jsonText);

    if (!nextData || typeof nextData !== "object") {
      throw new Error("IMDb NEXT_DATA payload is invalid.");
    }

    return { $, nextData };
  } catch (error) {
    logErrors(error, imdbHomepage, "getImdbData");
    throw error;
  }
};

module.exports = { getImdbData };
