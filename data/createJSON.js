const { getAllocineCriticInfo } = require("../src/getAllocineCriticInfo");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getAllocinePopularity } = require("../src/getAllocinePopularity");
const { getBetaseriesUsersRating } = require("../src/getBetaseriesUsersRating");
const { getImdbPopularity } = require("../src/getImdbPopularity");
const { getImdbUsersRating } = require("../src/getImdbUsersRating");
const { getMetacriticRating } = require("../src/getMetacriticRating");
const { getPlatformsLinks } = require("../src/getPlatformsLinks");

/**
 * Asynchronously creates a JSON object with various movie details from different sources.
 * @param {...} Various parameters required for fetching movie details from different sources
 * @returns {Promise<object>} A Promise which resolves to a JSON object containing movie details
 */
const createJSON = async (
  allocineCriticsDetails,
  allocineURL,
  allocineHomepage,
  allocineId,
  betaseriesHomepage,
  betaseriesId,
  imdbHomepage,
  imdbId,
  isActive,
  item_type,
  metacriticHomepage,
  metacriticId,
  theMoviedbId
) => {
  console.log(`Updating all item info...`);

  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const allocinePopularity = await getAllocinePopularity(allocineURL);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const betaseriesPlatformsLinks = await getPlatformsLinks(allocineHomepage, imdbHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);
  const imdbPopularity = await getImdbPopularity(imdbHomepage);
  const metacriticRating = await getMetacriticRating(imdbHomepage, metacriticHomepage, metacriticId);

  /* Creating an object called allocineObj. */
  const allocineObj = {
    id: allocineId,
    url: allocineHomepage,
    users_rating: allocineFirstInfo.allocineUsersRating,
    critics_rating: allocineCriticInfo.criticsRating,
    critics_number: allocineCriticInfo.criticsNumber,
    critics_rating_details: allocineCriticInfo.criticsRatingDetails,
    popularity: allocinePopularity.popularity,
  };

  /* Creating an object called betaseriesObj. */
  let betaseriesObj = null;
  if (betaseriesId !== "null") {
    betaseriesObj = {
      id: betaseriesId,
      url: betaseriesHomepage,
      users_rating: betaseriesUsersRating,
    };
  }

  /* Creating an object called imdbObj. */
  const imdbObj = {
    id: imdbId,
    url: imdbHomepage,
    users_rating: imdbUsersRating,
    popularity: imdbPopularity.popularity,
  };

  /**
   * Creates a Metacritic object if the metacritic rating is not null.
   * @param {object} metacriticRating - the Metacritic rating object
   * @returns {object | null} - the Metacritic object or null if the rating is null
   */
  let metacriticObj = null;
  if (metacriticRating !== null) {
    metacriticObj = {
      id: metacriticRating.id,
      url: metacriticRating.url,
      users_rating: metacriticRating.usersRating,
      critics_rating: metacriticRating.criticsRating,
      critics_number: metacriticRating.criticsNumber,
      critics_rating_details: metacriticRating.criticsRatingDetails,
    };
  }

  const data = {
    id: theMoviedbId,
    is_active: isActive,
    item_type: item_type,
    title: allocineFirstInfo.allocineTitle,
    image: allocineFirstInfo.allocineImage,
    platforms_links: betaseriesPlatformsLinks,
    seasons_number: allocineFirstInfo.seasonsNumber,
    status: allocineFirstInfo.status,
    trailer: allocineFirstInfo.trailer,
    allocine: allocineObj,
    betaseries: betaseriesObj,
    imdb: imdbObj,
    metacritic: metacriticObj,
  };

  return data;
};

module.exports = createJSON;
