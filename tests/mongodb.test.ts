require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");
const { config } = require("../src/config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;

const params = {
  movie_items_not_older_than_max_age: {
    itemType: "movie",
    maxAgeDays: 365,
  },
  tvshow_items_not_older_than_max_age: {
    itemType: "tvshow",
    maxAgeDays: 180,
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

  Object.entries(params).forEach(([name, { itemType, maxAgeDays }]) => {
    test(
      name,
      async () => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

        const outdatedDocs = await collectionData
          .find(
            {
              item_type: itemType,
              updated_at: { $lt: cutoffDate.toISOString() },
            },
            { projection: { updated_at: 1, "allocine.url": 1 } },
          )
          .toArray();

        if (outdatedDocs.length > 0) {
          console.log(
            `Outdated ${itemType}s:\n` +
              outdatedDocs
                .map(
                  (doc) =>
                    `  ${doc.allocine?.url ?? "no allocine url"} (updated_at: ${doc.updated_at})`,
                )
                .join("\n"),
          );
        }

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
