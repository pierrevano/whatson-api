const fs = require("fs");
const path = require("path");

const { config } = require("../config");

const logErrors = (errorCounter, error, item) => {
  const fileName = path.basename(__filename);

  let errorMsg = `errorCounter: ${errorCounter} - ${fileName} - ${item}: ${error}\n`;

  console.log(errorMsg);

  fs.appendFile("errors.log", errorMsg, (err) => {
    if (err) throw err;
  });

  errorCounter++;
  if (errorCounter > config.maxErrorCounter.default) {
    console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
    process.exit(1);
  }
};

module.exports = { logErrors };
