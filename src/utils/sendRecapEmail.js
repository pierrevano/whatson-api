const { appendFileSync, existsSync, readFileSync, unlinkSync } = require("fs");

const axios = require("axios");

const { config } = require("../config");
const { logAndAppendTempErrorLog } = require("./logErrors");

const RUN_SUMMARY_PATH = "temp_run_summary.json";
const TEST_RESULTS_PATH = "temp_test_results.json";
const TITLE = "What's on? API recap";

/**
 * Records the summary of a finished run so it can be reported once every run
 * has finished.
 *
 * @param {Object} summary - The values printed at the end of the run.
 * @returns {void}
 */
const appendRunSummary = (summary) => {
  appendFileSync(RUN_SUMMARY_PATH, `${JSON.stringify(summary)}\n`);
};

const readRuns = () =>
  existsSync(RUN_SUMMARY_PATH)
    ? readFileSync(RUN_SUMMARY_PATH, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

const readTests = () =>
  existsSync(TEST_RESULTS_PATH)
    ? JSON.parse(readFileSync(TEST_RESULTS_PATH, "utf8"))
    : null;

const escapeHtml = (text) =>
  `${text}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;");

const failuresHtml = (tests) => {
  const failures = (tests?.testResults || []).flatMap((suite) =>
    (suite.assertionResults || [])
      .filter((assertion) => assertion.status === "failed")
      .map(
        (assertion) =>
          `<li><b>${escapeHtml(assertion.fullName)}</b><pre>${escapeHtml((assertion.failureMessages || [])[0] || "")}</pre></li>`,
      ),
  );

  return failures.length ? `<ul>${failures.join("")}</ul>` : "";
};

const formatDuration = (ms) =>
  `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;

const buildHtml = (runs, tests) => `
  <h2>${TITLE}</h2>
  <table cellpadding="6" cellspacing="0" border="1">
    <tr><th>Item type</th><th>New or updated</th><th>Movies</th><th>Tvshows</th><th>Documents</th><th>Duration</th></tr>
    ${runs
      .map(
        (run) =>
          `<tr><td>${run.item_type}</td><td>${run.newOrUpdatedItems}</td><td>${run.movieCount}</td><td>${run.tvShowCount}</td><td>${run.documents}</td><td>${formatDuration(run.durationMs)}</td></tr>`,
      )
      .join("")}
  </table>
  <h3>Tests</h3>
  ${
    tests
      ? `<p>${tests.numPassedTests} passed, ${tests.numFailedTests} failed, out of ${tests.numTotalTests} in ${tests.numTotalTestSuites} suites.</p>${failuresHtml(tests)}`
      : "<p>No test results were recorded.</p>"
  }
`;

/**
 * Sends the recap of every recorded run to the configured webhook, then clears
 * the recorded values.
 *
 * @returns {Promise<void>}
 */
const sendRecapEmail = async () => {
  try {
    const runs = readRuns();
    const tests = readTests();
    await axios.post(config.webhooksURL, {
      subject: TITLE,
      html: buildHtml(runs, tests),
    });

    [RUN_SUMMARY_PATH, TEST_RESULTS_PATH].forEach((path) => {
      if (existsSync(path)) unlinkSync(path);
    });
  } catch (error) {
    logAndAppendTempErrorLog(`sendRecapEmail - ${error}`);
  }
};

if (require.main === module) sendRecapEmail();

module.exports = { appendRunSummary, sendRecapEmail };
