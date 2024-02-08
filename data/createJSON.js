const { getAllocineCriticInfo } = require("../src/getAllocineCriticInfo");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getAllocinePopularity } = require("../src/getAllocinePopularity");
const { getBetaseriesUsersRating } = require("../src/getBetaseriesUsersRating");
const { getImdbPopularity } = require("../src/getImdbPopularity");
const { getImdbUsersRating } = require("../src/getImdbUsersRating");
const { getMetacriticRating } = require("../src/getMetacriticRating");
const { getObjectByImdbId } = require("../src/getMojoBoxOffice");
const { getPlatformsLinks } = require("../src/getPlatformsLinks");
const { getRottenTomatoesRating } = require("../src/getRottenTomatoesRating");
const { getLetterboxdRating } = require("../src/getLetterboxdRating");
const { getSensCritiqueRating } = require("../src/getSensCritiqueRating");

/**
 * Asynchronously creates a JSON object with various movie details from different sources.
 * @param {Object} allocineCriticsDetails - The Allocine critics details data
 * @param {string} allocineURL - The Allocine URL
 * @param {string} allocineHomepage - The Allocine homepage URL
 * @param {string} allocineId - The Allocine ID
 * @param {string} betaseriesHomepage - The Betaseries homepage URL
 * @param {string} betaseriesId - The Betaseries ID
 * @param {string} imdbHomepage - The IMDB homepage URL
 * @param {string} imdbId - The IMDB ID
 * @param {boolean} isActive - The active status of the item
 * @param {string} item_type - The type of the item (e.g., movie, series)
 * @param {string} metacriticHomepage - The Metacritic homepage URL
 * @param {string} metacriticId - The Metacritic ID
 * @param {string} rottenTomatoesHomepage - The Rotten Tomatoes homepage URL
 * @param {string} rottenTomatoesId - The Rotten Tomatoes ID
 * @param {string} letterboxdHomepage - The Letterboxd homepage URL
 * @param {string} letterboxdId - The Letterboxd ID
 * @param {string} sensCritiqueHomepage - The SensCritique homepage URL
 * @param {string} sensCritiqueId - The SensCritique ID
 * @param {number} theMoviedbId - The MovieDB ID
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
  rottenTomatoesHomepage,
  rottenTomatoesId,
  letterboxdHomepage,
  letterboxdId,
  sensCritiqueHomepage,
  sensCritiqueId,
  mojoBoxOfficeArray,
  theMoviedbId
) => {
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const allocinePopularity = await getAllocinePopularity(allocineURL, item_type);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const betaseriesPlatformsLinks = await getPlatformsLinks(allocineHomepage, imdbHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);
  const imdbPopularity = await getImdbPopularity(imdbHomepage);
  const mojoValues = await getObjectByImdbId(mojoBoxOfficeArray, imdbId, item_type);
  const metacriticRating = await getMetacriticRating(metacriticHomepage, metacriticId);
  const rottenTomatoesRating = await getRottenTomatoesRating(rottenTomatoesHomepage, rottenTomatoesId);
  const letterboxdRating = await getLetterboxdRating(letterboxdHomepage, letterboxdId);
  const sensCritiqueRating = await getSensCritiqueRating(sensCritiqueHomepage, sensCritiqueId);

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
  const betaseriesObj =
    betaseriesId !== "null"
      ? {
          id: betaseriesId,
          url: betaseriesHomepage,
          users_rating: betaseriesUsersRating,
        }
      : null;

  /* Creating an object called imdbObj. */
  const imdbObj = {
    id: imdbId,
    url: imdbHomepage,
    users_rating: imdbUsersRating,
    popularity: imdbPopularity.popularity,
  };

  /* Creates a Metacritic object if the metacritic rating is not null. */
  const metacriticObj =
    metacriticRating !== null
      ? {
          id: metacriticRating.id,
          url: metacriticRating.url,
          users_rating: metacriticRating.usersRating,
          critics_rating: metacriticRating.criticsRating,
        }
      : null;

  /* Creates a Rotten Tomatoes object if the rotten_tomatoes rating is not null. */
  const rottenTomatoesObj =
    rottenTomatoesRating !== null
      ? {
          id: rottenTomatoesRating.id,
          url: rottenTomatoesRating.url,
          users_rating: rottenTomatoesRating.usersRating,
          critics_rating: rottenTomatoesRating.criticsRating,
        }
      : null;

  /* Creates a Letterboxd object if the letterboxd rating is not null. */
  const letterboxdObj =
    letterboxdRating !== null
      ? {
          id: letterboxdRating.id,
          url: letterboxdRating.url,
          users_rating: letterboxdRating.usersRating,
        }
      : null;

  /* Creates a SensCritique object if the sensCritique rating is not null. */
  const sensCritiqueObj =
    sensCritiqueRating !== null
      ? {
          id: sensCritiqueRating.id,
          url: sensCritiqueRating.url,
          users_rating: sensCritiqueRating.usersRating,
        }
      : null;

  const mojoObj =
    mojoValues !== null
      ? {
          rank: mojoValues.rank,
          url: mojoValues.url,
          lifetime_gross: mojoValues.lifetimeGross,
        }
      : null;

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
    rotten_tomatoes: rottenTomatoesObj,
    letterboxd: letterboxdObj,
    senscritique: sensCritiqueObj,
    mojo: mojoObj,
  };

  return data;
};

module.exports = createJSON;
