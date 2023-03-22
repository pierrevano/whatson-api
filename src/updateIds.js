/* Importing the libraries that are needed for the script to work. */
const shell = require("shelljs");

/* Importing the environment and item_type variables from the node_vars_values.js file. */
const { node_vars_values } = require("./node_vars_values");

const environment = node_vars_values.environment;
const item_type = node_vars_values.item_type;

/**
 * It updates the ids of the movies and tv shows in the database
 */
const updateIds = () => {
  shell.exec("chmod +x ./utils/getIds.sh");

  if (!environment) {
    if (item_type === "movie") {
      shell.exec("bash ./utils/getIds.sh no_delete circleci movie");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i "/,null/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./utils/getIds.sh no_delete circleci tvshow");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i "/,null/d" ./src/assets/series_ids.txt`);
    }
  } else {
    if (item_type === "movie") {
      shell.exec("bash ./utils/getIds.sh delete local movie");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i '' "/,null/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./utils/getIds.sh delete local tvshow");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i '' "/,null/d" ./src/assets/series_ids.txt`);
    }
  }
};

module.exports = { updateIds };
