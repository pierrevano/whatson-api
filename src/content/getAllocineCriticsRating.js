const { convertTitleToNumber } = require("../utils/convertTitleToNumber");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * It takes an allocineCriticsDetails URL as an argument, and returns critics rating data extracted from the page.
 * It scrapes individual critic entries and computes the average rating, total count, and rating breakdown.
 *
 * @param {string} allocineCriticsDetails - The URL of the page containing the critics' ratings on allocine.fr
 * @returns {{
 *   criticsRating: number|null,
 *   criticsRatingCount: number|null,
 *   criticsRatingDetails: Array<{
 *     critic_name: string,
 *     critic_rating: number
 *   }> | null
 * }|null} An object with the average rating, count of critics, and detailed ratings per critic, or null if not available
 */
const getAllocineCriticsRating = async (allocineCriticsDetails) => {
  let allocineCriticInfo = null;

  try {
    const $ = await getCheerioContent(
      allocineCriticsDetails,
      undefined,
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

    const criticsRatingCount = criticsRatingDetails.length;
    const criticsRating =
      criticsRatingCount > 0
        ? parseFloat((sumRatings / criticsRatingCount).toFixed(2))
        : null;

    allocineCriticInfo = {
      criticsRating,
      criticsRatingCount: criticsRatingCount === 0 ? null : criticsRatingCount,
      criticsRatingDetails:
        criticsRatingDetails.length > 0 ? criticsRatingDetails : null,
    };
  } catch (error) {
    logErrors(error, allocineCriticsDetails, "getAllocineCriticsRating");
  }

  return allocineCriticInfo;
};

module.exports = { getAllocineCriticsRating };
