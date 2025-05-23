const { appendFile } = require("fs");
const axios = require("axios");
const axiosRetry = require("axios-retry").default;

const { config } = require("../config");
const { getNodeVarsValues } = require("./getNodeVarsValues");
const { logErrors } = require("./logErrors");

/**
 * Makes an API call to The Movie Database (TMDB) to retrieve information about a movie or tvshow.
 * @param {string} allocineHomepage - The URL of the AlloCiné page for the movie or tvshow.
 * @param {number} tmdbId - The ID of the movie or tvshow on TMDB.
 * @returns An object containing the response data and status code from the API call.
 */
const getTMDBResponse = async (allocineHomepage, tmdbId) => {
  try {
    const startTime = Date.now();

    const type = allocineHomepage.includes(config.baseURLTypeSeries)
      ? "tv"
      : "movie";
    const url = `${config.baseURLTMDBAPI}/${type}/${tmdbId}?api_key=${config.tmdbApiKey}&append_to_response=credits`;

    axiosRetry(axios, {
      retries: config.retries,
      retryDelay: () => config.retryDelay,
    });
    const options = { validateStatus: (status) => status < 500 };
    const { data, status } = await axios.get(url, options);

    const endTime = Date.now();
    const executionTime = endTime - startTime;
    console.log(
      `getTMDBResponse - ${url}:`,
      status,
      "- Execution time:",
      executionTime + "ms",
    );

    if (
      status !== 200 &&
      (getNodeVarsValues.get_ids !== "no_update_ids" ||
        getNodeVarsValues.is_not_active !== "no_active")
    ) {
      console.error("Something is wrong with The Movie Database API.");
      process.exit(1);
    } else if (
      status !== 200 &&
      getNodeVarsValues.get_ids === "no_update_ids" &&
      getNodeVarsValues.is_not_active === "no_active"
    ) {
      appendFile(
        "temp_error.log",
        `${new Date().toISOString()} - ${url}: ${status}\n`,
        () => {},
      );
    }

    return { data, status };
  } catch (error) {
    logErrors(error, allocineHomepage, "getTMDBResponse");
  }
};

module.exports = { getTMDBResponse };
