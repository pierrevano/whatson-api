/* Used to load environment variables from a .env file into process.env. */
const dotenv = require("dotenv");
dotenv.config();

const { config } = require("./config");
const { getMoviesIds } = require("./getMoviesIds");
const { getRatingsFilters } = require("./getRatingsFilters");
const { MongoClient, ServerApiVersion } = require("mongodb");

const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Connecting to the database and the collection. */
const dbName = config.dbName;
const collectionName = config.collectionName;
const database = client.db(dbName);
const collectionData = database.collection(collectionName);

/**
 * Retrieves items from the database based on the given parameters.
 * @param {string} cinema_id_query - The cinema ID to filter by.
 * @param {string} id_path - The ID of the item to retrieve.
 * @param {boolean} is_active_query - Whether or not the item is active.
 * @param {string} item_type_query - The type of item to retrieve.
 * @param {number} limit_query - The maximum number of items to retrieve.
 * @param {number} page_query - The page number to retrieve.
 * @param {string} ratings_filters_query - The ratings filters to apply.
 * @param {string} seasons_number_query - The seasons number to filter by.
 * @returns An object containing the number of elements, the retrieved items, the limit, and the page.
 */
const getItems = async (cinema_id_query, id_path, is_active_query, item_type_query, limit_query, page_query, ratings_filters_query, seasons_number_query) => {
  const id = isNaN(id_path) ? "" : id_path;
  const is_active = typeof is_active_query !== "undefined" ? is_active_query : true;
  const item_type = typeof item_type_query !== "undefined" ? item_type_query : "movie";
  const limit = isNaN(limit_query) ? config.limit : limit_query;
  const movies_ids = typeof cinema_id_query !== "undefined" ? await getMoviesIds(cinema_id_query) : "";
  const page = isNaN(page_query) ? config.page : page_query;
  const ratings_filters_query_value = typeof ratings_filters_query !== "undefined" ? ratings_filters_query : "all";
  const ratings_filters = await getRatingsFilters(ratings_filters_query_value);
  const seasons_number = typeof seasons_number_query !== "undefined" ? seasons_number_query : "";

  const addFields_ratings_filters = { $addFields: { ratings_average: { $avg: ratings_filters } } };

  let is_active_item = { is_active: (is_true = is_active === "true") };
  const is_active_all = { $or: [{ is_active: true }, { is_active: false }] };
  is_active_item = is_active === "true,false" || is_active === "false,true" ? is_active_all : is_active_item;

  let item_type_default = { item_type: item_type };
  const item_type_all = { $or: [{ item_type: "movie" }, { item_type: "tvshow" }] };
  item_type_default = item_type === "movie,tvshow" || item_type === "tvshow,movie" ? item_type_all : item_type_default;

  const item_type_tvshow = { item_type: "tvshow" };
  const match_id = { $match: { id: id } };
  const match_in_movies_ids = { $match: { "allocine.id": { $in: movies_ids } } };
  const match_item_type = { $match: { $and: [item_type_default, is_active_item] } };
  const seasons_number_first = { seasons_number: { $in: seasons_number.split(",").map(Number) } };
  const seasons_number_last = { seasons_number: { $gt: config.maxSeasonsNumber } };

  const match_item_type_tvshow_and_seasons_number = { $match: { $and: [item_type_tvshow, is_active_item, seasons_number_first] } };
  const match_item_type_tvshow_and_seasons_number_more_than_max = { $match: { $and: [item_type_tvshow, is_active_item, { $or: [seasons_number_first, seasons_number_last] }] } };

  const limit_results = { $limit: limit };
  const match_not_allocine_null = { $match: { $or: [{ "allocine.critics_rating": { $ne: null } }, { "allocine.users_rating": { $ne: null } }] } };
  const match_not_betaseries_or_imdb_null = { $match: { $or: [{ "betaseries.users_rating": { $ne: null } }, { "imdb.users_rating": { $ne: null } }] } };
  const skip_results = { $skip: (page - 1) * limit };
  const sort_ratings = { $sort: { ratings_average: -1 } };
  const facet = {
    $facet: {
      results: [match_not_allocine_null, match_not_betaseries_or_imdb_null, addFields_ratings_filters, sort_ratings, skip_results, limit_results],
      total_results: [{ $count: "total_results" }],
    },
  };

  const pipeline = [];
  if (id !== "") {
    pipeline.push(match_id);
  } else if (item_type === "tvshow" && seasons_number.includes(config.maxSeasonsNumber)) {
    pipeline.push(match_item_type_tvshow_and_seasons_number_more_than_max);
  } else if (item_type === "tvshow" && seasons_number !== "") {
    pipeline.push(match_item_type_tvshow_and_seasons_number);
  } else if (item_type === "tvshow") {
    pipeline.push(match_item_type);
  } else if (movies_ids !== "") {
    pipeline.push(match_in_movies_ids);
  } else {
    pipeline.push(match_item_type);
  }

  pipeline.push(facet);

  console.log(pipeline);

  const data = await collectionData.aggregate(pipeline);
  const items = await data.toArray();

  return { items: items, limit: limit, page: page };
};

module.exports = { getItems };
