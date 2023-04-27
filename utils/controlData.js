/* Importing the libraries that are needed for the script to work. */
const axios = require("axios");

const config = {
  metacriticURLCheck: false,
};

/**
 * Checks if the given input is in all lowercase letters.
 * @param {string} input - the string to check
 * @returns {boolean} - true if the input is all lowercase, false otherwise.
 */
function isLowerCase(input) {
  return input === String(input).toLowerCase();
}

/**
 * Controls the data for a given Allocine URL and checks if the necessary keys are present in the document object.
 * @param {string} completeAllocineURL - The complete URL of the Allocine page.
 * @param {Array} keysArray - An array of keys to check for in the document object.
 * @param {boolean} isDocumentHasInfo - A boolean indicating whether the document object has the necessary information.
 * @param {object} document - The document object to check for the necessary keys.
 * @returns None
 */
const controlData = async (completeAllocineURL, keysArray, isDocumentHasInfo, document) => {
  try {
    const idsToExclude = [8400, 8683, 10276, 19684, 20884, 21855, 22832, 24799, 27986, 28106, 28107, 28117];

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && !document.hasOwnProperty(`${key}`)) {
        console.log(`Missing ${key} for ${completeAllocineURL}`);
        process.exit(1);
      }
    });

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && typeof document[key] === "undefined") {
        console.log(`Undefined ${key} for ${completeAllocineURL}`);
        process.exit(1);
      }
    });

    if (isDocumentHasInfo && document.title === null) {
      console.log(`Missing title for ${completeAllocineURL}`);
      process.exit(1);
    }

    if (isDocumentHasInfo && document.image === null) {
      console.log(`Missing image for ${completeAllocineURL}`);
      process.exit(1);
    }

    if (isDocumentHasInfo && document.item_type === "tvshow" && document.status === null) {
      if (!idsToExclude.includes(document.allocine.id)) {
        console.log(`Missing status for ${completeAllocineURL}`);
        process.exit(1);
      }
    }

    if (isDocumentHasInfo && Object.keys(document.imdb).length !== 3) {
      console.log(`IMDb obj length !== 3 for ${completeAllocineURL}`);
      process.exit(1);
    }

    if (isDocumentHasInfo && document.allocine.critics_rating_details !== null) {
      const allocineKeys = Object.keys(document.allocine.critics_rating_details[0]);
      allocineKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          console.log(`Is not lowercase for ${completeAllocineURL}`);
          process.exit(1);
        }
      });
    }

    if (isDocumentHasInfo && document.metacritic !== null && document.metacritic.critics_rating_details !== null) {
      const metacriticKeys = Object.keys(document.metacritic.critics_rating_details[0]);
      metacriticKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          console.log(`Is not lowercase for ${completeAllocineURL}`);
          process.exit(1);
        }
      });
    }

    if (config.metacriticURLCheck) {
      if (isDocumentHasInfo && document.metacritic !== null) {
        const { status } = await axios(document.metacritic.url);
        if (status !== 200) {
          console.log(`Broken link for ${completeAllocineURL}`);
          process.exit(1);
        }
      }
    }
  } catch (error) {
    console.log(`controlData - ${completeAllocineURL}: ${error}`);
    process.exit(1);
  }
};

module.exports = { controlData };
