const { MongoClient, ServerApiVersion } = require("mongodb");

const { buildAppendIncludes } = require("../utils/buildAppendIncludes");
const { config } = require("../config");
const { filterEpisodesBySeason } = require("./filterEpisodesBySeason");
const { getPipelineByNames } = require("./getPipelineByNames");
const { getPipelineFromTVShow } = require("./getPipelineFromTVShow");
const { getPopularityFilters } = require("./getPopularityFilters");
const { getRatingsFilters } = require("./getRatingsFilters");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

/**
 * Builds and executes the Mongo aggregation pipeline that powers the public listing endpoints.
 * It normalises query parameters, constructs dynamic `$match` stages, attaches optional lookups,
 * and returns both the raw pipeline results and paging metadata used by the HTTP layer.
 *
 * @param {string|undefined} append_to_response - Comma-separated list of extra fields to include.
 * @param {string|undefined} directors_query - Comma-separated directors filter.
 * @param {string|undefined} genres_query - Comma-separated genres filter.
 * @param {string|undefined} networks_query - Comma-separated networks filter.
 * @param {string|undefined} production_companies_query - Comma-separated production companies filter.
 * @param {number|undefined} id_path - Numeric AlloCiné/TMDB identifier when fetching a single item.
 * @param {string|boolean|undefined} is_active_query - Flag indicating which activity states to include.
 * @param {string|boolean|undefined} is_adult_query - Flag indicating which adult content states to include.
 * @param {string|undefined} is_must_see_query - Filter for `must_see` items.
 * @param {string|undefined} is_users_certified_query - Filter for user certified badge.
 * @param {string|undefined} is_critics_certified_query - Filter for critics certified badge.
 * @param {string|undefined} item_type_query - Item type filters (e.g., "movie", "tvshow", "movie,tvshow").
 * @param {number|undefined} limit_query - Requested page size.
 * @param {string|undefined} minimum_ratings_query - Minimum ratings thresholds per source.
 * @param {number|undefined} page_query - Requested page number.
 * @param {string|undefined} platforms_query - Platform names used for SVOD filtering.
 * @param {string|undefined} popularity_filters_query - Popularity filters requested by the client.
 * @param {string|undefined} ratings_filters_query - Ratings filters requested by the client.
 * @param {string|undefined} release_date_query - Release date range filter.
 * @param {string|undefined} runtime_query - Runtime filter expressed in seconds.
 * @param {string|undefined} seasons_number_query - Seasons count filter for tvshows.
 * @param {string|number|undefined} filtered_seasons_query - Seasons to keep when trimming episode lists.
 * @param {string|undefined} status_query - Comma-separated list of show statuses to include.
 * @param {string|undefined} top_ranking_order_query - Desired ordering for IMDb top ranking (`asc` or `desc`).
 * @param {string|undefined} mojo_rank_order_query - Desired ordering for Box Office Mojo rank (`asc` or `desc`).
 * @returns {Promise<{ items: Array, limit: number, page: number, is_active_item: ({ is_active: boolean } | { $or: Array<object> }) }>} Aggregated items along with paging info and the resolved activity flag.
 */
