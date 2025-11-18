const { appendFile } = require("fs");

const { config } = require("../config");
const { getNodeVarsValues } = require("./getNodeVarsValues");
const { reportError } = require("./sendToNewRelic");

const isBetaseriesResource = (value = "") =>
  value.startsWith(config.baseURLBetaseriesFilm) ||
  value.startsWith(config.baseURLBetaseriesSerie);

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

  if (getNodeVarsValues.environment === "local") {
    appendFile(
      "temp_error.log",
      `${new Date().toISOString()} - ${errorMsg}\n`,
      () => {},
    );
  }

  if (
    errorMsg.includes("AxiosError: Request failed with status code 404") ||
    errorMsg.includes("Error: Failed to retrieve data.")
  ) {
    if (getNodeVarsValues.is_not_active === "active") {
      reportError(null, null, 404, new Error(errorMsg));
    }
  }

  if (error instanceof RangeError) {
    console.log(
      `Error: ${error.message}. Failed to update first item: ${item}`,
    );
    process.exit(1);
  }

  if (error.response && error.response.status >= 500) {
    console.log(`Error - status code ${error.response.status} - ${item}`);
    if (item && !isBetaseriesResource(item)) {
      process.exit(1);
    }
  }

  if (isErrorPresent(errorMsg, error, item)) {
    console.log(errorMsg);
    if (
      errorMsg &&
      !(
        isBetaseriesResource(errorMsg) ||
        (errorMsg.includes("403") && errorMsg.includes("getMetacriticRating"))
      )
    ) {
      process.exit(1);
    }
  }
};

module.exports = { logErrors };
