const {
  getAllocineCriticsRating,
} = require("../content/getAllocineCriticsRating");
const { getAllocineInfo } = require("../content/getAllocineInfo");
const { getAllocinePopularity } = require("../content/getAllocinePopularity");
const { getBetaseriesRating } = require("../content/getBetaseriesRating");
const { getEpisodesDetails } = require("../content/getEpisodesDetails");
const { getHighestRatedEpisode } = require("../content/getHighestRatedEpisode");
const { getImdbPopularity } = require("../content/getImdbPopularity");
const { getImdbRating } = require("../content/getImdbRating");
const { getLastEpisode } = require("../content/getLastEpisode");
const { getLetterboxdRating } = require("../content/getLetterboxdRating");
const { getLowestRatedEpisode } = require("../content/getLowestRatedEpisode");
const { getMetacriticRating } = require("../content/getMetacriticRating");
const { getNextEpisode } = require("../content/getNextEpisode");
const { getObjectByImdbId } = require("../content/getMojoBoxOffice");
const { getOriginalTitle } = require("../content/getOriginalTitle");
const { getPlatformsLinks } = require("../content/getPlatformsLinks");
const {
  getRottenTomatoesRating,
} = require("../content/getRottenTomatoesRating");
const { getSensCritiqueRating } = require("../content/getSensCritiqueRating");
const { getTheTvdbSlug } = require("../content/getTheTvdbSlug");
const { getTmdbRating } = require("../content/getTmdbRating");
const { getTraktRating } = require("../content/getTraktRating");
const { getTVTimeRating } = require("../content/getTVTimeRating");