const aggregateData = async (
  append_to_response,
  directors_query,
  genres_query,
  networks_query,
  production_companies_query,
  id_path,
  is_active_query,
  is_adult_query,
  is_must_see_query,
  is_users_certified_query,
  is_critics_certified_query,
  item_type_query,
  limit_query,
  minimum_ratings_query,
  page_query,
  platforms_query,
  popularity_filters_query,
  ratings_filters_query,
  release_date_query,
  runtime_query,
  seasons_number_query,
  filtered_seasons_query,
  status_query,
  top_ranking_order_query,
  mojo_rank_order_query,
) => {
  const appendIncludes = buildAppendIncludes(append_to_response);

  const critics_rating_details = appendIncludes("critics_rating_details");
  const directors_append = appendIncludes("directors");
  const directors =
    typeof directors_query !== "undefined" && directors_query
      ? directors_query
      : "";
  const episodes_details = appendIncludes("episodes_details");
  const production_companies_details = appendIncludes("production_companies");
  const genres_append = appendIncludes("genres");
  const genres =
    typeof genres_query !== "undefined" && genres_query ? genres_query : "";
  const networks_append = appendIncludes("networks");
  const networks =
    typeof networks_query !== "undefined" && networks_query
      ? networks_query
      : "";
  const platforms_links_append = appendIncludes("platforms_links");
  const production_companies =
    typeof production_companies_query !== "undefined" &&
    production_companies_query
      ? production_companies_query
      : "";
  const id = isNaN(id_path) ? "" : id_path;
  const is_active =
    typeof is_active_query !== "undefined" && is_active_query
      ? is_active_query
      : "true,false";
  const is_adult =
    typeof is_adult_query !== "undefined" && is_adult_query
      ? is_adult_query
      : false; // By default, we exclude items containing adult content.
  const is_must_see =
    typeof is_must_see_query !== "undefined" && is_must_see_query
      ? is_must_see_query
      : "true,false";
  const is_users_certified =
    typeof is_users_certified_query !== "undefined" && is_users_certified_query
      ? is_users_certified_query
      : "true,false";
  const is_critics_certified =
    typeof is_critics_certified_query !== "undefined" &&
    is_critics_certified_query
      ? is_critics_certified_query
      : "true,false";
  const item_type =
    typeof item_type_query !== "undefined" && item_type_query
      ? item_type_query
      : "movie,tvshow";
  const last_episode = appendIncludes("last_episode");
  const next_episode = appendIncludes("next_episode");
  const highest_episode = appendIncludes("highest_episode");
  const lowest_episode = appendIncludes("lowest_episode");
  const limit = isNaN(limit_query) ? config.limit : limit_query;
  const minimum_ratings =
    typeof minimum_ratings_query !== "undefined" && minimum_ratings_query
      ? minimum_ratings_query
      : "";
  const page = isNaN(page_query) ? config.page : page_query;
  const platforms =
    typeof platforms_query !== "undefined" && platforms_query
      ? platforms_query
      : "";
  const popularity_filters_query_value =
    typeof popularity_filters_query !== "undefined" && popularity_filters_query
      ? popularity_filters_query
      : "all";
  const popularity_filters = await getPopularityFilters(
    popularity_filters_query_value,
  );
  const ratings_filters_query_value =
    typeof ratings_filters_query !== "undefined" && ratings_filters_query
      ? ratings_filters_query
      : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const release_date =
    typeof release_date_query !== "undefined" && release_date_query
      ? release_date_query
      : "";
  const runtime_filter =
    typeof runtime_query !== "undefined" && runtime_query ? runtime_query : "";
  const seasons_number =
    typeof seasons_number_query !== "undefined" && seasons_number_query
      ? seasons_number_query
      : "";
  const filtered_seasons =
    typeof filtered_seasons_query !== "undefined" && filtered_seasons_query
      ? filtered_seasons_query
      : null;

  const status =
    typeof status_query !== "undefined" && status_query ? status_query : "";

  const parseSortOrder = (value) => {
    if (typeof value === "undefined" || value === null) {
      return null;
    }
    const normalized = String(value).toLowerCase();
    return normalized === "asc" || normalized === "desc" ? normalized : null;
  };

  const top_ranking_order = parseSortOrder(top_ranking_order_query);
  const has_top_ranking_order = top_ranking_order !== null;
  const top_ranking_direction =
    has_top_ranking_order && top_ranking_order === "desc" ? -1 : 1;

  const mojo_rank_order = parseSortOrder(mojo_rank_order_query);
  const has_mojo_rank_order = mojo_rank_order !== null;
  const mojo_rank_direction =
    has_mojo_rank_order && mojo_rank_order === "desc" ? -1 : 1;

  const addFields_popularity_and_ratings = {
    $addFields: {
      popularity_average: {
        $round: [{ $avg: popularity_filters }, 2],
      },
      ratings_average: {
        $round: [
          {
            $avg: ratings_filters,
          },
          1,
        ],
      },
      releaseDateAsDate: { $dateFromString: { dateString: "$release_date" } },
      sortAvgField: {
        $cond: [
          { $eq: [{ $avg: popularity_filters }, null] },
          Infinity,
          { $avg: popularity_filters },
        ],
      },
    },
  };

  let is_active_item = {
    is_active: is_active === "true" || is_active === true,
  };
  const is_active_all = { $or: [{ is_active: true }, { is_active: false }] };
  is_active_item =
    is_active === "true,false" || is_active === "false,true"
      ? is_active_all
      : is_active_item;

  let is_adult_item = {
    is_adult: is_adult === "true" || is_adult === true,
  };
  const is_adult_all = { $or: [{ is_adult: true }, { is_adult: false }] };
  is_adult_item =
    is_adult === "true,false" || is_adult === "false,true"
      ? is_adult_all
      : is_adult_item;

  let is_must_see_item = {
    "metacritic.must_see": is_must_see === "true" || is_must_see === true,
  };
  is_must_see_item =
    is_must_see === "true,false" || is_must_see === "false,true"
      ? is_active_all
      : is_must_see_item;

  let is_users_certified_item = {
    "rotten_tomatoes.users_certified":
      is_users_certified === "true" || is_users_certified === true,
  };
  is_users_certified_item =
    is_users_certified === "true,false" || is_users_certified === "false,true"
      ? is_active_all
      : is_users_certified_item;

  let is_critics_certified_item = {
    "rotten_tomatoes.critics_certified":
      is_critics_certified === "true" || is_critics_certified === true,
  };
  is_critics_certified_item =
    is_critics_certified === "true,false" ||
    is_critics_certified === "false,true"
      ? is_active_all
      : is_critics_certified_item;

  let item_type_default = { item_type: item_type };
  const item_type_all = {
    $or: [{ item_type: "movie" }, { item_type: "tvshow" }],
  };
  item_type_default =
    item_type === "movie,tvshow" || item_type === "tvshow,movie"
      ? item_type_all
      : item_type_default;

  const match_id = { $match: { id: id } };
  const match_item_type = {
    $match: {
      $and: [
        item_type_default,
        is_active_item,
        is_adult_item,
        is_must_see_item,
        is_users_certified_item,
        is_critics_certified_item,
      ],
    },
  };

  const minimum_ratings_sorted = minimum_ratings.includes(",")
    ? parseFloat(
        minimum_ratings
          .split(",")
          .map(parseFloat)
          .sort((a, b) => a - b)
          .join(","),
      )
    : parseFloat(minimum_ratings);

  const matchConditions = [
    {
      ratings_average: {
        $gte: !isNaN(minimum_ratings_sorted)
          ? minimum_ratings_sorted
          : -Infinity,
      },
    },
  ];

  const releaseDateRange = {};
  const releaseDateFilters = release_date
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (releaseDateFilters.includes("new")) {
    const sixOrEighteenMonthsAgo = new Date();
    item_type === "movie"
      ? sixOrEighteenMonthsAgo.setMonth(sixOrEighteenMonthsAgo.getMonth() - 6)
      : sixOrEighteenMonthsAgo.setMonth(sixOrEighteenMonthsAgo.getMonth() - 18);

    releaseDateRange.$gte = sixOrEighteenMonthsAgo;
  }

  const fromValue = releaseDateFilters.find((value) =>
    value.toLowerCase().startsWith("from:"),
  );
  if (fromValue && fromValue.length > 5) {
    const parsedDate = new Date(fromValue.slice(5));
    if (!Number.isNaN(parsedDate.getTime())) {
      releaseDateRange.$gte =
        releaseDateRange.$gte &&
        releaseDateRange.$gte.getTime() > parsedDate.getTime()
          ? releaseDateRange.$gte
          : parsedDate;
    }
  }

  const toValue = releaseDateFilters.find((value) =>
    value.toLowerCase().startsWith("to:"),
  );
  if (toValue && toValue.length > 3) {
    const parsedDate = new Date(toValue.slice(3));
    if (!Number.isNaN(parsedDate.getTime())) {
      releaseDateRange.$lte =
        releaseDateRange.$lte &&
        releaseDateRange.$lte.getTime() < parsedDate.getTime()
          ? releaseDateRange.$lte
          : parsedDate;
    }
  }

  if (Object.keys(releaseDateRange).length > 0) {
    matchConditions.push({
      releaseDateAsDate: releaseDateRange,
    });
  }

  if (runtime_filter) {
    const runtimeValues = runtime_filter
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (runtimeValues.length === 1) {
      matchConditions.push({ runtime: runtimeValues[0] });
    } else if (runtimeValues.length > 1) {
      const minRuntime = Math.min(...runtimeValues);
      const maxRuntime = Math.max(...runtimeValues);
      const runtimeRange = {};

      if (Number.isFinite(minRuntime)) {
        runtimeRange.$gte = minRuntime;
      }

      if (Number.isFinite(maxRuntime)) {
        runtimeRange.$lte = maxRuntime;
      }

      if (Object.keys(runtimeRange).length > 0) {
        matchConditions.push({ runtime: runtimeRange });
      }
    }
  }

  if (has_top_ranking_order) {
    matchConditions.push({ "imdb.top_ranking": { $type: "number" } });
    matchConditions.push({ "imdb.top_ranking": { $gt: 0 } });
  }

  if (has_mojo_rank_order) {
    matchConditions.push({ "mojo.rank": { $type: "number" } });
    matchConditions.push({ "mojo.rank": { $gt: 0 } });
  }

  const match_min_ratings_and_release_date = {
    $match: {
      $and: matchConditions,
    },
  };

  const limit_results = { $limit: limit };
  const skip_results = { $skip: (page - 1) * limit };
  const additionalSort = {};

  if (has_top_ranking_order) {
    additionalSort["imdb.top_ranking"] = top_ranking_direction;
  }

  if (has_mojo_rank_order) {
    additionalSort["mojo.rank"] = mojo_rank_direction;
  }

  const baseSort = {
    sortAvgField: 1,
    popularity_average: 1,
    ratings_average: -1,
    title: 1,
  };

  const sort_stage = {
    $sort: {
      ...additionalSort,
      ...baseSort,
    },
  };

  const remove_keys_base = {
    ...(critics_rating_details ? {} : { "allocine.critics_rating_details": 0 }),
    ...(directors_append ? {} : { directors: 0 }),
    ...(episodes_details ? {} : { episodes_details: 0 }),
    ...(genres_append ? {} : { genres: 0 }),
    ...(highest_episode ? {} : { highest_episode: 0 }),
    ...(last_episode ? {} : { last_episode: 0 }),
    ...(lowest_episode ? {} : { lowest_episode: 0 }),
    ...(networks_append ? {} : { networks: 0 }),
    ...(next_episode ? {} : { next_episode: 0 }),
    ...(platforms_links_append ? {} : { platforms_links: 0 }),
    ...(production_companies_details ? {} : { production_companies: 0 }),
  };

  const prune_keys_before_sort = Object.keys(remove_keys_base).length
    ? { $project: remove_keys_base }
    : null;

  // Dynamically build the remove_keys object based on query parameters
  const remove_keys = {
    $project: {
      releaseDateAsDate: 0,
      sortAvgField: 0,
      ...remove_keys_base,
    },
  };

  const facet = {
    $facet: {
      results: [
        addFields_popularity_and_ratings,
        match_min_ratings_and_release_date,
        sort_stage,
        remove_keys,
        skip_results,
        limit_results,
      ],
      total_results: [{ $count: "total_results" }],
    },
  };

  const pipeline = [];

  if (id) {
    pipeline.push(match_id);
  } else if (item_type === "tvshow") {
    getPipelineFromTVShow(
      config,
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
      item_type,
      pipeline,
      seasons_number,
      status,
    );
  } else {
    pipeline.push(match_item_type);
  }

  if (!id) {
    getPipelineByNames(
      directors,
      pipeline,
      "directors",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      genres,
      pipeline,
      "genres",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      platforms,
      pipeline,
      "platforms_links",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      networks,
      pipeline,
      "networks",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      production_companies,
      pipeline,
      "production_companies",
      is_active_item,
      is_adult_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
  }

  if (prune_keys_before_sort) {
    pipeline.push(prune_keys_before_sort);
  }

  pipeline.push(facet);

  const data = await collectionData.aggregate(pipeline);
  let items = await data.toArray();

  items = await filterEpisodesBySeason(items, filtered_seasons);

  return {
    items,
    limit,
    page,
    is_active_item,
  };
};

module.exports = { aggregateData };
