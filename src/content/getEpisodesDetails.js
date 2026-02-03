const he = require("he");

const { config } = require("../config");
const {
  convertImdbDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { formatDate } = require("../utils/formatDate");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { getImdbRating } = require("./getImdbRating");
const { getSeasonsNumber } = require("../content/getSeasonsNumber");
const { logErrors } = require("../utils/logErrors");
const { processEpisodesPagination } = require("./processEpisodesPagination");
const { sortEpisodes } = require("../utils/sortEpisodes");
const { writeItems } = require("../utils/writeItems");

/**
 * Parses episode details for a specific season of a tvshow from its IMDb homepage.
 * @param {string} imdbHomepage - The IMDb homepage URL for the tvshow.
 * @param {number} season - The season number to retrieve episode details for.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of episode detail objects (empty when none are found).
 */
const parseImdbEpisodes = async (imdbHomepage, season) => {
  let episodesDetails = [];
  let paginationCursor = null;
  let totalEpisodes = null;
  const url = `${imdbHomepage}episodes?season=${season}`;

  try {
    const $ = await getCheerioContent(url, undefined, "parseImdbEpisodes");

    const jsonText = $("#__NEXT_DATA__").html();
    const nextData = JSON.parse(jsonText);

    const section = nextData?.props?.pageProps?.contentData?.section;
    const items = section?.episodes?.items;
    const endCursor = section?.episodes?.endCursor;
    paginationCursor = endCursor || null;
    totalEpisodes = section?.episodes?.total;

    if (!Array.isArray(items)) {
      return { episodesDetails, paginationCursor, totalEpisodes };
    }

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

  return { episodesDetails, paginationCursor, totalEpisodes };
};

/**
 * Fetches episode details including ratings for all seasons of a tvshow using IMDb and What's On API data.
 * Prefers the season count returned by `getImdbRating`; falls back to TMDB-derived totals when unavailable.
 * @param {string} allocineHomepage - The AlloCiné homepage URL for the tvshow.
 * @param {string} imdbHomepage - The IMDb homepage URL for the tvshow.
 * @param {string} imdbId - The IMDb title ID for the tvshow.
 * @param {object} data - The TMDB API response data for the item (used when IMDb doesn’t expose the season count).
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
  let shouldProcessPagination = false;

  try {
    let totalSeasons = null;

    if (config.specialItems.includes(imdbId)) {
      const { seasonsNumber: imdbSeasonsNumber } =
        await getImdbRating(imdbHomepage);

      if (imdbSeasonsNumber != null) {
        totalSeasons = imdbSeasonsNumber;
      }
    }

    if (!totalSeasons) {
      totalSeasons = await getSeasonsNumber(allocineHomepage, data);
    }

    if (!totalSeasons || totalSeasons < 1) return null;

    const maxParallelSeasonRequests = config.maxParallelSeasonRequests;
    let paginationCursor = null;

    for (
      let season = 1;
      season <= totalSeasons;
      season += maxParallelSeasonRequests
    ) {
      const seasonsBatch = Array.from(
        {
          length: Math.min(
            maxParallelSeasonRequests,
            totalSeasons - season + 1,
          ),
        },
        (_, index) => season + index,
      );

      const batchResults = await Promise.all(
        seasonsBatch.map((seasonNumber) =>
          parseImdbEpisodes(imdbHomepage, seasonNumber),
        ),
      );

      batchResults.forEach((seasonEpisodesDetails, _) => {
        if (
          paginationCursor === null &&
          seasonEpisodesDetails?.paginationCursor
        ) {
          paginationCursor = seasonEpisodesDetails.paginationCursor;
        }

        const hasMoreThanOnePage =
          seasonEpisodesDetails?.episodesDetails?.length === 50 &&
          seasonEpisodesDetails?.totalEpisodes > 50;

        episodesDetails.push(...seasonEpisodesDetails.episodesDetails);

        if (hasMoreThanOnePage) {
          shouldProcessPagination = true;
        }
      });
    }

    if (shouldProcessPagination) {
      episodesDetails = await processEpisodesPagination(
        episodesDetails,
        imdbId,
        paginationCursor,
      );
    } else {
      episodesDetails = sortEpisodes(episodesDetails);
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
