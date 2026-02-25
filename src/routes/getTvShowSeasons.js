const { buildAppendIncludes } = require("../utils/buildAppendIncludes");
const {
  buildSeasonsMetadata,
  filterEpisodesByRatingAndDate,
} = require("./tvshowHelpers");
const { config } = require("../config");
const { filterEpisodesBySeason } = require("./filterEpisodesBySeason");
const { parseMinimumRatings } = require("../utils/parseMinimumRatings");
const { parseReleaseDateRange } = require("../utils/parseReleaseDateRange");
const { sendInternalError, sendResponse } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const { sortEpisodes } = require("../utils/sortEpisodes");
const getInternalApiKey = require("./getInternalApiKey");
const getTvShowById = require("./getTvShowById");

const EPISODE_APPEND_FIELDS = [
  "highest_episode",
  "last_episode",
  "lowest_episode",
  "next_episode",
];

const buildAppendToResponseConfig = (appendToResponseRaw = "") => {
  const includes = buildAppendIncludes(appendToResponseRaw);

  return {
    includeRatingDistribution: includes("rating_distribution"),
    includeRatingDistributionEpisodes: includes("rating_distribution_episodes"),
    buildAppendedEpisodeFields: (tvShow) => {
      const appendedEpisodeFields = {};
      EPISODE_APPEND_FIELDS.forEach((field) => {
        if (includes(field)) {
          appendedEpisodeFields[field] = tvShow[field];
        }
      });

      return appendedEpisodeFields;
    },
  };
};

const getTvShowSeasons = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const idPath = Number(req.params.id);
    const appendToResponseRaw = String(req.query.append_to_response || "");
    const appendToResponseConfig =
      buildAppendToResponseConfig(appendToResponseRaw);

    const internal_api_key = await getInternalApiKey();

    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      path_id: idPath,
      new_relic_route: "getTvShowSeasons",
    });

    const tvShow = await getTvShowById(idPath, appendToResponseRaw);
    if (!tvShow) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }

    const seasons = buildSeasonsMetadata(tvShow, {
      includeRatingDistribution:
        appendToResponseConfig.includeRatingDistribution,
      includeRatingDistributionEpisodes:
        appendToResponseConfig.includeRatingDistributionEpisodes,
    });

    return sendResponse(res, 200, {
      id: tvShow.id,
      item_type: tvShow.item_type,
      title: tvShow.title,
      seasons_number: tvShow.seasons_number,
      seasons,
      ...appendToResponseConfig.buildAppendedEpisodeFields(tvShow),
    });
  } catch (error) {
    return sendInternalError(res, error);
  }
};

const getTvShowSeasonEpisodes = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const idPath = Number(req.params.id);
    const seasonNumber = Number(req.params.season_number);

    const minimumRatings = parseMinimumRatings(req.query.minimum_ratings);
    const releaseDateRange = parseReleaseDateRange(req.query.release_date);

    if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }

    const internal_api_key = await getInternalApiKey();

    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      path_id: idPath,
      season_number: seasonNumber,
      new_relic_route: "getTvShowSeasonEpisodes",
    });

    const tvShow = await getTvShowById(
      idPath,
      String(req.query.append_to_response || ""),
    );
    if (!tvShow) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }

    const [tvShowWithSeasonFilter] = await filterEpisodesBySeason(
      [{ ...tvShow }],
      seasonNumber,
    );

    let episodes = tvShowWithSeasonFilter.episodes_details || [];
    episodes = filterEpisodesByRatingAndDate(episodes, {
      minimumRatings,
      releaseDateRange,
    });
    episodes = sortEpisodes([...episodes]);

    return sendResponse(res, 200, {
      id: tvShow.id,
      item_type: tvShow.item_type,
      title: tvShow.title,
      season_number: seasonNumber,
      total_episodes: episodes.length,
      episodes,
    });
  } catch (error) {
    return sendInternalError(res, error);
  }
};

const getTvShowSeasonEpisodeDetails = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const idPath = Number(req.params.id);
    const seasonNumber = Number(req.params.season_number);
    const episodeNumber = Number(req.params.episode_number);

    const internal_api_key = await getInternalApiKey();

    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      path_id: idPath,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      new_relic_route: "getTvShowSeasonEpisodeDetails",
    });

    const tvShow = await getTvShowById(
      idPath,
      String(req.query.append_to_response || ""),
    );
    if (!tvShow) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }

    const sortedEpisodes = sortEpisodes([...(tvShow.episodes_details || [])]);
    const episode = sortedEpisodes.find(
      (item) => item.season === seasonNumber && item.episode === episodeNumber,
    );

    if (!episode) {
      return sendResponse(res, 404, {
        message: config.noMatchingItemsFoundMessage,
      });
    }

    return sendResponse(res, 200, {
      id: tvShow.id,
      item_type: tvShow.item_type,
      title: tvShow.title,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      episode,
    });
  } catch (error) {
    return sendInternalError(res, error);
  }
};

module.exports = {
  getTvShowSeasonEpisodeDetails,
  getTvShowSeasonEpisodes,
  getTvShowSeasons,
};
