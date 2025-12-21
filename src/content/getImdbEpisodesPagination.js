const he = require("he");

const { config } = require("../config");
const {
  convertImdbDateToISOString,
} = require("../utils/convertFrenchDateToISOString");
const { formatDate } = require("../utils/formatDate");
const { generateUserAgent } = require("../utils/generateUserAgent");
const { httpClient } = require("../utils/httpClient");
const { logErrors } = require("../utils/logErrors");

const GRAPHQL_URL = config.baseURLImdbGraphql;
const OPERATION_NAME = config.imdbEpisodesPaginationOperation;
const PERSISTED_QUERY_HASH = config.imdbEpisodesPaginationHash;

const buildVariables = (imdbId, cursor) => ({
  after: cursor || null,
  const: imdbId,
  first: 5000000,
  originalTitleText: false,
  returnUrl: "",
  sort: { by: "EPISODE_THEN_RELEASE", order: "ASC" },
});

const getUsersRating = (date, rating) => {
  if (!date) return null;
  return formatDate(date) >= formatDate(new Date())
    ? null
    : parseFloat(rating) || null;
};

const extractNumber = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const extractPlot = (node) => {
  if (node?.plot?.plotText?.plainText) return node.plot.plotText.plainText;
  if (node?.plot?.outlineText?.plainText)
    return node.plot.outlineText.plainText;
  if (typeof node?.plot === "string") return node.plot;
  return null;
};

const mapEdgeToEpisode = (edge) => {
  const node = edge?.node;
  if (!node) return null;

  const episodeNumber =
    node?.series?.displayableEpisodeNumber?.episodeNumber?.displayableProperty
      ?.value?.plainText;
  const seasonNumber =
    node?.series?.displayableEpisodeNumber?.displayableSeason
      ?.displayableProperty?.value?.plainText;
  const season = extractNumber(seasonNumber);
  const episode = extractNumber(episodeNumber);

  if (season === null && episode === null) return null;

  const releaseDate = convertImdbDateToISOString(node.releaseDate);
  const usersRating = getUsersRating(
    releaseDate,
    node?.ratingsSummary?.aggregateRating,
  );
  const usersRatingCountRaw = extractNumber(node?.ratingsSummary?.voteCount);
  const usersRatingCount =
    usersRating && usersRatingCountRaw !== null ? usersRatingCountRaw : null;

  const plotText = extractPlot(node);

  return {
    season,
    episode,
    title: node?.titleText?.text ? he.decode(node.titleText.text) : null,
    description: plotText ? he.decode(plotText) : null,
    id: node.id || null,
    url: node.id ? `${config.baseURLIMDB}${node.id}/` : null,
    release_date: releaseDate,
    users_rating: usersRating,
    users_rating_count: usersRatingCount,
  };
};

const fetchEpisodesPage = async (imdbId, cursor) => {
  const params = {
    operationName: OPERATION_NAME,
    variables: JSON.stringify(buildVariables(imdbId, cursor)),
    extensions: JSON.stringify({
      persistedQuery: { sha256Hash: PERSISTED_QUERY_HASH, version: 1 },
    }),
  };

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": generateUserAgent(),
  };

  const response = await httpClient.get(GRAPHQL_URL, {
    params,
    headers,
    metadata: { origin: "getImdbEpisodesPagination" },
  });

  return response.data?.data?.title?.episodes?.episodes;
};

/**
 * Fetches episodes from IMDb's GraphQL endpoint starting after the provided cursor (endCursor from the first 50).
 * Returns normalized episodes matching the format used for the initial page scrape.
 *
 * @param {string} imdbId - IMDb title ID (e.g., "tt2044128").
 * @param {string|null} [afterCursor=null] - Cursor value to resume pagination; pass the endCursor when the first page held 50 episodes.
 * @returns {Promise<Array<Object>>} Normalised episode objects.
 */
const getImdbEpisodesPagination = async (imdbId, afterCursor = null) => {
  let episodes = [];

  try {
    let cursor = afterCursor;
    let hasNextPage = true;

    while (hasNextPage) {
      const page = await fetchEpisodesPage(imdbId, cursor);

      if (!page) {
        throw new Error("No page returned from fetchEpisodesPage");
      }

      const edges = page?.edges;

      if (!Array.isArray(edges) || edges.length === 0) break;

      edges.forEach((edge) => {
        const episode = mapEdgeToEpisode(edge);
        if (episode) episodes.push(episode);
      });

      hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
      const nextCursor = page?.pageInfo?.endCursor;

      if (!hasNextPage || !nextCursor) {
        break;
      }

      cursor = nextCursor;
    }
  } catch (error) {
    logErrors(error, imdbId, "getImdbEpisodesPagination");
  }

  return episodes;
};

module.exports = { getImdbEpisodesPagination };
