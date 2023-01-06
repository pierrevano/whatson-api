/* This is importing the express module and creating an express app. */
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 8081;

/* This is importing the MongoClient and ServerApiVersion from the mongodb module. */
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

app.get("/", async (_req, res) => {
  try {
    await client.connect();

    const data = await collectionData.find({}).toArray();
    res.status(200).json(data);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.listen(PORT, () => {
  console.log(`server started on http://localhost:${PORT}`);
});
