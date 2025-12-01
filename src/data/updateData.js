const { writeFileSync } = require("fs");
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
  let jsonArraySortedHighestToLowest = jsonArray.sort(
    (a, b) => b.THEMOVIEDB_ID - a.THEMOVIEDB_ID,
  );

  const mojoBoxOfficeArray =
    getNodeVarsValues.skip_mojo === "skip_mojo"
      ? []
      : await getMojoBoxOffice(getNodeVarsValues.item_type);

  if (getNodeVarsValues.check_id) {
    const imdbIdsToUpdate =
      getNodeVarsValues.check_id === "all_ids"
        ? mojoBoxOfficeArray.map((item) => item.imdbId).filter(Boolean)
        : [getNodeVarsValues.check_id];
    const filteredByImdbId = jsonArraySortedHighestToLowest.filter((item) => {
      return imdbIdsToUpdate.includes(item.IMDB_ID);
    });

    writeFileSync(
      "./temp_mojo_box_office.json",
      JSON.stringify(filteredByImdbId),
      "utf-8",
    );

    if (filteredByImdbId.length === 0) {
      console.log(
        `IMDb ID${
          imdbIdsToUpdate.length > 1 ? "s" : ""
        } ${imdbIdsToUpdate.join(", ")} not found in the dataset. Aborting.`,
      );
      process.exit(0);
    }

    jsonArraySortedHighestToLowest = filteredByImdbId;
  }

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

  /**
   * In `update_ids` mode, resets fields for items not in the current active ID list (`allTheMovieDbIds`):
   * - Sets `is_active` to false.
   * - Sets `allocine.popularity`, `imdb.popularity`, and `tmdb.popularity` to null if their objects are not null.
   * Only items matching `item_type` and excluded from the ID list are affected.
   * Logs the number of items excluded from the reset (i.e., still active).
   */
  if (getNodeVarsValues.get_ids === "update_ids") {
    const filterQuery = {
      item_type: getNodeVarsValues.item_type,
      id: { $nin: allTheMovieDbIds },
    };

    // 1. Reset is_active for all
    await collectionData.updateMany(filterQuery, {
      $set: { is_active: false },
    });

    // 2. Reset allocine popularity ONLY if allocine is not null
    await collectionData.updateMany(
      { ...filterQuery, allocine: { $ne: null } },
      { $set: { "allocine.popularity": null } },
    );

    // 3. Reset imdb popularity ONLY if imdb is not null
    await collectionData.updateMany(
      { ...filterQuery, imdb: { $ne: null } },
      { $set: { "imdb.popularity": null } },
    );

    // 4. Reset tmdb popularity ONLY if tmdb is not null
    await collectionData.updateMany(
      { ...filterQuery, tmdb: { $ne: null } },
      { $set: { "tmdb.popularity": null } },
    );

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
