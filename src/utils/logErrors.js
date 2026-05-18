const { appendFileSync, readFileSync } = require("fs");

const { config } = require("../config");
const { getNodeVarsValues } = require("./getNodeVarsValues");
const { homepageStatusErrorCode } = require("./getHomepageResponse");
const { reportError } = require("./sendToNewRelic");

const TEMP_ERROR_LOG_PATH = "temp_error.log";

/**
 * Writes a message to stdout and persists the same message to the temporary log file.
 *
 * @param {string} message - Message to output and store.
 * @returns {void}
 */
const logAndAppendTempErrorLog = (message) => {
  console.log(message);
  appendFileSync(
    TEMP_ERROR_LOG_PATH,
    `${new Date().toISOString()} - ${message}\n`,
  );
};

/**
 * Logs and persists an error message when running locally, then returns the current log line count.
 *
 * @param {string} errorMsg - Serialized error message to record.
 * @returns {number|null} Current number of lines in the temporary log file, or null when logging is skipped.
 */
const appendErrorLog = (errorMsg) => {
  if (getNodeVarsValues.environment !== "local") {
    return null;
  }

  logAndAppendTempErrorLog(errorMsg);

  return readFileSync(TEMP_ERROR_LOG_PATH, "utf8").trim().split("\n").length;
};

/**
 * Logs a message and exits the current process with a failure status.
 *
 * @param {string} message - Message to print before exiting.
 * @returns {never}
 */
const exitWithMessage = (message) => {
  console.log(message);
  process.exit(1);
};

/**
 * Handles an application error by logging it, optionally reporting it, and then
 * either rethrowing or terminating the current process depending on the error type
 * and runtime configuration.
 *
 * @param {Error & { code?: string, response?: { status?: number } }} error - Captured error to process.
 * @param {string|number|null|undefined} item - Identifier or context associated with the failure.
 * @param {string} origin - Source of the error.
 * @returns {never}
 * @throws {Error} Rethrows errors that must be handled by the caller.
 */
const logErrors = (error, item, origin) => {
  const errorMsg = `${item} - ${origin} - ${error}`;
  const maxErrorLogLines = config.maxErrorLogLines;
  const statusCode = error?.response?.status;
  const tempErrorLogLines = appendErrorLog(errorMsg);

  reportError(null, null, statusCode ?? 500, new Error(errorMsg));

  if (
    error?.code === homepageStatusErrorCode &&
    process.env.SKIP_ITEM_ON_HOMEPAGE_STATUS_ERROR !== "false"
  ) {
    if (tempErrorLogLines !== null && tempErrorLogLines > maxErrorLogLines) {
      exitWithMessage(
        `Aborting because ${TEMP_ERROR_LOG_PATH} reached ${tempErrorLogLines} lines while SKIP_ITEM_ON_HOMEPAGE_STATUS_ERROR is enabled. Limit: ${maxErrorLogLines}. Last item: ${item}. Last homepage status error: ${error.message}`,
      );
    }

    throw error;
  }

  if (error instanceof RangeError) {
    exitWithMessage(
      `Error: ${error.message}. Failed to update first item: ${item}`,
    );
  }

  if (statusCode) {
    exitWithMessage(`Error - status code ${statusCode} - ${item}`);
  }

  exitWithMessage(errorMsg);
};

module.exports = { logAndAppendTempErrorLog, logErrors };
