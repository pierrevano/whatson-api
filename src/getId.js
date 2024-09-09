const { MongoClient, ServerApiVersion } = require("mongodb");
require("newrelic");

const { config } = require("./config");
const { getItems } = require("./getItems");

const uri = `mongodb+srv://${config.mongoDbCredentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

/**
 * Retrieves an item's ID from the database based on the given parameters.
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns None
 * @throws {Error} If there is an error retrieving the item from the database.
 */
const getId = async (req, res) => {
  try {
    const cinema_id_query = req.query.cinema_id;
    const id_path = parseInt(req.params.id);
    const item_type_query = req.query.item_type;
    const ratings_filters_query = req.query.ratings_filters;
    const url = `${req.headers["host"]}${req.url}`;
    const item_type = url.split("/")[1] === "movie" ? "movie" : "tvshow";
    const critics_rating_details_query = req.query.critics_rating_details;
    const episodes_details_query = req.query.episodes_details;

    if (id_path && ratings_filters_query) {
      try {
        const { items } = await getItems(
          cinema_id_query,
          id_path,
          undefined,
          item_type_query,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ratings_filters_query,
          undefined,
          undefined,
          undefined,
          critics_rating_details_query,
          episodes_details_query,
        );
        const filteredResults = items[0].results.filter((result) => {
          return result.item_type === item_type;
        });
        const results = filteredResults[0];

        res.status(200).json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    } else {
      try {
        // Dynamically build the projection object based on query parameters
        let projection = {};
        if (!critics_rating_details_query === "true")
          projection.critics_rating_details = 0;
        if (!episodes_details_query === "true") projection.episodes_details = 0;

        const query = { id: id_path, item_type: item_type };
        const items = await collectionData.findOne(query, { projection });

        if (items) {
          res.status(200).json(items);
        } else {
          res.status(404).json({ message: "No items have been found." });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = getId;
