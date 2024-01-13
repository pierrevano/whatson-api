const shell = require("shelljs");

const { config } = require("./config");
const { getNodeVarsValues } = require("./getNodeVarsValues");

/**
 * It updates the IDs of the movies and tv shows in the database
 */
const updateIds = () => {
  // Set permission for script file
  shell.exec(`chmod +x ${config.getIdsFilePath}`);

  let environment = getNodeVarsValues.environment || "circleci";
  let item_type = getNodeVarsValues.item_type === "movie" ? "movie" : "tvshow";

  // Execute shell script
  shell.exec(`bash ${config.getIdsFilePath} ${environment} ${item_type}`);
};

module.exports = { updateIds };
