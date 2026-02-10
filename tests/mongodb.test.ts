require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");
const { config } = require("../src/config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;

const params = {
  movie_items_not_older_than_365_days: {
    itemType: "movie",
  },
  tvshow_items_not_older_than_365_days: {
    itemType: "tvshow",
  },
};

describe("Items are up to date", () => {
  let client;
  let collectionData;

  beforeAll(async () => {
    client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    await client.connect();
    const database = client.db(config.dbName);
    collectionData = database.collection(config.collectionName);
  }, config.timeout);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  }, config.timeout);

  Object.entries(params).forEach(([name, { itemType }]) => {
    test(
      name,
      async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 365);

        const outdatedDocs = await collectionData
          .find(
            {
              item_type: itemType,
              updated_at: { $lt: cutoffDate.toISOString() },
            },
            { projection: { id: 1, updated_at: 1 } },
          )
          .toArray();

        expect(outdatedDocs.length).toBe(0);
      },
      config.timeout,
    );
  });

  test(
    "no item has all ratings keys set to null",
    async () => {
      const allRatingsNullQuery = {
        $and: config.ratingsKeys.map((key) => ({ [key]: null })),
      };

      const itemsWithAllRatingsNull =
        await collectionData.countDocuments(allRatingsNullQuery);

      expect(itemsWithAllRatingsNull).toBe(0);
    },
    config.timeout,
  );
});
