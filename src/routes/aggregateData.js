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

const aggregateData = async (
  append_to_response,
  directors_query,
  genres_query,
  id_path,
  is_active_query,
  is_must_see_query,
  item_type_query,
  limit_query,
  minimum_ratings_query,
  page_query,
  platforms_query,
  popularity_filters_query,
  ratings_filters_query,
  release_date_query,
  seasons_number_query,
  filtered_season_query,
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
  const id = isNaN(id_path) ? "" : id_path;
  const is_active =
    typeof is_active_query !== "undefined" && is_active_query
      ? is_active_query
      : true;
  const is_must_see =
    typeof is_must_see_query !== "undefined" && is_must_see_query
      ? is_must_see_query
      : "true,false";
  const item_type =
    typeof item_type_query !== "undefined" && item_type_query
      ? item_type_query
      : "movie";
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
  const filtered_season =
    typeof filtered_season_query !== "undefined" && filtered_season_query
      ? filtered_season_query
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
  const is_must_see_all = {
    $or: [
      { metacritic: null },
      { "metacritic.must_see": true },
      { "metacritic.must_see": false },
    ],
  };
  is_must_see_item =
    is_must_see === "true,false" || is_must_see === "false,true"
      ? is_must_see_all
      : is_must_see_item;

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
    $match: { $and: [item_type_default, is_active_item, is_must_see_item] },
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
    );
    getPipelineByNames(
      genres,
      pipeline,
      "genres",
      is_active_item,
      is_must_see_item,
    );
    getPipelineByNames(
      platforms,
      pipeline,
      "platforms_links",
      is_active_item,
      is_must_see_item,
    );
  }

  pipeline.push(facet);

  const data = await collectionData.aggregate(pipeline);
  let items = await data.toArray();

  items = await filterEpisodesBySeason(items, filtered_season);

  return {
    items,
    limit,
    page,
    is_active_item,
  };
};

module.exports = { aggregateData };
