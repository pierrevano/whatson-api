const csv = require("csvtojson");

const { config } = require("../config");

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const { b64Encode } = require("../utils/b64EncodeAndDecode");
const { fetchAndCheckItemCount } = require("./getAllocineItemsNumber");
const { getMojoBoxOffice } = require("../content/getMojoBoxOffice");
const { getNodeVarsValues } = require("../utils/getNodeVarsValues");
const { jsonArrayFiltered } = require("../utils/jsonArrayFiltered");
const { updateIds } = require("./updateIds");
const checkDbIds = require("./checkDbIds");
const isThirdPartyServiceOK = require("../utils/thirdPartyStatus");
const loopItems = require("./loopItems");

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

  if (getNodeVarsValues.get_ids === "update_ids") updateIds();

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
  const jsonArraySortedHighestToLowest = jsonArray.sort(
    (a, b) => b.THEMOVIEDB_ID - a.THEMOVIEDB_ID,
  );
  const allTheMovieDbIds = jsonArraySortedHighestToLowest.map((item) =>
    parseInt(item.THEMOVIEDB_ID),
  );

  if (allTheMovieDbIds.length === 0) {
    console.log("Not updating tvshows as the top list is not correct.");
    process.exit(0);
  } else if (allTheMovieDbIds.length < config.minimumActiveItems) {
    console.log("Something went wrong when updating the IDs. Abording.");
    process.exit(1);
  }

  /**
   * If we are in the `update_ids` mode, we proceed to reset the `is_active` and `popularity`
   * fields for all documents in the collectionData that do not match the currently active items IDs.
   * Once the operation is complete, we log the number of documents that have been affected by this operation.
   *
   * The fields `is_active` and `popularity` for the active items are updated afterwards.
   */
  if (getNodeVarsValues.get_ids === "update_ids") {
    const resetIsActive = { $set: { is_active: false } };
    const resetPopularity = {
      $set: {
        "allocine.popularity": null,
        "imdb.popularity": null,
        mojo: null,
      },
    };

    const filterQueryIsActive = {
      item_type: getNodeVarsValues.item_type,
      id: { $nin: allTheMovieDbIds },
    };

    await collectionData.updateMany(filterQueryIsActive, resetIsActive);
    await collectionData.updateMany(filterQueryIsActive, resetPopularity);

    console.log(
      `${allTheMovieDbIds.length} documents have been excluded from the is_active and popularity reset.`,
    );
  }

  if (getNodeVarsValues.delete_ids === "delete_ids") {
    const itemsArgRaw = process.argv.find((arg) => arg.startsWith("--items="));

    if (!itemsArgRaw) {
      console.log("Please provide --items=<comma-separated list>. Aborting.");
      process.exit(1);
    }

    const itemsToDelete = itemsArgRaw
      .replace("--items=", "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    if (itemsToDelete.length === 0) {
      console.log("No valid items to delete. Aborting.");
      process.exit(1);
    }

    const encodedItems = itemsToDelete.map((item) => b64Encode(item));

    const filterQueryDelete = {
      item_type: getNodeVarsValues.item_type,
      _id: { $in: encodedItems },
    };

    const deleteResult = await collectionData.deleteMany(filterQueryDelete);
    console.log(`${deleteResult.deletedCount} items were deleted.`);

    process.exit(0);
  }

  const index_to_start = getNodeVarsValues.index_to_start || 0;
  const max_index = parseInt(getNodeVarsValues.max_index) || null;

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

    const mojoBoxOfficeArray =
      getNodeVarsValues.skip_mojo === "skip_mojo"
        ? []
        : await getMojoBoxOffice(getNodeVarsValues.item_type);

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
