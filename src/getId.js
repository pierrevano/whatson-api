const { MongoClient, ServerApiVersion } = require("mongodb");

const { config } = require("./config");
const { getItems } = require("./getItems");

const uri = `mongodb+srv://${config.mongoDbCredentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

/* Connecting to the database and the collection. */
const dbName = config.dbName;
const collectionName = config.collectionName;
const database = client.db(dbName);
const collectionData = database.collection(collectionName);

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
    if (id_path && ratings_filters_query) {
      try {
        const { items } = await getItems(cinema_id_query, id_path, item_type_query, ratings_filters_query);
        const filteredResults = items[0].results.filter((result) => {
          return result.item_type === item_type;
        });
        const results = filteredResults[0];

        res.status(200).json(results);
      } catch (error) {
        res.status(400).send(error);
      }
    } else {
      try {
        const query = { id: id_path, item_type: item_type };
        const items = await collectionData.findOne(query);

        res.status(200).json(items);
      } catch (error) {
        res.status(400).send(error);
      }
    }
  } catch (error) {
    res.status(400).send(error);
  }
};

module.exports = getId;
