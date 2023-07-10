/* Importing the libraries that are needed for the script to work. */
const axios = require("axios");

const config = {
  metacriticURLCheck: false,
};

const isLowerCase = require("../src/utils/isLowerCase");

/**
 * Checks the given document object for missing or undefined keys and values, and other errors.
 * @param {string} allocineHomepage - The complete URL of the Allocine page being checked.
 * @param {Array} keysArray - An array of keys to check for in the document object.
 * @param {boolean} isDocumentHasInfo - A boolean indicating whether the document object has the necessary information.
 * @param {object} document - The document object to check.
 * @returns None
 */
const controlData = async (allocineHomepage, keysArray, isDocumentHasInfo, document, item_type) => {
  try {
    const idsToExclude = [8400, 8683, 10276, 19684, 20884, 21855, 22832, 24799, 27986, 28106, 28107, 28117];

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && !document.hasOwnProperty(`${key}`)) {
        console.log(`Missing ${key} for ${allocineHomepage}`);
        process.exit(1);
      }
    });

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && typeof document[key] === "undefined") {
        console.log(`Undefined ${key} for ${allocineHomepage}`);
        process.exit(1);
      }
    });

    if (document.title === null) {
      console.log(`Missing title for ${allocineHomepage}`);
      process.exit(1);
    }

    if (document.image === null) {
      console.log(`Missing image for ${allocineHomepage}`);
      process.exit(1);
    }

    if (document.item_type === "tvshow" && document.status === null) {
      if (!idsToExclude.includes(document.allocine.id)) {
        console.log(`Missing status for ${allocineHomepage}`);
        process.exit(1);
      }
    }

    if (Object.keys(document.imdb).length !== 4) {
      console.log(`IMDb obj length is ${Object.keys(document.imdb).length} for ${allocineHomepage}`);
      process.exit(1);
    }

    if (document.allocine.critics_rating_details !== null) {
      const allocineKeys = Object.keys(document.allocine.critics_rating_details[0]);
      allocineKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          console.log(`Is not lowercase for ${allocineHomepage}`);
          process.exit(1);
        }
      });
    }

    if (document.metacritic !== null && document.metacritic.critics_rating_details !== null) {
      const metacriticKeys = Object.keys(document.metacritic.critics_rating_details[0]);
      metacriticKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          console.log(`Is not lowercase for ${allocineHomepage}`);
          process.exit(1);
        }
      });
    }

    if (config.metacriticURLCheck) {
      if (document.metacritic !== null) {
        const { status } = await axios(document.metacritic.url);
        if (status !== 200) {
          console.log(`Broken link for ${allocineHomepage}`);
          process.exit(1);
        }
      }
    }

    if (document.metacritic !== null) {
      if (document.metacritic.users_rating < 0 || document.metacritic.users_rating > 10) {
        console.log(`Wrong Metacritic users rating for ${allocineHomepage}`);
        process.exit(1);
      }
    }

    if ((document.item_type !== "movie" && document.item_type !== "tvshow") || document.item_type !== item_type) {
      console.log(`Wrong item_type for ${allocineHomepage}`);
      process.exit(1);
    }

    if (document.is_active !== true && document.is_active !== false) {
      console.log(`Wrong is_active for ${allocineHomepage}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`controlData - ${allocineHomepage}: ${error}`);
    process.exit(1);
  }
};

module.exports = { controlData };
