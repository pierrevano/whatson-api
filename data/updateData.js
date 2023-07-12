/**
 * Loads environment variables from a .env file into process.env.
 * @returns {void}
 */
require("dotenv").config();

const csv = require("csvtojson");
const shell = require("shelljs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const { config } = require("../src/config");
const { getNodeVarsValues } = require("../src/getNodeVarsValues");

const { b64Encode, b64Decode } = require("../src/utils/b64EncodeAndDecode");
const { countNullElements } = require("./countNullElements");
const { jsonArrayFiltered } = require("../src/utils/jsonArrayFiltered");
const { updateIds } = require("../src/updateIds");
const loopItems = require("./loopItems");

if (getNodeVarsValues.get_ids === "update_ids") updateIds();
if (getNodeVarsValues.get_db === "no_update_db") process.exit(0);

shell.exec("rm -f ./logs.txt");

(async () => {
  const database = client.db(config.dbName);
  const collectionData = database.collection(config.collectionName);

  if (getNodeVarsValues.skip_already_added_documents !== "skip") {
    const resetIsActiveAndPopularity = { $set: { is_active: false, "allocine.popularity": null, "imdb.popularity": null } };
    await collectionData.updateMany({ item_type: getNodeVarsValues.item_type }, resetIsActiveAndPopularity);
    console.log("All documents have been reset.");
  }

  const idsFilePath = getNodeVarsValues.item_type === "movie" ? config.filmsIdsFilePath : config.seriesIdsFilePath;
  console.log(`Ids file path to use: ${idsFilePath}`);

  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  const jsonArray = !getNodeVarsValues.is_not_active || getNodeVarsValues.is_not_active === "active" ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;

  const index_to_start = getNodeVarsValues.index_to_start || 0;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the getNodeVarsValues object. */
    for (const [variable, value] of Object.entries(getNodeVarsValues)) {
      const variableValue = value ? value : "not set";
      console.log(`${variable}: ${variableValue}`);
    }

    const check_db_ids = getNodeVarsValues.check_db_ids;
    if (check_db_ids === "check") {
      let idFromFiles = [];
      jsonArrayFromCSV.forEach((element) => {
        idFromFiles.push(b64Encode(`${config.baseURLAllocine}${element.URL}`));
      });
      const allDbIdsArray = await collectionData
        .find({ item_type: getNodeVarsValues.item_type })
        .map((el) => {
          return el._id;
        })
        .toArray();
      const idsOnlyInDb = allDbIdsArray.filter((x) => !idFromFiles.includes(x));
      idsOnlyInDb.forEach((element) => {
        console.log(`${element}: ${b64Decode(element)}`);
      });
      process.exit(0);
    }

    const force = getNodeVarsValues.force === "force";

    const { newOrUpdatedItems } = await loopItems(collectionData, config, force, index_to_start, getNodeVarsValues.item_type, jsonArray, getNodeVarsValues.skip_already_added_documents);
    await countNullElements(collectionData, newOrUpdatedItems);
  } catch (error) {
    throw new Error(`Global: ${error}`);
  } finally {
    await client.close();
  }

  console.timeEnd("Duration", `- ${jsonArray.length} elements imported.`);
})();
