const { getAllocineCriticInfo } = require("./content/getAllocineCriticInfo");
const { getAllocineFirstInfo } = require("./content/getAllocineFirstInfo");
const { getAllocinePopularity } = require("./content/getAllocinePopularity");
const { getBetaseriesUsersRating } = require("./content/getBetaseriesUsersRating");
const { getImdbPopularity } = require("./content/getImdbPopularity");
const { getImdbUsersRating } = require("./content/getImdbUsersRating");
const { getLetterboxdRating } = require("./content/getLetterboxdRating");
const { getMetacriticRating } = require("./content/getMetacriticRating");
const { getObjectByImdbId } = require("./content/getMojoBoxOffice");
const { getPlatformsLinks } = require("./content/getPlatformsLinks");
const { getRottenTomatoesRating } = require("./content/getRottenTomatoesRating");
const { getSensCritiqueRating } = require("./content/getSensCritiqueRating");
const { getTraktRating } = require("./content/getTraktRating");

/**
 * Asynchronously creates a JSON object with various movie details from different sources.
 * @param {Object} allocineCriticsDetails - The AlloCiné critics details
 * @param {string} allocineURL - The AlloCiné URL
 * @param {string} allocineHomepage - The AlloCiné homepage URL
 * @param {string} allocineId - The AlloCiné ID
 * @param {string} betaseriesHomepage - The BetaSeries homepage URL
 * @param {string} betaseriesId - The BetaSeries ID
 * @param {string} imdbHomepage - The IMDb homepage URL
 * @param {string} imdbId - The IMDb ID
 * @param {boolean} isActive - The active status of the item
 * @param {string} item_type - The type of the item (e.g., movie, tvshow)
 * @param {string} metacriticHomepage - The Metacritic homepage URL
 * @param {string} metacriticId - The Metacritic ID
 * @param {string} rottenTomatoesHomepage - The Rotten Tomatoes homepage URL
 * @param {string} rottenTomatoesId - The Rotten Tomatoes ID
 * @param {string} letterboxdHomepage - The Letterboxd homepage URL
 * @param {string} letterboxdId - The Letterboxd ID
 * @param {string} sensCritiqueHomepage - The SensCritique homepage URL
 * @param {string} sensCritiqueId - The SensCritique ID
 * @param {string} traktHomepage - The Trakt homepage URL
 * @param {string} traktId - The Trakt ID
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
  traktHomepage,
  traktId,
  mojoBoxOfficeArray,
  theMoviedbId
) => {
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId, false);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const allocinePopularity = await getAllocinePopularity(allocineURL, item_type);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage, betaseriesId);
  const betaseriesPlatformsLinks = await getPlatformsLinks(betaseriesHomepage, betaseriesId, allocineHomepage, imdbId);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);
  const imdbPopularity = await getImdbPopularity(imdbHomepage);
  const mojoValues = await getObjectByImdbId(mojoBoxOfficeArray, imdbId, item_type);
  const metacriticRating = await getMetacriticRating(metacriticHomepage, metacriticId);
  const rottenTomatoesRating = await getRottenTomatoesRating(rottenTomatoesHomepage, rottenTomatoesId);
  const letterboxdRating = await getLetterboxdRating(letterboxdHomepage, letterboxdId);
  const sensCritiqueRating = await getSensCritiqueRating(sensCritiqueHomepage, sensCritiqueId);
  const traktRating = await getTraktRating(traktHomepage, traktId);

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

  /* Creates a Letterboxd object if the letterboxd rating is not null. */
  const letterboxdObj =
    letterboxdRating !== null
      ? {
          id: letterboxdRating.id,
          url: letterboxdRating.url,
          users_rating: letterboxdRating.usersRating,
        }
      : null;

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

  /* Creates a SensCritique object if the sensCritique rating is not null. */
  const sensCritiqueObj =
    sensCritiqueRating !== null
      ? {
          id: sensCritiqueRating.id,
          url: sensCritiqueRating.url,
          users_rating: sensCritiqueRating.usersRating,
        }
      : null;

  /* Creates a Trakt object if the trakt rating is not null. */
  const traktObj =
    traktRating !== null
      ? {
          id: traktRating.id,
          url: traktRating.url,
          users_rating: traktRating.usersRating,
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
    item_type: item_type,
    is_active: isActive,
    title: allocineFirstInfo.allocineTitle,
    image: allocineFirstInfo.allocineImage,
    trailer: allocineFirstInfo.trailer,
    platforms_links: betaseriesPlatformsLinks,
    seasons_number: allocineFirstInfo.seasonsNumber,
    status: allocineFirstInfo.status,
    allocine: allocineObj,
    betaseries: betaseriesObj,
    imdb: imdbObj,
    letterboxd: letterboxdObj,
    metacritic: metacriticObj,
    rotten_tomatoes: rottenTomatoesObj,
    senscritique: sensCritiqueObj,
    trakt: traktObj,
    mojo: mojoObj,
  };

  return data;
};

module.exports = createJSON;
