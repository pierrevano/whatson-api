const dotenv = require("dotenv");
dotenv.config();

/* Connecting to the database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Defining the name of the collection and the database. */
const config = {
  collectionName: "data",
  dbName: "whatson",
};

/* Connecting to the database and the collection. */
const dbName = config.dbName;
const collectionName = config.collectionName;
const database = client.db(dbName);
const collectionData = database.collection(collectionName);

async function run() {
  try {
    await client.connect();

    const result = await collectionData.deleteMany({});
    console.log(result);

    await client.close();
  } catch (error) {
    console.log(`deleteToDatabase: ${error}`);
  }
}

run();
