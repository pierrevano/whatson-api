const { config } = require("../config");
const { convertTitleToNumber } = require("../utils/convertTitleToNumber");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes the URL of a movie's critics page on AlloCiné, scrapes the page, and returns an object
 * containing the number of critics, the average rating, and the details of each critic's rating
 * @param allocineCriticsDetails - the URL of the page containing the critics' ratings
 * @returns An object with the following properties:
 * - criticsNumber: number of critics
 * - criticsRating: average rating of critics
 * - criticsRatingDetails: array of objects with the following properties:
 *   - criticName: name of the critic
 *   - criticRating: rating of the critic
 */
const getAllocineCriticInfo = async (allocineCriticsDetails) => {
  let allocineCriticInfo = null;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    const $ = await getCheerioContent(allocineCriticsDetails, options, "getAllocineCriticInfo");

    let criticsRatingDetails;
    criticsRatingDetails = $(".js-anchor-link")
      .map((_i, element) => [
        {
          critic_name: element.children[0].data,
          critic_rating: convertTitleToNumber(element.parent.children[0].attribs.title),
        },
      ])
      .get();
    if (criticsRatingDetails.length === 0) criticsRatingDetails = null;

    let sum = 0;
    $(".js-anchor-link")
      .map((_i, element) => (sum += convertTitleToNumber(element.parent.children[0].attribs.title)))
      .get();

    let criticsRating;
    let criticsRatingLength;
    criticsRatingLength = $(".js-anchor-link").length;
    if (criticsRatingLength === 0) criticsRatingLength = null;
    criticsRating = criticsRatingLength === null ? null : parseFloat((sum / criticsRatingLength).toFixed(1));

    allocineCriticInfo = {
      criticsNumber: criticsRatingLength,
      criticsRating: criticsRating,
      criticsRatingDetails: criticsRatingDetails,
    };
  } catch (error) {
    logErrors(error, allocineCriticsDetails, "getAllocineCriticInfo");
  }

  return allocineCriticInfo;
};

module.exports = { getAllocineCriticInfo };