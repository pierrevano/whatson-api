const { appendFile } = require("fs");

const { config } = require("../config");

function isErrorPresent(errorMsg, error, item) {
  const errorList = [
    "AxiosError: Request failed with status code 404",
    "TypeError: $ is not a function",
    "Error [ERR_FR_TOO_MANY_REDIRECTS]: Maximum number of redirects exceeded",
  ];

  if (
    errorMsg.includes(
      "Error [ERR_FR_TOO_MANY_REDIRECTS]: Maximum number of redirects exceeded",
    )
  ) {
    console.log(`Error: ${error.message}. Skipping the item update: ${item}`);
  }

  // Check if errorMsg includes any error from errorList
  return !errorList.some((error) => errorMsg.includes(error));
}

const logErrors = (error, item, origin) => {
  let errorMsg = `${item} - ${origin} - ${error}`;

  if (
    errorMsg.includes("AxiosError: Request failed with status code 404") ||
    errorMsg.includes("Error: Failed to retrieve data.")
  ) {
    appendFile(
      "temp_error.log",
      `${new Date().toISOString()} - ${errorMsg}\n`,
      () => {},
    );
  }

  if (error instanceof RangeError) {
    console.log(
      `Error: ${error.message}. Failed to update first item: ${item}`,
    );
    process.exit(1);
  }

  if (error.response && error.response.status >= 500) {
    console.log(`Error - status code ${error.response.status} - ${item}`);
    if (
      item &&
      !(
        item.startsWith(config.baseURLBetaseriesFilm) ||
        item.startsWith(config.baseURLBetaseriesSerie)
      )
    ) {
      process.exit(1);
    }
  }

  if (isErrorPresent(errorMsg, error, item)) {
    console.log(errorMsg);
    if (
      errorMsg &&
      !(
        errorMsg.startsWith(config.baseURLBetaseriesFilm) ||
        errorMsg.startsWith(config.baseURLBetaseriesSerie) ||
        (errorMsg.includes("403") && errorMsg.includes("getMetacriticRating"))
      )
    ) {
      process.exit(1);
    }
  }
};

module.exports = { logErrors };
