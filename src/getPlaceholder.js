const sizeOf = require("request-image-size");

const config = {
  defaultWidth: "576px",
  defaultHeight: "768px",

  maxSize: 500,
  compressionSize: 2,
  tmdbBaseURL: "https://image.tmdb.org",
};

/**
 * Gets the dimensions of an image and returns an object with the width and height.
 * If the image is larger than the maximum size allowed, it will be scaled down.
 * @param {string} rawImage - the URL of the image to get the dimensions of
 * @returns {Promise<{width: number, height: number}>} - an object with the width and height of the image
 * or an error message if the dimensions could not be retrieved.
 */
const getPlaceholder = async (rawImage) => {
  try {
    const dimensions = await sizeOf(rawImage);
    let width = rawImage && !rawImage.startsWith(config.tmdbBaseURL) && dimensions.width > config.maxSize ? parseInt(dimensions.width / (dimensions.width / config.maxSize)) : dimensions.width;
    let height = rawImage && !rawImage.startsWith(config.tmdbBaseURL) && dimensions.width > config.maxSize ? parseInt(dimensions.height / (dimensions.width / config.maxSize)) : dimensions.height;

    if (typeof width === "undefined") width = config.defaultWidth;
    if (typeof height === "undefined") height = config.defaultHeight;

    return { width, height };
  } catch (error) {
    console.log(`getPlaceholder - ${rawImage}: ${error}`);
  }
};

module.exports = { getPlaceholder };
