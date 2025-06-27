const he = require("he");

const { config } = require("../config");
const {
  convertImdbDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { formatDate } = require("../utils/formatDate");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getSeasonsNumber } = require("../content/getSeasonsNumber");
const { logErrors } = require("../utils/logErrors");
const { writeItems } = require("../utils/writeItems");

/**
 * Parses episode details for a specific season of a tvshow from its IMDb homepage.
 * @param {string} imdbHomepage - The IMDb homepage URL for the tvshow.
 * @param {number} season - The season number to retrieve episode details for.
 * @returns {Promise<Array<Object>|null>} A promise that resolves to an array of episode detail objects, or null if parsing is incomplete.
 */
const parseImdbEpisodes = async (imdbHomepage, season) => {
  let episodesDetails = [];
  const url = `${imdbHomepage}episodes?season=${season}`;

  try {
    const options = {
      headers: {
        "User-Agent": generateUserAgent(),
      },
    };
    const $ = await getCheerioContent(url, options, "parseImdbEpisodes");

    const jsonText = $("#__NEXT_DATA__").html();
    const nextData = JSON.parse(jsonText);

    const items =
      nextData?.props?.pageProps?.contentData?.section?.episodes?.items;

    if (!Array.isArray(items)) return episodesDetails;

    const getUsersRating = (date, rating) => {
      if (!date) return null;
      return formatDate(date) >= formatDate(new Date())
        ? null
        : parseFloat(rating) || null;
    };

    for (const episode of items) {
      const rawEpisode = parseInt(episode.episode, 10);

      let releaseDate = convertImdbDateToISOString(episode?.releaseDate);

      const usersRating = getUsersRating(releaseDate, episode.aggregateRating);
      const usersRatingCount = usersRating
        ? parseInt(episode.voteCount, 10) || null
        : null;

      episodesDetails.push({
        season,
        episode: isNaN(rawEpisode) ? null : rawEpisode,
        title: episode.titleText ? he.decode(episode.titleText) : null,
        description: episode.plot ? he.decode(episode.plot) : null,
        id: episode.id || null,
        url: episode.id ? `${config.baseURLIMDB}${episode.id}/` : null,
        release_date: releaseDate,
        users_rating: usersRating,
        users_rating_count: usersRatingCount,
      });
    }
  } catch (error) {
    logErrors(error, url, "parseImdbEpisodes");
  }

  return episodesDetails;
};

/**
 * Fetches episode details including ratings for all seasons of a tvshow using IMDb and What's On API data.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string} imdbHomepage - The IMDb homepage URL for the tvshow.
 * @param {string} imdbId - The IMDb title ID for the tvshow.
 * @param {object} data - The TMDB API response data for the item.
 * @returns {Promise<Array<Object>|null>} A promise that resolves to an array of episode details across all seasons, or null if no data is available.
 */
const getEpisodesDetails = async (
  allocineHomepage,
  imdbHomepage,
  imdbId,
  data,
) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let episodesDetails = [];

  try {
    const totalSeasons = await getSeasonsNumber(allocineHomepage, data);

    if (!totalSeasons || totalSeasons < 1) return null;

    for (let season = 1; season <= totalSeasons; season++) {
      const seasonEpisodesDetails = await parseImdbEpisodes(
        imdbHomepage,
        season,
      );

      episodesDetails.push(...seasonEpisodesDetails);

      /*
       * We cannot parse more than 50 episodes at once on IMDb with Cheerio, so I prefer to return `null`.
       * Ideally, it should be parsed with Puppeteer or Playwright to get all episodes.
       */
      if (seasonEpisodesDetails.length === 50) {
        return null;
      }
    }

    writeItems(
      allocineHomepage,
      JSON.stringify(episodesDetails, null, 2),
      "episodes_details",
    );
  } catch (error) {
    logErrors(error, imdbId, "getEpisodesDetails");
  }

  if (episodesDetails.length === 0) episodesDetails = null;

  return episodesDetails;
};

module.exports = { getEpisodesDetails };
