const shell = require("shelljs");

const { getNodeVarsValues } = require("./getNodeVarsValues");

/**
 * It updates the ids of the movies and tv shows in the database
 */
const updateIds = () => {
  shell.exec("chmod +x ./data/getIds.sh");

  if (!getNodeVarsValues.environment) {
    if (getNodeVarsValues.item_type === "movie") {
      shell.exec("bash ./data/getIds.sh circleci movie");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./data/getIds.sh circleci tvshow");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  } else {
    if (getNodeVarsValues.item_type === "movie") {
      shell.exec("bash ./data/getIds.sh local movie");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./data/getIds.sh local tvshow");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  }
};

module.exports = { updateIds };
