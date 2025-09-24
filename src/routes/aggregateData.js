const { MongoClient, ServerApiVersion } = require("mongodb");

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
 * @param {string|undefined} seasons_number_query - Seasons count filter for tvshows.
 * @param {string|number|undefined} filtered_seasons_query - Seasons to keep when trimming episode lists.
 * @param {string|undefined} status_query - Comma-separated list of show statuses to include.
 * @returns {Promise<{ items: Array, limit: number, page: number, is_active_item: { is_active: boolean } }>} Aggregated items along with paging info and the resolved activity flag.
 */
const aggregateData = async (
  append_to_response,
  directors_query,
  genres_query,
  networks_query,
  production_companies_query,
  id_path,
  is_active_query,
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
  seasons_number_query,
  filtered_seasons_query,
  status_query,
) => {
  const critics_rating_details =
    append_to_response &&
    append_to_response.split(",").includes("critics_rating_details")
      ? true
      : false;
  const directors =
    typeof directors_query !== "undefined" && directors_query
      ? directors_query
      : "";
  const episodes_details =
    append_to_response &&
    append_to_response.split(",").includes("episodes_details")
      ? true
      : false;
  const genres =
    typeof genres_query !== "undefined" && genres_query ? genres_query : "";
  const networks =
    typeof networks_query !== "undefined" && networks_query
      ? networks_query
      : "";
  const production_companies =
    typeof production_companies_query !== "undefined" &&
    production_companies_query
      ? production_companies_query
      : "";
  const id = isNaN(id_path) ? "" : id_path;
  const is_active =
    typeof is_active_query !== "undefined" && is_active_query
      ? is_active_query
      : true;
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
  const last_episode =
    append_to_response && append_to_response.split(",").includes("last_episode")
      ? true
      : false;
  const next_episode =
    append_to_response && append_to_response.split(",").includes("next_episode")
      ? true
      : false;
  const highest_episode =
    append_to_response &&
    append_to_response.split(",").includes("highest_episode")
      ? true
      : false;
  const lowest_episode =
    append_to_response &&
    append_to_response.split(",").includes("lowest_episode")
      ? true
      : false;
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

  const addFields_popularity_and_ratings = {
    $addFields: {
      popularity_average: { $avg: popularity_filters },
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

  if (release_date.split(",").includes("new")) {
    const sixOrEighteenMonthsAgo = new Date();
    item_type === "movie"
      ? sixOrEighteenMonthsAgo.setMonth(sixOrEighteenMonthsAgo.getMonth() - 6)
      : sixOrEighteenMonthsAgo.setMonth(sixOrEighteenMonthsAgo.getMonth() - 18);

    matchConditions.push({
      releaseDateAsDate: { $gte: sixOrEighteenMonthsAgo },
    });
  }

  const match_min_ratings_and_release_date = {
    $match: {
      $and: matchConditions,
    },
  };

  const limit_results = { $limit: limit };
  const skip_results = { $skip: (page - 1) * limit };
  const sort_popularity_and_ratings = {
    $sort: {
      sortAvgField: 1,
      popularity_average: 1,
      ratings_average: -1,
      title: 1,
    },
  };

  // Dynamically build the remove_keys object based on query parameters
  const remove_keys = {
    $project: {
      releaseDateAsDate: 0,
      sortAvgField: 0,
      ...(critics_rating_details
        ? {}
        : { "allocine.critics_rating_details": 0 }),
      ...(episodes_details ? {} : { episodes_details: 0 }),
      ...(last_episode ? {} : { last_episode: 0 }),
      ...(next_episode ? {} : { next_episode: 0 }),
      ...(highest_episode ? {} : { highest_episode: 0 }),
      ...(lowest_episode ? {} : { lowest_episode: 0 }),
    },
  };

  const facet = {
    $facet: {
      results: [
        addFields_popularity_and_ratings,
        match_min_ratings_and_release_date,
        sort_popularity_and_ratings,
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
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      genres,
      pipeline,
      "genres",
      is_active_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      platforms,
      pipeline,
      "platforms_links",
      is_active_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      networks,
      pipeline,
      "networks",
      is_active_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
    getPipelineByNames(
      production_companies,
      pipeline,
      "production_companies",
      is_active_item,
      is_must_see_item,
      is_users_certified_item,
      is_critics_certified_item,
    );
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
