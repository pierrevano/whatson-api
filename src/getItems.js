const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("./config");
const { getMoviesIds } = require("./getMoviesIds");
const { getPipelineFromTVShow } = require("./getPipelineFromTVShow");
const { getPopularityFilters } = require("./getPopularityFilters");
const { getRatingsFilters } = require("./getRatingsFilters");
const { getPipelineByPlatformNames } = require("./getPipelineByPlatformNames");

const uri = `mongodb+srv://${config.mongoDbCredentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

/* Connecting to the database and the collection. */
const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

const getItems = async (
  cinema_id_query,
  id_path,
  is_active_query,
  item_type_query,
  limit_query,
  minimum_ratings_query,
  page_query,
  platforms_query,
  popularity_filters_query,
  ratings_filters_query,
  release_date_query,
  seasons_number_query,
  status_query,
) => {
  const id = isNaN(id_path) ? "" : id_path;
  const is_active =
    typeof is_active_query !== "undefined" ? is_active_query : true;
  const item_type =
    typeof item_type_query !== "undefined" ? item_type_query : "movie";
  const limit = isNaN(limit_query) ? config.limit : limit_query;
  const movies_ids =
    typeof cinema_id_query !== "undefined"
      ? await getMoviesIds(cinema_id_query)
      : "";
  const minimum_ratings =
    typeof minimum_ratings_query !== "undefined" ? minimum_ratings_query : "";
  const page = isNaN(page_query) ? config.page : page_query;
  const platforms =
    typeof platforms_query !== "undefined" ? platforms_query : "";
  const popularity_filters_query_value =
    typeof popularity_filters_query !== "undefined"
      ? popularity_filters_query
      : "all";
  const popularity_filters = await getPopularityFilters(
    popularity_filters_query_value,
  );
  const ratings_filters_query_value =
    typeof ratings_filters_query !== "undefined"
      ? ratings_filters_query
      : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const release_date =
    typeof release_date_query !== "undefined" ? release_date_query : "";
  const seasons_number =
    typeof seasons_number_query !== "undefined" ? seasons_number_query : "";
  const status = typeof status_query !== "undefined" ? status_query : "";

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

  let item_type_default = { item_type: item_type };
  const item_type_all = {
    $or: [{ item_type: "movie" }, { item_type: "tvshow" }],
  };
  item_type_default =
    item_type === "movie,tvshow" || item_type === "tvshow,movie"
      ? item_type_all
      : item_type_default;

  const match_id = { $match: { id: id } };
  const match_in_movies_ids = {
    $match: { "allocine.id": { $in: movies_ids } },
  };
  const match_item_type = {
    $match: { $and: [item_type_default, is_active_item] },
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const matchConditions = [
    {
      ratings_average: {
        $gte: !isNaN(minimum_ratings_sorted)
          ? minimum_ratings_sorted
          : -Infinity,
      },
    },
  ];

  const isItemsNew = release_date.split(",").includes("new");
  if (item_type === "movie" && isItemsNew) {
    matchConditions.push({
      releaseDateAsDate: { $gte: sixMonthsAgo },
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
  const remove_sort_popularity_and_release_date = {
    $project: { sortAvgField: 0, releaseDateAsDate: 0 },
  };

  const facet = {
    $facet: {
      results: [
        addFields_popularity_and_ratings,
        match_min_ratings_and_release_date,
        sort_popularity_and_ratings,
        remove_sort_popularity_and_release_date,
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
      item_type,
      pipeline,
      seasons_number,
      status,
      isItemsNew,
    );
  } else if (movies_ids) {
    pipeline.push(match_in_movies_ids);
  } else {
    pipeline.push(match_item_type);
  }

  if (!id) getPipelineByPlatformNames(is_active_item, platforms, pipeline);

  pipeline.push(facet);

  console.log(pipeline);

  const data = await collectionData.aggregate(pipeline);
  const items = await data.toArray();

  return { items: items, limit: limit, page: page };
};

module.exports = { getItems };
