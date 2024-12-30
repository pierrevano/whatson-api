const newrelic = require("newrelic");

const { aggregateData } = require("../aggregateData");
const { config } = require("../config");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { sendInternalError, sendRequest } = require("../utils/sendRequest");
const findId = require("../findId");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(config.dbName);
const collectionNameApiKey = database.collection(config.collectionNameApiKey);

const getItems = async (req, res) => {
  try {
    const api_key_query = req.query.api_key;
    const critics_rating_details_query = req.query.critics_rating_details;
    const directors_query = req.query.directors;
    const episodes_details_query = req.query.episodes_details;
    const genres_query = req.query.genres;
    const id_path = parseInt(req.params.id);
    const is_active_query = req.query.is_active;
    const item_type_query = req.query.item_type;
    const limit_query = parseInt(req.query.limit);
    const minimum_ratings_query = req.query.minimum_ratings;
    const page_query = parseInt(req.query.page);
    const platforms_query = req.query.platforms;
    const popularity_filters_query = req.query.popularity_filters;
    const ratings_filters_query = req.query.ratings_filters;
    const release_date_query = req.query.release_date;
    const seasons_number_query = req.query.seasons_number;
    const status_query = req.query.status;

    const internal_api_key = await collectionNameApiKey.findOne({
      name: "internal_api_key",
    });

    if (api_key_query === internal_api_key.value) {
      const transaction = newrelic.getTransaction();
      transaction.ignore();
    } else {
      newrelic.addCustomAttributes(req.query);
    }

    let { items, limit, page } = await aggregateData(
      critics_rating_details_query,
      directors_query,
      episodes_details_query,
      genres_query,
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
    );
    const results = items && items.length > 0 ? items[0].results : [];
    const total_results =
      results.length > 0 ? items[0].total_results[0].total_results : 0;

    let json = {
      page: page,
      results: results,
      total_pages: Math.ceil(total_results / limit),
      total_results: total_results,
    };

    for (let index = 0; index < config.keysToCheckForSearch.length; index++) {
      const key = config.keysToCheckForSearch[index];

      const lowerCaseQuery = {};
      for (let queryKey in req.query) {
        lowerCaseQuery[queryKey.toLowerCase()] = req.query[queryKey];
      }

      if (lowerCaseQuery.hasOwnProperty(key)) {
        const items = await findId(lowerCaseQuery);
        const results = items.results;
        const total_results = items.total_results;

        json = {
          page: 1,
          results: results,
          total_pages: 1,
          total_results: total_results,
        };

        break;
      }
    }

    await sendRequest(req, res, json, item_type_query, limit, config);
  } catch (error) {
    await sendInternalError(res, error);
  }
};

module.exports = getItems;
