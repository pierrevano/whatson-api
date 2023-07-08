/**
 * Loads environment variables from a .env file into process.env.
 * @returns None
 */
require("dotenv").config();

const csv = require("csvtojson");
const shell = require("shelljs");
const { writeFileSync } = require("fs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const { config } = require("../src/config");
const { getNodeVarsValues } = require("../src/getNodeVarsValues");

const { b64Encode, b64Decode } = require("../src/utils/b64EncodeAndDecode");
const { controlData } = require("./controlData");
const { countNullElements } = require("./countNullElements");
const { jsonArrayFiltered } = require("../src/utils/jsonArrayFiltered");
const { updateIds } = require("../src/updateIds");
const { upsertToDatabase } = require("./upsertToDatabase");
const compareUsersRating = require("./compareUsersRating");
const createJSON = require("./createJSON");

const item_type = getNodeVarsValues.item_type;

/* Checking if the variable get_ids is true. If it is not true, it will run the function updateIds(). */
const get_ids = getNodeVarsValues.get_ids;
if (get_ids === "update_ids") updateIds();

/* Checking if the second argument is true. If it is, it exits the process. */
const get_db = getNodeVarsValues.get_db;
if (get_db !== "update_db") process.exit(0);

/* Removing the file logs.txt */
shell.exec("rm -f ./logs.txt");

/* Importing data from a CSV file into a MongoDB database. */
(async () => {
  const dbName = config.dbName;
  const collectionName = config.collectionName;
  const database = client.db(dbName);
  const collectionData = database.collection(collectionName);

  /* If 'skip_already_added_documents' is false and 'get_ids' equals "update_ids", proceed with the update.
  Prepare an update operation to reset 'is_active' field to false and set 'popularity' fields to null for both 'allocine' and 'imdb' */
  const skip_already_added_documents = getNodeVarsValues.skip_already_added_documents;
  if (!skip_already_added_documents && get_ids === "update_ids") {
    const resetIsActiveAndPopularity = { $set: { is_active: false, "allocine.popularity": null, "imdb.popularity": null } };
    await collectionData.updateMany({ item_type: item_type }, resetIsActiveAndPopularity);
    console.log("All documents have been reset.");
  }

  const idsFilePath = item_type === "movie" ? config.filmsIdsFilePath : config.seriesIdsFilePath;
  console.log(`Ids file path to use: ${idsFilePath}`);

  const is_not_active = getNodeVarsValues.is_not_active;
  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  let jsonArray = [];

  /* Checking if the is_not_active variable is not active or if it is active. If it is not active, it
  will filter the jsonArrayFromCSV. If it is active, it will not filter the jsonArrayFromCSV. */
  jsonArray = !is_not_active || is_not_active === "active" ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;

  /* Setting the index_to_start variable to the value of the node_vars[5] variable. If node_vars[5] is
  not defined, then index_to_start is set to 0. */
  let index_to_start = getNodeVarsValues.index_to_start;
  if (!index_to_start) index_to_start = 0;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the getNodeVarsValues object. */
    for (let variable in getNodeVarsValues) {
      let variable_value = getNodeVarsValues[variable];
      if (!getNodeVarsValues[variable]) variable_value = "not set";
      console.log(`${variable}: ${variable_value}`);
    }

    const check_db_ids = getNodeVarsValues.check_db_ids;
    if (check_db_ids === "check") {
      let idFromFiles = [];
      jsonArrayFromCSV.forEach((element) => {
        idFromFiles.push(b64Encode(`${config.baseURLAllocine}${element.URL}`));
      });
      const allDbIdsArray = await collectionData
        .find({ item_type: item_type })
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

    for (let index = index_to_start; index < jsonArray.length; index++) {
      const json = jsonArray[index];

      console.timeLog("Duration", `- ${parseInt(index) + 1} / ${jsonArray.length} (${(((parseInt(index) + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

      const baseURLAllocine = config.baseURLAllocine;
      const allocineURL = json.URL;
      const completeAllocineURL = `${baseURLAllocine}${allocineURL}`;

      if (skip_already_added_documents) {
        const allocineQuery = { _id: b64Encode(completeAllocineURL) };
        const isDocumentExisting = await collectionData.find(allocineQuery).toArray();
        const keysArray = config.keysToCheck;
        const isDocumentHasInfo = isDocumentExisting.length > 0;
        const document = isDocumentExisting[0];

        await controlData(completeAllocineURL, keysArray, isDocumentHasInfo, document);

        if (isDocumentHasInfo) continue;
      }

      /* AlloCiné info */
      const baseURLType = item_type === "movie" ? config.baseURLTypeFilms : config.baseURLTypeSeries;
      const baseURLCriticDetails = item_type === "movie" ? config.baseURLCriticDetailsFilms : config.baseURLCriticDetailsSeries;

      const allocineId = parseInt(allocineURL.match(/=(.*)\./).pop());
      const allocineHomepage = `${baseURLAllocine}${baseURLType}${allocineId}.html`;
      const allocineCriticsDetails = `${baseURLAllocine}${baseURLCriticDetails}${allocineId}${config.endURLCriticDetails}`;

      /* IMDb info */
      const imdbId = json.IMDB_ID;
      const imdbHomepage = `${config.baseURLIMDB}${imdbId}/`;

      /* BetaSeries info */
      let betaseriesId = json.BETASERIES_ID;

      const betaseriesHomepage = item_type === "movie" ? `${config.baseURLBetaseriesFilm}${betaseriesId}` : `${config.baseURLBetaseriesSerie}${betaseriesId}`;

      /* If the BetaSeries movie was categorized as a serie */
      if (betaseriesId.startsWith("serie/")) {
        const betaseriesIdNew = betaseriesId.split("/");
        betaseriesId = betaseriesIdNew[1];
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      /* Metacritic info */
      const metacriticId = json.METACRITIC_ID;
      const metacriticHomepage = item_type === "movie" ? `${config.baseURLMetacriticFilm}${metacriticId}` : `${config.baseURLMetacriticSerie}${metacriticId}`;

      const isActive = json.IS_ACTIVE_1 === "TRUE";

      const theMoviedbId = parseInt(json.THEMOVIEDB_ID);

      if (isNaN(theMoviedbId)) {
        console.log(`Something went wrong, The Movie Database id has not been found for ${completeAllocineURL}!`);
        process.exit(1);
      }

      const getIsEqualValue = await compareUsersRating(allocineHomepage, allocineURL, betaseriesHomepage, imdbHomepage, isActive, item_type, theMoviedbId);
      const isEqual = getIsEqualValue.isEqual;
      let data = null;
      if (isEqual) {
        data = getIsEqualValue.data;
      } else {
        data = await createJSON(
          allocineCriticsDetails,
          allocineURL,
          allocineHomepage,
          allocineId,
          betaseriesHomepage,
          betaseriesId,
          imdbHomepage,
          imdbId,
          isActive,
          item_type,
          metacriticHomepage,
          metacriticId,
          theMoviedbId
        );
      }

      if (typeof data.title === "string") {
        await upsertToDatabase(data, collectionData);
      } else {
        writeFileSync(`logs.txt`, `The title of ${allocineHomepage} has not been found!`, { flag: "a+" });
      }
    }
  } catch (error) {
    console.log(`Global: ${error}`);
  } finally {
    await countNullElements(collectionData);

    await client.close();
  }

  console.timeEnd("Duration", `- ${jsonArray.length} elements imported.`);
})();
