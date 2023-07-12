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
 * @param {string} itemType - The item type (e.g. "movie" or "tvshow") that the document should have.
 * @returns {void}
 */

const idsToExclude = [8400, 8683, 10276, 19684, 20884, 21855, 22832, 24799, 27986, 28106, 28107, 28117];

const controlData = async (allocineHomepage, keysArray, isDocumentHasInfo, document, itemType) => {
  try {
    keysArray.forEach((key) => {
      if (isDocumentHasInfo && !document.hasOwnProperty(`${key}`)) {
        throw new Error(`Missing ${key} for ${allocineHomepage}`);
      }
    });

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && typeof document[key] === "undefined") {
        throw new Error(`Undefined ${key} for ${allocineHomepage}`);
      }
    });

    if (document.title === null) {
      throw new Error(`Missing title for ${allocineHomepage}`);
    }

    if (document.image === null) {
      throw new Error(`Missing image for ${allocineHomepage}`);
    }

    if (document.item_type === "tvshow" && document.status === null) {
      if (!idsToExclude.includes(document.allocine.id)) {
        throw new Error(`Missing status for ${allocineHomepage}`);
      }
    }

    if (Object.keys(document.imdb).length !== 4) {
      throw new Error(`IMDb obj length is ${Object.keys(document.imdb).length} for ${allocineHomepage}`);
    }

    if (document.allocine.critics_rating_details !== null) {
      const allocineKeys = Object.keys(document.allocine.critics_rating_details[0]);
      allocineKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          throw new Error(`Is not lowercase for ${allocineHomepage}`);
        }
      });
    }

    if (document.metacritic !== null && document.metacritic.critics_rating_details !== null) {
      const metacriticKeys = Object.keys(document.metacritic.critics_rating_details[0]);
      metacriticKeys.forEach((element) => {
        if (!isLowerCase(element)) {
          throw new Error(`Is not lowercase for ${allocineHomepage}`);
        }
      });
    }

    if (config.metacriticURLCheck) {
      if (document.metacritic !== null) {
        const { status } = await axios(document.metacritic.url);
        if (status !== 200) {
          throw new Error(`Broken link for ${allocineHomepage}`);
        }
      }
    }

    if (document.metacritic !== null) {
      if (document.metacritic.users_rating < 0 || document.metacritic.users_rating > 10) {
        throw new Error(`Wrong Metacritic users rating for ${allocineHomepage}`);
      }
    }

    if (document.item_type !== itemType) {
      throw new Error(`Wrong item_type for ${allocineHomepage}`);
    }

    if (document.is_active !== true && document.is_active !== false) {
      throw new Error(`Wrong is_active for ${allocineHomepage}`);
    }
  } catch (error) {
    throw new Error(`controlData - ${allocineHomepage}: ${error}`);
  }
};

module.exports = { controlData };
