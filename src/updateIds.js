/* Importing the libraries that are needed for the script to work. */
const shell = require("shelljs");

/* Importing the environment and item_type variables from the getNodeVarsValues.js file. */
const { getNodeVarsValues } = require("./getNodeVarsValues");

const environment = getNodeVarsValues.environment;
const item_type = getNodeVarsValues.item_type;

/**
 * It updates the ids of the movies and tv shows in the database
 */
const updateIds = () => {
  shell.exec("chmod +x ./data/getIds.sh");

  if (!environment) {
    if (item_type === "movie") {
      shell.exec("bash ./data/getIds.sh circleci movie");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./data/getIds.sh circleci tvshow");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  } else {
    if (item_type === "movie") {
      shell.exec("bash ./data/getIds.sh local movie");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./data/getIds.sh local tvshow");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  }
};

module.exports = { updateIds };