/**
 * Asynchronously creates a JSON object with various movie details from different sources.
 * @param {Object} allocineCriticsDetails - The AlloCiné critics details
 * @param {string} allocineURL - The AlloCiné URL
 * @param {string} allocineHomepage - The AlloCiné homepage URL
 * @param {number} allocineId - The AlloCiné ID
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
 * @param {number} sensCritiqueId - The SensCritique ID
 * @param {string} traktHomepage - The Trakt homepage URL
 * @param {string} traktId - The Trakt ID
 * @param {number} tmdbId - TMDB ID
 * @param {string} tmdbHomepage - TMDB homepage URL
 * @param {string} tvtimeHomepage - TV Time homepage URL
 * @param {number} tvtimeId - TV Time ID
 * @param {string} theTvdbHomepage - TheTVDB homepage URL
 * @param {number} theTvdbId - TheTVDB ID
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
  tmdbId,
  tmdbHomepage,
  tvtimeHomepage,
  tvtimeId,
  theTvdbHomepage,
  theTvdbId,
) => {
  const allocineFirstInfo = await getAllocineInfo(
    allocineHomepage,
    betaseriesHomepage,
    tmdbId,
    false,
  );
  const originalTitle = await getOriginalTitle(allocineHomepage, tmdbId);
  const allocineCriticInfo = await getAllocineCriticsRating(
    allocineCriticsDetails,
  );
  const allocinePopularity = await getAllocinePopularity(
    allocineURL,
    item_type,
  );
  const {
    usersRating: usersRatingBetaseries,
    usersRatingCount: usersRatingCountBetaseries,
  } = await getBetaseriesRating(
    allocineHomepage,
    betaseriesHomepage,
    betaseriesId,
  );
  const platformsLinks = await getPlatformsLinks(
    betaseriesId,
    allocineHomepage,
    imdbId,
  );
  const { usersRating, usersRatingCount } = await getImdbRating(imdbHomepage);
  const imdbPopularity = await getImdbPopularity(
    imdbHomepage,
    allocineURL,
    item_type,
  );
  const episodesDetails = await getEpisodesDetails(
    allocineHomepage,
    betaseriesHomepage,
    imdbHomepage,
    imdbId,
    tmdbId,
  );
  const lastEpisode = await getLastEpisode(
    allocineHomepage,
    episodesDetails,
    tmdbId,
  );
  const nextEpisode = await getNextEpisode(
    allocineHomepage,
    betaseriesHomepage,
    episodesDetails,
    lastEpisode,
    tmdbId,
  );
  const highestEpisode = await getHighestRatedEpisode(
    allocineHomepage,
    episodesDetails,
  );
  const lowestEpisode = await getLowestRatedEpisode(
    allocineHomepage,
    episodesDetails,
  );
  const mojoValues = await getObjectByImdbId(
    mojoBoxOfficeArray,
    imdbId,
    item_type,
  );
  const metacriticRating = await getMetacriticRating(
    metacriticHomepage,
    metacriticId,
  );
  const rottenTomatoesRating = await getRottenTomatoesRating(
    rottenTomatoesHomepage,
    rottenTomatoesId,
  );
  const letterboxdRating = await getLetterboxdRating(
    letterboxdHomepage,
    letterboxdId,
  );
  const sensCritiqueRating = await getSensCritiqueRating(
    sensCritiqueHomepage,
    sensCritiqueId,
  );
  const tmdbRating = await getTmdbRating(
    allocineHomepage,
    tmdbHomepage,
    tmdbId,
  );
  const traktRating = await getTraktRating(
    allocineHomepage,
    traktHomepage,
    traktId,
  );
  const tvtimeRating = await getTVTimeRating(tvtimeHomepage, tvtimeId);
  const theTvdbSlug = await getTheTvdbSlug(allocineHomepage, theTvdbId);

  /* Creating an object called allocineObj. */
  const allocineObj =
    allocineFirstInfo?.allocineUsersRating || allocineCriticInfo?.criticsRating
      ? {
          id: allocineId,
          url: allocineHomepage,
          users_rating: allocineFirstInfo?.allocineUsersRating,
          users_rating_count: allocineFirstInfo?.allocineUsersRatingCount,
          critics_rating: allocineCriticInfo?.criticsRating,
          critics_rating_count: allocineCriticInfo?.criticsRatingCount,
          critics_rating_details: allocineCriticInfo?.criticsRatingDetails,
          popularity: allocinePopularity?.popularity,
        }
      : null;

  /* Creating an object called betaseriesObj. */
  const betaseriesObj = usersRatingBetaseries
    ? {
        id: betaseriesId,
        url: betaseriesHomepage,
        users_rating: usersRatingBetaseries,
        users_rating_count: usersRatingCountBetaseries,
      }
    : null;

  /* Creating an object called imdbObj. */
  const imdbObj = usersRating
    ? {
        id: imdbId,
        url: imdbHomepage,
        users_rating: usersRating,
        users_rating_count: usersRatingCount,
        popularity: imdbPopularity?.popularity,
      }
    : null;

  /* Creates a Letterboxd object if the letterboxd rating is not null. */
  const letterboxdObj = letterboxdRating?.usersRating
    ? {
        id: letterboxdRating.id,
        url: letterboxdRating.url,
        users_rating: letterboxdRating.usersRating,
        users_rating_count: letterboxdRating.usersRatingCount,
      }
    : null;

  /* Creates a Metacritic object if the metacritic rating is not null. */
  const metacriticObj =
    metacriticRating?.usersRating || metacriticRating?.criticsRating
      ? {
          id: metacriticRating.id,
          url: metacriticRating.url,
          users_rating: metacriticRating.usersRating,
          users_rating_count: metacriticRating.usersRatingCount,
          critics_rating: metacriticRating.criticsRating,
          critics_rating_count: metacriticRating.criticsRatingCount,
          must_see: metacriticRating.mustSee,
        }
      : null;

  /* Creates a Rotten Tomatoes object if the rottenTomatoes rating is not null. */
  const rottenTomatoesObj =
    rottenTomatoesRating?.usersRating || rottenTomatoesRating?.criticsRating
      ? {
          id: rottenTomatoesRating.id,
          url: rottenTomatoesRating.url,
          users_rating: rottenTomatoesRating.usersRating,
          critics_rating: rottenTomatoesRating.criticsRating,
          critics_rating_count: rottenTomatoesRating.criticsRatingCount,
          critics_rating_liked_count:
            rottenTomatoesRating.criticsRatingLikedCount,
          critics_rating_not_liked_count:
            rottenTomatoesRating.criticsRatingNotLikedCount,
        }
      : null;

  /* Creates a SensCritique object if the sensCritique rating is not null. */
  const sensCritiqueObj = sensCritiqueRating?.usersRating
    ? {
        id: sensCritiqueRating.id,
        url: sensCritiqueRating.url,
        users_rating: sensCritiqueRating.usersRating,
        users_rating_count: sensCritiqueRating.usersRatingCount,
      }
    : null;

  /* Creating an object called theTvdbObj. */
  const theTvdbObj = theTvdbSlug
    ? {
        id: theTvdbId,
        slug: theTvdbSlug,
        url: `${theTvdbHomepage}${theTvdbSlug}`,
      }
    : null;

  /* Creates a TMDB object if the TMDB rating is not null. */
  const tmdbObj = tmdbRating?.usersRating
    ? {
        id: tmdbRating.id,
        url: tmdbRating.url,
        users_rating: tmdbRating.usersRating,
        users_rating_count: tmdbRating.usersRatingCount,
      }
    : null;

  /* Creates a Trakt object if the trakt rating is not null. */
  const traktObj = traktRating?.usersRating
    ? {
        id: traktRating.id,
        url: traktRating.url,
        users_rating: traktRating.usersRating,
        users_rating_count: traktRating.usersRatingCount,
      }
    : null;

  /* Creates a TV Time object if the tvtime rating is not null. */
  const tvtimeObj = tvtimeRating?.usersRating
    ? {
        id: tvtimeRating.id,
        url: tvtimeRating.url,
        users_rating: tvtimeRating.usersRating,
      }
    : null;

  const mojoObj = mojoValues
    ? {
        rank: mojoValues.rank,
        url: mojoValues.url,
        lifetime_gross: mojoValues.lifetimeGross,
      }
    : null;

  const data = {
    id: tmdbId,
    item_type: item_type,
    is_active: isActive,
    title: allocineFirstInfo.allocineTitle,
    original_title: originalTitle,

    directors: allocineFirstInfo.directors,
    genres: allocineFirstInfo.genres,
    image: allocineFirstInfo.image,
    release_date: allocineFirstInfo?.releaseDate,
    tagline: traktRating?.tagline,
    trailer: allocineFirstInfo.trailer,

    episodes_details: episodesDetails,
    last_episode: lastEpisode,
    next_episode: nextEpisode,
    highest_episode: highestEpisode,
    lowest_episode: lowestEpisode,
    platforms_links: platformsLinks,
    seasons_number: allocineFirstInfo.seasonsNumber,
    status: allocineFirstInfo.status,

    allocine: allocineObj,
    betaseries: betaseriesObj,
    imdb: imdbObj,
    letterboxd: letterboxdObj,
    metacritic: metacriticObj,
    rotten_tomatoes: rottenTomatoesObj,
    senscritique: sensCritiqueObj,
    thetvdb: theTvdbObj,
    tmdb: tmdbObj,
    trakt: traktObj,
    tv_time: tvtimeObj,

    mojo: mojoObj,
  };

  return data;
};

module.exports = createJSON;
