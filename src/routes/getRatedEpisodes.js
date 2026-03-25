const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("../config");
const { getEpisodeSortFields } = require("../utils/getEpisodeSortFields");
const { getPipelineByNames } = require("./getPipelineByNames");
const { getPipelineFromTVShow } = require("./getPipelineFromTVShow");
const { parseMinimumRatings } = require("../utils/parseMinimumRatings");
const { parseReleaseDateRange } = require("../utils/parseReleaseDateRange");
const {
  sendInternalError,
  sendRequest,
  sendResponse,
} = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const getInternalApiKey = require("./getInternalApiKey");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

/**
 * Builds a Mongo boolean match condition from a query value.
 *
 * @param {string|boolean|{ $or: Array<object> }|null|undefined} value - Query value.
 * @param {string|boolean} fallbackValue - Fallback when the query value is missing.
 * @param {string} key - Field to match.
 * @returns {object} Mongo match condition.
 */
const getBooleanMatch = (value, fallbackValue, key) => {
  const resolvedValue =
    typeof value !== "undefined" && value !== null && value !== ""
      ? value
      : fallbackValue;

  if (
    resolvedValue === "true,false" ||
    resolvedValue === "false,true" ||
    Array.isArray(resolvedValue?.$or)
  ) {
    return { $or: [{ [key]: true }, { [key]: false }] };
  }

  return { [key]: resolvedValue === "true" || resolvedValue === true };
};

/**
 * Returns paginated rated episodes that match the requested show, title search, rating, season, and release-date filters.
 *
 * @param {import("express").Request} req - Express request with filters and pagination.
 * @param {import("express").Response} res - Express response.
 * @returns {Promise<void>} Resolves after the response is sent.
 */
