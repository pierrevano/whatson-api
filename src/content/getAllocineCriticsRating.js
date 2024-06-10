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
const getAllocineCriticsRating = async (allocineCriticsDetails) => {
  let allocineCriticInfo = null;

  try {
    const options = {
      headers: {
        "User-Agent": config.userAgent,
      },
    };

    const $ = await getCheerioContent(
      allocineCriticsDetails,
      options,
      "getAllocineCriticsRating",
    );

    const criticsRatingDetails = [];
    let sumRatings = 0;
    $(".js-anchor-link").each((_i, element) => {
      const rating = convertTitleToNumber(
        element.parent.children[0].attribs.title,
      );
      sumRatings += rating;
      criticsRatingDetails.push({
        critic_name: element.children[0].data,
        critic_rating: rating,
      });
    });

    const criticsNumber = criticsRatingDetails.length;
    const criticsRating =
      criticsNumber > 0
        ? parseFloat((sumRatings / criticsNumber).toFixed(1))
        : null;

    allocineCriticInfo = {
      criticsNumber: criticsNumber || null,
      criticsRating: criticsRating,
      criticsRatingDetails:
        criticsRatingDetails.length > 0 ? criticsRatingDetails : null,
    };
  } catch (error) {
    logErrors(error, allocineCriticsDetails, "getAllocineCriticsRating");
  }

  return allocineCriticInfo;
};

module.exports = { getAllocineCriticsRating };
