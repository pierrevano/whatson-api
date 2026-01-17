const axios = require("axios");

const { config } = require("../config");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { isNotNull } = require("../utils/isNotNull");
const { logErrors } = require("../utils/logErrors");
const { logExecutionTime } = require("../utils/logExecutionTime");

/**
 * It takes a betaseriesHomepage and allocineHomepage as arguments, and returns the usersRating and usersRatingCount of the item.
 * It only attempts to fetch and parse the content if a valid betaseriesId is provided.
 *
 * @param {string} allocineHomepage - The URL of the item's page on allocine.fr
 * @param {string} betaseriesHomepage - The URL of the item's page on betaseries.com
 * @param {string} betaseriesId - Optional item identifier
 * @returns {{ usersRating: number|null, usersRatingCount: number|null }} An object containing the rating information, or null values if not available
 */
const getBetaseriesRating = async (
  allocineHomepage,
  betaseriesHomepage,
  betaseriesId,
) => {
  let usersRating = null;
  let usersRatingCount = null;

  try {
    if (isNotNull(betaseriesId)) {
      const options = {
        headers: {
          "User-Agent": generateUserAgent(),
        },
        validateStatus: (status) => status < 500,
      };

      const pattern = /window\.BSAppURI\s*=\s*['"]([^'"]+)['"]/;

      const rangeStartTime = Date.now();
      const rangeResponse = await axios.get(betaseriesHomepage, {
        ...options,
        headers: {
          ...options.headers,
          Range: "bytes=0-16383",
        },
      });

      if (rangeResponse.status !== 200 && rangeResponse.status !== 206) {
        throw new Error("Failed to retrieve data.");
      }

      const rangeHtml =
        typeof rangeResponse.data === "string"
          ? rangeResponse.data
          : String(rangeResponse.data);
      const rangeMatch = rangeHtml.match(pattern);
      let id = rangeMatch ? rangeMatch[1].split("/")[1] : null;

      logExecutionTime(
        "getBetaseriesRating",
        betaseriesHomepage,
        rangeResponse.status,
        rangeStartTime,
      );

      if (!id) {
        const startTime = Date.now();
        const response = await axios.get(betaseriesHomepage, {
          ...options,
          responseType: "stream",
        });

        if (response.status !== 200) {
          throw new Error("Failed to retrieve data.");
        }

        id = await new Promise((resolve, reject) => {
          let buffer = "";
          let resolved = false;

          response.data.setEncoding("utf8");
          response.data.on("data", (chunk) => {
            if (resolved) return;

            buffer += chunk;
            const match = buffer.match(pattern);

            if (match) {
              resolved = true;
              response.data.destroy();
              const betaseriesId = match[1].split("/")[1] || null;
              resolve(betaseriesId);
              return;
            }

            if (buffer.length > 4096) {
              buffer = buffer.slice(-4096);
            }
          });

          response.data.on("end", () => {
            if (!resolved) resolve(null);
          });

          response.data.on("error", (error) => {
            if (!resolved) reject(error);
          });
        });

        logExecutionTime(
          "getBetaseriesRating",
          betaseriesHomepage,
          response.status,
          startTime,
        );
      }

      if (!id) {
        throw new Error("Failed to fetch the BetaSeries ID.");
      }

      const isSeries = allocineHomepage.includes(config.baseURLTypeSeries);
      const baseURLBetaseriesAPI = isSeries
        ? config.baseURLBetaseriesAPISeries
        : config.baseURLBetaseriesAPIFilms;

      const url = `${baseURLBetaseriesAPI}?id=${id}&key=${config.betaseriesApiKey}`;
      const { data, status } = await axios.get(url, options);

      if (status !== 200) return { usersRating, usersRatingCount };

      const item = isSeries ? data.show : data.movie;

      if (item?.notes) {
        usersRating = parseFloat(item.notes.mean.toFixed(2));
        if (isNaN(usersRating)) usersRating = null;

        usersRatingCount = parseInt(item.notes.total, 10);
        if (isNaN(usersRatingCount)) usersRatingCount = null;
      }

      if (!usersRatingCount || usersRatingCount === 0)
        return { usersRating: null, usersRatingCount: null };
    }
  } catch (error) {
    logErrors(error, betaseriesHomepage, "getBetaseriesRating");
  }

  return { usersRating, usersRatingCount };
};

module.exports = { getBetaseriesRating };