const getRatedEpisodes = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const limit_raw = req.query.limit;
    const limit_provided = typeof limit_raw !== "undefined";
    const parsed_limit = Number(limit_raw);

    if (
      limit_provided &&
      (!Number.isFinite(parsed_limit) ||
        !Number.isInteger(parsed_limit) ||
        parsed_limit <= 0)
    ) {
      return sendResponse(res, 400, {
        message: "The limit must be a positive integer",
      });
    }

    if (limit_provided && parsed_limit > config.maxLimit) {
      return sendResponse(res, 400, {
        message: `The limit exceeds maximum allowed (${config.maxLimit}). Please reduce the limit.`,
      });
    }

    const order = req.query.order === "asc" ? "asc" : "desc";
    const limit = limit_provided ? parsed_limit : config.limit;
    const page = Number(req.query.page) || config.page;
    const minimumRatings = parseMinimumRatings(req.query.minimum_ratings);
    const parsedMinimumUsersRatingCount = Number(
      req.query.minimum_users_rating_count,
    );
    const minimumUsersRatingCount = Number.isFinite(
      parsedMinimumUsersRatingCount,
    )
      ? parsedMinimumUsersRatingCount
      : config.minimumEpisodeUsersRatingCount;
    const releaseDateRange = parseReleaseDateRange(req.query.release_date);
    const filteredSeasons = String(req.query.filtered_seasons || "")
      .split(",")
      .map((season) => Number.parseInt(season.trim(), 10))
      .filter((season) => !Number.isNaN(season));
    const titleQuery = String(req.query.title || "").trim();

    const is_active_item = getBooleanMatch(
      req.query.is_active,
      "true,false",
      "is_active",
    );
    const is_adult_item = getBooleanMatch(
      req.query.is_adult,
      false,
      "is_adult",
    );
    const is_must_see_item = getBooleanMatch(
      req.query.must_see,
      "true,false",
      "metacritic.must_see",
    );
    const is_users_certified_item = getBooleanMatch(
      req.query.users_certified,
      "true,false",
      "rotten_tomatoes.users_certified",
    );
    const is_critics_certified_item = getBooleanMatch(
      req.query.critics_certified,
      "true,false",
      "rotten_tomatoes.critics_certified",
    );

    const internal_api_key = await getInternalApiKey();

    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      new_relic_route: "getRatedEpisodes",
    });

    const pipeline = [];

    getPipelineFromTVShow(
      config,
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
      "tvshow",
      pipeline,
      "",
      req.query.status || "",
    );

    getPipelineByNames(
      req.query.directors || "",
      pipeline,
      "directors",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      req.query.genres || "",
      pipeline,
      "genres",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      req.query.platforms || "",
      pipeline,
      "platforms_links",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      req.query.networks || "",
      pipeline,
      "networks",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      req.query.production_companies || "",
      pipeline,
      "production_companies",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );

    pipeline.push({
      $project: {
        _id: 0,
        id: 1,
        item_type: 1,
        title: 1,
        image: 1,
        networks: 1,
        seasons_number: 1,
        status: 1,
        episodes_details: 1,
      },
    });
    pipeline.push({ $unwind: "$episodes_details" });

    const episodeMatchConditions = [
      { "episodes_details.release_date": { $ne: null } },
      { "episodes_details.users_rating": { $ne: null } },
      { "episodes_details.users_rating_count": { $ne: null } },
    ];

    if (minimumRatings !== null) {
      episodeMatchConditions.push({
        "episodes_details.users_rating": { $gte: minimumRatings },
      });
    }

    episodeMatchConditions.push({
      "episodes_details.users_rating_count": {
        $gte: minimumUsersRatingCount,
      },
    });

    if (filteredSeasons.length > 0) {
      episodeMatchConditions.push({
        "episodes_details.season": { $in: filteredSeasons },
      });
    }

    pipeline.push({
      $addFields: {
        episodeReleaseDateAsDate: {
          $dateFromString: {
            dateString: "$episodes_details.release_date",
          },
        },
      },
    });

    if (releaseDateRange.gte || releaseDateRange.lte) {
      const releaseDateMatch = {};

      if (releaseDateRange.gte) {
        releaseDateMatch.$gte = releaseDateRange.gte;
      }

      if (releaseDateRange.lte) {
        releaseDateMatch.$lte = releaseDateRange.lte;
      }

      episodeMatchConditions.push({
        episodeReleaseDateAsDate: releaseDateMatch,
      });
    }

    pipeline.push({
      $match: {
        $and: episodeMatchConditions,
      },
    });

    if (titleQuery) {
      const titleRegex = new RegExp(
        titleQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      pipeline.push({
        $match: {
          $or: [
            { title: titleRegex },
            { "episodes_details.title": titleRegex },
            { networks: titleRegex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        results: [
          {
            $sort: {
              ...getEpisodeSortFields("episodes_details.", order),
              title: 1,
              id: 1,
            },
          },
          {
            $project: {
              tvshow: {
                id: "$id",
                item_type: "$item_type",
                title: "$title",
                image: "$image",
                networks: "$networks",
                seasons_number: "$seasons_number",
                status: "$status",
              },
              season: "$episodes_details.season",
              episode: "$episodes_details.episode",
              title: "$episodes_details.title",
              description: "$episodes_details.description",
              id: "$episodes_details.id",
              url: "$episodes_details.url",
              release_date: "$episodes_details.release_date",
              users_rating: "$episodes_details.users_rating",
              users_rating_count: "$episodes_details.users_rating_count",
            },
          },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        total_results: [{ $count: "total_results" }],
      },
    });

    const items = await collectionData.aggregate(pipeline).toArray();
    const results = items[0]?.results || [];
    const total_results = items[0]?.total_results?.[0]?.total_results || 0;

    return sendRequest(
      req,
      res,
      {
        page,
        results,
        total_pages: Math.ceil(total_results / limit),
        total_results,
      },
      undefined,
      limit,
      config,
      is_active_item,
    );
  } catch (error) {
    return sendInternalError(res, error);
  }
};

module.exports = getRatedEpisodes;
