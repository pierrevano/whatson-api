const sizeOf = require("probe-image-size");

const config = {
  defaultWidth: "500px",
  defaultHeight: "750px",

  maxSize: 400,
  tmdbBaseURL: "https://image.tmdb.org",
};

/**
 * Gets the dimensions of an image and returns an object with the width and height
 * of the image. If the image is too large, it will be resized to fit within the
 * maximum size specified in the configuration object.
 * @param {string} rawImage - the URL of the image to get the dimensions of
 * @returns {Promise<{width: number, height: number}>} - an object with the width and height of the image
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
