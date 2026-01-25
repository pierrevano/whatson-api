const shell = require("shelljs");

const { config } = require("../config");
const { getNodeVarsValues } = require("../utils/getNodeVarsValues");

/**
 * It updates the IDs of the movies and tvshows in the database
 */
const updateIds = () => {
  // Set permission for script file
  shell.exec(`chmod +x ${config.getIdsFilePath}`);

  let environment = getNodeVarsValues.environment || "circleci";
  let item_type = getNodeVarsValues.item_type === "movie" ? "movie" : "tvshow";

  // Execute shell script
  const command = `bash ${config.getIdsFilePath} ${environment} ${item_type}`;
  console.log(`Running command: ${command}`);
  console.log(
    "----------------------------------------------------------------------------------------------------",
  );
  const result = shell.exec(command);
  if (result.code !== 0) {
    process.env.GET_IDS_ERRORS_FOUND = "1";
  }
};

module.exports = { updateIds };
