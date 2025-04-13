const { config } = require("../config");
const {
  convertImdbDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { formatDate } = require("../utils/formatDate");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getWhatsonResponse } = require("../utils/getWhatsonResponse");
const { logErrors } = require("../utils/logErrors");

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

    let previousReleaseDate = null;

    $(".ipc-page-section section").each((_, element) => {
      $(element)
        .find(".ipc-title__text")
        .each((titleIndex, titleElement) => {
          // Skip this iteration if no episodes are found for the season (titleIndex is not a number)
          if (typeof titleIndex !== "number") return;

          // Extract the episode number from the title (assuming the format "S5.E10 ∙ Episode Title")
          const fullTitle = $(titleElement).text().trim();
          const episodeNumberMatch = fullTitle.match(/E(\d+)/);
          const episodeNumber = episodeNumberMatch
            ? parseInt(episodeNumberMatch[1], 10)
            : null;

          // Split the title to get the actual episode title after "∙"
          const [_, episodeTitle] =
            fullTitle.split("∙").map((part) => part.trim()) || null;

          // Extract episode description
          const episodeDescription =
            $(element)
              .find(".ipc-overflowText .ipc-html-content-inner-div")
              .eq(titleIndex)
              .text()
              .trim() || null;

          // Find the parent element that contains the href attribute
          const parentWithHref = $(titleElement).closest(".ipc-title a");
          const episodeIdMatch = parentWithHref.attr("href")
            ? parentWithHref.attr("href").match(/\/title\/(tt\d+)\//)
            : null;
          const episodeId = episodeIdMatch ? episodeIdMatch[1] : null;

          // Find the closest h4 and then get the sibling span for the release date
          const closestH4 = $(titleElement).closest("h4");
          const releaseDateText = closestH4
            .siblings("span")
            .first()
            .text()
            .trim();
          let releaseDate = convertImdbDateToISOString(releaseDateText) || null;

          // Ensure release dates are not decreasing
          if (
            releaseDate &&
            previousReleaseDate &&
            releaseDate < previousReleaseDate
          ) {
            releaseDate = null;
          } else if (releaseDate) {
            previousReleaseDate = releaseDate;
          }

          const ratingText = $(element)
            .find(".ipc-rating-star--rating")
            .eq(titleIndex)
            .text()
            .trim();

          const getUsersRating = (date, rating) => {
            if (!date) return null;
            return formatDate(date) >= formatDate(new Date())
              ? null
              : parseFloat(rating) || null;
          };

          episodesDetails.push({
            season,
            episode: episodeNumber,
            title: episodeTitle,
            description: episodeDescription,
            id: episodeId,
            url: episodeId ? `${config.baseURLIMDB}${episodeId}/` : null,
            release_date: releaseDate,
            users_rating: getUsersRating(releaseDate, ratingText),
          });
        });
    });
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
 * @returns {Promise<Array<Object>|null>} A promise that resolves to an array of episode details across all seasons, or null if no data is available.
 */
const getEpisodesDetails = async (allocineHomepage, imdbHomepage, imdbId) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let episodesDetails = [];

  try {
    const response = await getWhatsonResponse(imdbId);
    const totalSeasons =
      response && typeof response.seasons_number !== "undefined"
        ? response.seasons_number
        : null;

    if (totalSeasons) {
      for (let season = 1; season <= totalSeasons; season++) {
        const seasonEpisodesDetails = await parseImdbEpisodes(
          imdbHomepage,
          season,
        );

        episodesDetails = episodesDetails.concat(seasonEpisodesDetails);

        /*
         * We cannot parse more than 50 episodes at once on IMDb with Cheerio, so I prefer to return `null`.
         * Ideally, it should be parsed with Puppeteer or Playwright to get all episodes.
         */
        if (seasonEpisodesDetails.length === 50) {
          return null;
        }
      }
    }
  } catch (error) {
    logErrors(error, imdbId, "getEpisodesDetails");
  }

  if (episodesDetails.length === 0) episodesDetails = null;

  return episodesDetails;
};

module.exports = { getEpisodesDetails };
