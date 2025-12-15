const csv = require("csvtojson");

const { config } = require("../config");

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const { fetchAndCheckItemCount } = require("./getAllocineItemsNumber");
const { getMojoBoxOffice } = require("../content/getMojoBoxOffice");
const { getNodeVarsValues } = require("../utils/getNodeVarsValues");
const { jsonArrayFiltered } = require("../utils/jsonArrayFiltered");
const { updateIds } = require("./updateIds");
const checkDbIds = require("./checkDbIds");
const checkMissingImdbIds = require("./checkMissingImdbIds");
const deleteIds = require("./deleteIds");
const filterByCheckId = require("./filterByCheckId");
const isThirdPartyServiceOK = require("../utils/thirdPartyStatus");
const loopItems = require("./loopItems");
const resetInactiveItems = require("./resetInactiveItems");

async function checkCountryCode() {
  try {
    const { success, data } = await isThirdPartyServiceOK(config.IPinfo);

    if (success) {
      if (data.trim() !== "FR") {
        console.log("Please disable any VPN first.");
        process.exit(1);
      } else {
        console.log(`Country code is ${data.trim()}, continuing...`);
        console.log(
          "----------------------------------------------------------------------------------------------------",
        );
      }
    } else {
      console.error("Failed to fetch country code. Aborting.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error fetching country code:", error);
    process.exit(1);
  }
}

async function checkStatus(service) {
  const { success } = await isThirdPartyServiceOK(service.url);

  if (success) {
    console.log(`${service.name}'s status is OK, continuing...`);
  } else {
    console.error(`${service.name}'s status is not OK. Aborting.`);
    process.exit(1);
  }
}

(async () => {
  if (getNodeVarsValues.environment === "local") {
    await checkCountryCode();
  }

  if (getNodeVarsValues.skip_services !== "skip_services") {
    const ids = [1, 2, 3];
    for (const id of ids) {
      await fetchAndCheckItemCount(id);
    }
    console.log(
      "----------------------------------------------------------------------------------------------------",
    );

    for (let service of config.services) {
      await checkStatus(service);
    }
    console.log(
      "----------------------------------------------------------------------------------------------------",
    );
  }

  const isUpdateIds = getNodeVarsValues.get_ids === "update_ids";

  if (isUpdateIds) updateIds();

  if (getNodeVarsValues.get_db !== "update_db") process.exit(0);

  const database = client.db(config.dbName);
  const collectionData = database.collection(config.collectionName);

  const idsFilePath =
    getNodeVarsValues.item_type === "movie"
      ? config.filmsIdsFilePath
      : config.seriesIdsFilePath;
  console.log(`Ids file path to use: ${idsFilePath}`);

  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  const jsonArray =
    !getNodeVarsValues.is_not_active ||
    getNodeVarsValues.is_not_active === "active"
      ? jsonArrayFiltered(jsonArrayFromCSV)
      : jsonArrayFromCSV;
  let jsonArraySortedHighestToLowest = jsonArray.sort(
    (a, b) => b.THEMOVIEDB_ID - a.THEMOVIEDB_ID,
  );

  const mojoBoxOfficeArray =
    getNodeVarsValues.skip_mojo === "skip_mojo"
      ? []
      : await getMojoBoxOffice(getNodeVarsValues.item_type);

  checkMissingImdbIds(mojoBoxOfficeArray, jsonArraySortedHighestToLowest);

  jsonArraySortedHighestToLowest = await filterByCheckId({
    collectionData,
    getNodeVarsValues,
    jsonArraySortedHighestToLowest,
    mojoBoxOfficeArray,
  });

  const allTheMovieDbIds = jsonArraySortedHighestToLowest.map((item) =>
    parseInt(item.THEMOVIEDB_ID),
  );

  if (allTheMovieDbIds.length === 0) {
    console.log("Not updating tvshows as the top list is not correct.");
    process.exit(0);
  } else if (
    allTheMovieDbIds.length < config.minimumActiveItems &&
    !getNodeVarsValues.check_id
  ) {
    console.log("Something went wrong when updating the IDs. Aborting.");
    process.exit(1);
  }

  await resetInactiveItems({
    allTheMovieDbIds,
    collectionData,
    getNodeVarsValues,
    isUpdateIds,
  });

  await deleteIds({
    collectionData,
    getNodeVarsValues,
    processArgs: process.argv,
  });

  const index_to_start = getNodeVarsValues.index_to_start || 0;
  const max_index = parseInt(getNodeVarsValues.max_index) + 1 || null;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the getNodeVarsValues object. */
    for (const [variable, value] of Object.entries(getNodeVarsValues)) {
      const variableValue = value ? value : "not set";
      console.log(`${variable}: ${variableValue}`);
    }

    if (getNodeVarsValues.check_db_ids === "check")
      await checkDbIds(jsonArrayFromCSV, collectionData);

    const force = getNodeVarsValues.force === "force";

    const { newOrUpdatedItems } = await loopItems(
      collectionData,
      config,
      force,
      index_to_start,
      getNodeVarsValues.item_type,
      jsonArraySortedHighestToLowest,
      mojoBoxOfficeArray,
      max_index,
    );
    console.log(`Number of new or updated items: ${newOrUpdatedItems}`);

    const documents = await collectionData.estimatedDocumentCount();
    console.log(`Number of documents in the collection: ${documents}`);

    const movieCount = await collectionData.countDocuments({
      item_type: "movie",
    });
    console.log(`Number of movie documents in the collection: ${movieCount}`);

    const tvShowCount = await collectionData.countDocuments({
      item_type: "tvshow",
    });
    console.log(`Number of tvshow documents in the collection: ${tvShowCount}`);
  } catch (error) {
    throw new Error(`Global: ${error}`);
  } finally {
    await client.close();
  }

  console.timeEnd(
    "Duration",
    `- ${jsonArraySortedHighestToLowest.length} elements imported.`,
  );
})();
