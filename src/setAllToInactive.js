/* Importing the libraries that are needed for the script to work. */
const shell = require("shelljs");

/* Importing the environment and item_type variables from the node_vars_values.js file. */
const { node_vars_values } = require("./node_vars_values");

const environment = node_vars_values.environment;
const item_type = node_vars_values.item_type;

/**
 * Sets all items in the specified file to inactive by modifying the file with sed commands.
 * @returns None
 */
const setAllToInactive = () => {
  if (!environment) {
    if (item_type === "movie") {
      shell.exec(`sed -i "s/,TRUE//g" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i "s/,FALSE//g" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i "/IS_ACTIVE$/! s/$/,FALSE/g" ./src/assets/films_ids.txt`);
    } else {
      shell.exec(`sed -i "s/,TRUE//g" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i "s/,FALSE//g" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i "/IS_ACTIVE$/! s/$/,FALSE/g" ./src/assets/series_ids.txt`);
    }
  } else {
    if (item_type === "movie") {
      shell.exec(`sed -i '' "s/,TRUE//g" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i '' "s/,FALSE//g" ./src/assets/films_ids.txt`);
      shell.exec(`sed -i '' "/IS_ACTIVE$/! s/$/,FALSE/g" ./src/assets/films_ids.txt`);
    } else {
      shell.exec(`sed -i '' "s/,TRUE//g" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i '' "s/,FALSE//g" ./src/assets/series_ids.txt`);
      shell.exec(`sed -i '' "/IS_ACTIVE$/! s/$/,FALSE/g" ./src/assets/series_ids.txt`);
    }
  }
};

module.exports = { setAllToInactive };
