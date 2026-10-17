const { collectionData } = require("../utils/mongoClient");
const { config } = require("../config");
const { getBooleanFilters } = require("./utils/getBooleanFilters");
const { getEpisodeSortFields } = require("../utils/getEpisodeSortFields");
const { getPipelineByNames } = require("./getPipelineByNames");
const { getPipelineFromTVShow } = require("./getPipelineFromTVShow");
const { parseMinimumRatings } = require("../utils/parseMinimumRatings");
const { parseReleaseDateRange } = require("../utils/parseReleaseDateRange");
const { resolveLimit } = require("./utils/resolveLimit");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");
const { sendToNewRelic } = require("../utils/sendToNewRelic");
const getInternalApiKey = require("./getInternalApiKey");

/**
 * Returns paginated rated episodes that match the requested show, title search, rating, season, and release-date filters.
 *
 * @param {import("express").Request} req - Express request with filters and pagination.
 * @param {import("express").Response} res - Express response.
 * @returns {Promise<import("express").Response>} Resolves after the response is sent.
 */
const getRatedEpisodes = async (req, res) => {
  try {
    const api_key_query = req.query.api_key || "api_key_not_provided";
    req.query.api_key = api_key_query;

    const order = req.query.order === "asc" ? "asc" : "desc";
    const limit = resolveLimit(req.query.limit);
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

    const booleanFilters = getBooleanFilters(req.query);
    const is_active_item = booleanFilters.is_active;

    const internal_api_key = await getInternalApiKey();

    sendToNewRelic(req, api_key_query, internal_api_key, {
      ...req.query,
      new_relic_route: "getRatedEpisodes",
    });

    const pipeline = [{ $match: { $and: Object.values(booleanFilters) } }];

    getPipelineFromTVShow(
      config,
      "tvshow",
      pipeline,
      "",
      req.query.status || "",
    );

    getPipelineByNames(req.query.composers || "", pipeline, "composers");
    getPipelineByNames(req.query.directors || "", pipeline, "directors");
    getPipelineByNames(req.query.genres || "", pipeline, "genres");
    getPipelineByNames(req.query.platforms || "", pipeline, "platforms_links");
    getPipelineByNames(req.query.networks || "", pipeline, "networks");
    getPipelineByNames(
      req.query.production_companies || "",
      pipeline,
      "production_companies",
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

    const items = await collectionData
      .aggregate(pipeline, { maxTimeMS: config.queryMaxTimeMS })
      .toArray();
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
      config,
      is_active_item,
    );
  } catch (error) {
    return sendInternalError(res, error);
  }
};

module.exports = getRatedEpisodes;
