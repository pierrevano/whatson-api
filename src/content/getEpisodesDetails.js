const axios = require("axios");

const { config } = require("../config");
const {
  convertImdbDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { logErrors } = require("../utils/logErrors");

/**
 * Fetches the total number of seasons for a given IMDb title ID from the What's on? API.
 * @param {string} imdbId - The IMDb title ID.
 * @returns {number} - The total number of seasons, or undefined if an error occurs.
 * @throws {Error} - Throws an error if the response status is not 200.
 */
const getTotalSeasons = async (imdbId) => {
  try {
    const apiUrl = `${config.baseURLRemote}/?imdbId=${imdbId}&api_key=${config.internalApiKey}`;
    const response = await axios.get(apiUrl);

    // Check if the status code is 200
    if (response.status !== 200) {
      console.error(
        `Failed to fetch What's on? API data: status code ${response.status}`,
      );
      process.exit(1);
    }

    if (
      response.data &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      return response.data.results[0].seasons_number;
    }

    return undefined;
  } catch (error) {
    logErrors(error, imdbId, "getTotalSeasons");
  }
};

/**
 * Fetches episode details including ratings for a specific season from the IMDb homepage.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {number} season - The season number of the show.
 * @returns {Array<Object>} - Array of episode details for the specified season.
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

          // Fetch the rating relative to the found title element
          const episodeRating = $(element)
            .find(".ipc-rating-star--rating")
            .eq(titleIndex)
            .text()
            .trim();

          episodesDetails.push({
            season: season,
            episode: episodeNumber,
            title: episodeTitle,
            description: episodeDescription,
            id: episodeId,
            url: `${config.baseURLIMDB}${episodeId}/`,
            release_date: convertImdbDateToISOString(releaseDateText) || null,
            users_rating: parseFloat(episodeRating) || null,
          });
        });
    });

    /*
     * We cannot parse more than 50 episodes at once on IMDb with Cheerio, so I prefer to return `null`.
     * Ideally, it should be parsed with Puppeteer or Playwright to get all episodes.
     */
    if (episodesDetails.length === 50) episodesDetails = null;
  } catch (error) {
    logErrors(error, url, "parseImdbEpisodes");
  }

  return episodesDetails;
};

/**
 * Gathers IMDb episode rating details across all seasons for a given IMDb title ID.
 * @param {string} imdbId - The IMDb title ID.
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @returns {Array<Object>} - Array of episode details for all seasons of the show.
 */
const getEpisodesDetails = async (allocineHomepage, imdbId, imdbHomepage) => {
  if (allocineHomepage.includes(config.baseURLTypeFilms)) return null;

  let allEpisodesDetails = [];

  try {
    const totalSeasons = await getTotalSeasons(imdbId);

    if (totalSeasons !== undefined) {
      for (let season = 1; season <= totalSeasons; season++) {
        const seasonEpisodesDetails = await parseImdbEpisodes(
          imdbHomepage,
          season,
        );
        allEpisodesDetails = allEpisodesDetails.concat(seasonEpisodesDetails);
      }
    }
  } catch (error) {
    logErrors(error, imdbId, "getEpisodesDetails");
  }

  if (allEpisodesDetails.length === 0) allEpisodesDetails = null;

  return allEpisodesDetails;
};

module.exports = { getEpisodesDetails };
