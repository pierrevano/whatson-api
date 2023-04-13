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
        process.exit(0);
      }
    });

    keysArray.forEach((key) => {
      if (isDocumentHasInfo && typeof document[key] === "undefined") {
        console.log(`Undefined ${key} for ${completeAllocineURL}`);
        process.exit(0);
      }
    });

    if (isDocumentHasInfo && document.title === null) {
      console.log(`Missing title for ${completeAllocineURL}`);
      process.exit(0);
    }

    if (isDocumentHasInfo && document.image === null) {
      console.log(`Missing image for ${completeAllocineURL}`);
      process.exit(0);
    }

    if (isDocumentHasInfo && document.item_type === "tvshow" && document.status === null) {
      if (!idsToExclude.includes(document.allocine.id)) {
        console.log(`Missing status for ${completeAllocineURL}`);
        process.exit(0);
      }
    }
  } catch (error) {
    console.log(`controlData - ${completeAllocineURL}: ${error}`);
  }
};

module.exports = { controlData };
