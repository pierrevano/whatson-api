/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const csv = require("csvtojson");
const shell = require("shelljs");
const { writeFileSync } = require("fs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Importing the config and node_vars_values from the src folder. */
const { config } = require("../src/config");
const { node_vars_values } = require("../src/node_vars_values");

/* Importing the functions from the files in the src folder. */
const { b64Encode } = require("../src/utils/b64Encode");
const { jsonArrayFiltered } = require("../src/utils/jsonArrayFiltered");
const { getAllocineCriticInfo } = require("../src/getAllocineCriticInfo");
const { getAllocineFirstInfo } = require("../src/getAllocineFirstInfo");
const { getBetaseriesUsersRating } = require("../src/getBetaseriesUsersRating");
const { getImdbUsersRating } = require("../src/getImdbUsersRating");
const { getPlatformsLinks } = require("../src/getPlatformsLinks");
const { updateIds } = require("../src/updateIds");

const item_type = node_vars_values.item_type;

/* Checking if the variable get_ids is true. If it is not true, it will run the function updateIds(). */
const get_ids = node_vars_values.get_ids;
if (get_ids === "update_ids") updateIds();

/* Checking if the second argument is true. If it is, it exits the process. */
const get_db = node_vars_values.get_db;
if (get_db !== "update_db") process.exit(1);

/* Removing the file logs.txt */
shell.exec("rm -f ./logs.txt");

/**
 * It takes in a data object and a collectionData object, and then it updates the database with the
 * data object
 * @param data - The data to be inserted into the database.
 * @param collectionData - The collection object that we created earlier.
 */
async function upsertToDatabase(data, collectionData) {
  try {
    console.log(data);

    const filter = { _id: b64Encode(data.allocine.url) };
    const options = { upsert: true };
    const updateDoc = { $set: data };

    await collectionData.updateOne(filter, updateDoc, options);
  } catch (error) {
    console.log(`upsertToDatabase: ${error}`);
  }
}

/**
 * It counts the number of documents in the collection, and then counts the number of null values for
 * each of the three rating fields. If the number of null values is greater than 1/3 of the number of
 * documents in the collection, the function exits with an error code
 * @param collectionData - The collection to be queried.
 */
async function countNullElements(collectionData) {
  try {
    /* Counting the number of documents in the collection. */
    const documents = await collectionData.estimatedDocumentCount();
    console.log(`Number of documents in the collection: ${documents}`);

    /* The above code is counting the number of null values for the allocine.users_rating field. */
    const query_allocine = { "allocine.users_rating": null };
    const countAllocineNull = await collectionData.countDocuments(query_allocine);
    console.log(`Number of null for allocine.users_rating: ${countAllocineNull}`);

    if ((countAllocineNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of Allociné ratings are set to null");
      process.exit(1);
    }

    const query_allocine_critics = { "allocine.critics_rating": null };
    const countAllocineCriticsNull = await collectionData.countDocuments(query_allocine_critics);
    console.log(`Number of null for allocine.critics_rating: ${countAllocineCriticsNull}`);

    if ((countAllocineCriticsNull * 100) / documents > 80) {
      console.log("Something went wrong, at least 80% of Allociné critics ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of null values for the betaseries.users_rating field. */
    const query_betaseries = { "betaseries.users_rating": null };
    const countBetaseriesNull = await collectionData.countDocuments(query_betaseries);
    console.log(`Number of null for betaseries.users_rating: ${countBetaseriesNull}`);

    if ((countBetaseriesNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of Betaseries ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of documents in the collection that have a null value
      for the imdb.users_rating field. */
    const query_imdb = { "imdb.users_rating": null };
    const countIMDbNull = await collectionData.countDocuments(query_imdb);
    console.log(`Number of null for imdb.users_rating: ${countIMDbNull}`);

    if ((countIMDbNull * 100) / documents > 30) {
      console.log("Something went wrong, at least 30% of IMDb ratings are set to null");
      process.exit(1);
    }
  } catch (error) {
    console.log(`countNullElements: ${error}`);
  }
}

/**
 * It creates an object called data that contains the data that was scraped from the different websites
 * @param allocineCriticsDetails - the URL of the page that contains the critics' rating details.
 * @param allocineHomepage - the URL of the show on Allocine.
 * @param allocineId - the id of the show on Allocine.
 * @param betaseriesHomepage - The homepage of the show on betaseries.com.
 * @param betaseriesId - the id of the show on betaseries.com
 * @param imdbHomepage - The URL of the IMDb page.
 * @param imdbId - the IMDb ID of the movie or TV show.
 * @param isActive - a boolean that indicates whether the show is still airing or not.
 * @param theMoviedbId - the id of the movie/tv show on The Movie Database.
 * @returns The function createJSON is returning an object called data.
 */
const createJSON = async (allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId) => {
  /* Getting the data from the different websites. */
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage, betaseriesHomepage, theMoviedbId);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const betaseriesPlatformsLinks = await getPlatformsLinks(allocineHomepage, imdbHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);

  /* Creating variables that will be used in the next step. */
  const allocineTitle = allocineFirstInfo.allocineTitle;
  const allocineImage = allocineFirstInfo.allocineImage;
  const allocinePlaceholder = allocineFirstInfo.allocinePlaceholder;
  const criticsRating = allocineCriticInfo.criticsRating;
  const criticsNumber = allocineCriticInfo.criticsNumber;
  const criticsRatingDetails = allocineCriticInfo.criticsRatingDetails;
  const allocineUsersRating = allocineFirstInfo.allocineUsersRating;
  const allocineSeasonsNumber = allocineFirstInfo.allocineSeasonsNumber;
  const trailer = allocineFirstInfo.trailer;

  /* Creating an object called allocineObj that contains the properties of the two objects
  allocineBaseObj and allocineSecondInfo. */
  const allocineBaseObj = {
    id: allocineId,
    url: allocineHomepage,
    trailer: trailer,
    users_rating: allocineUsersRating,
  };
  const allocineSecondInfo = {
    critics_rating: criticsRating,
    critics_number: criticsNumber,
    critics_rating_details: criticsRatingDetails,
    seasons_number: allocineSeasonsNumber,
  };
  const allocineObj = Object.assign(allocineBaseObj, allocineSecondInfo);

  /* Creating an object called betaseriesObj. */
  let betaseriesObj = null;
  if (betaseriesId !== "null") {
    betaseriesObj = {
      id: betaseriesId,
      url: betaseriesHomepage,
      users_rating: betaseriesUsersRating,
      platforms_links: betaseriesPlatformsLinks,
    };
  }

  /* Creating an object called imdbObj. */
  const imdbObj = {
    id: imdbId,
    url: imdbHomepage,
    users_rating: imdbUsersRating,
  };

  /* Creating a new object called data and assigning it the values of the variables that were created
  in the previous steps. */
  const data = {
    id: theMoviedbId,
    is_active: isActive,
    item_type: item_type,
    title: allocineTitle,
    image: allocineImage,
    placeholder: allocinePlaceholder,
    allocine: allocineObj,
    betaseries: betaseriesObj,
    imdb: imdbObj,
  };

  return data;
};

/* Importing data from a CSV file into a MongoDB database. */
(async () => {
  const dbName = config.dbName;
  const collectionName = config.collectionName;
  const database = client.db(dbName);
  const collectionData = database.collection(collectionName);

  const skip_already_added_documents = node_vars_values.skip_already_added_documents;

  /* Updating all documents in the collection to is_active: false. */
  if (!skip_already_added_documents && get_ids === "update_ids") {
    const updateQuery = { $set: { is_active: false } };
    await collectionData.updateMany({ item_type: item_type }, updateQuery);
    console.log("All documents have been set to false.");
  }

  let idsFilePath;
  if (item_type === "movie") {
    idsFilePath = config.filmsIdsFilePath;
  } else {
    idsFilePath = config.seriesIdsFilePath;
  }
  console.log(`Ids file path to use: ${idsFilePath}`);

  const is_not_active = node_vars_values.is_not_active;
  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  let jsonArray = [];

  /* Checking if the is_not_active variable is not active or if it is active. If it is not active, it
  will filter the jsonArrayFromCSV. If it is active, it will not filter the jsonArrayFromCSV. */
  jsonArray = !is_not_active || is_not_active === "active" ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;

  /* Setting the index_to_start variable to the value of the node_vars[5] variable. If node_vars[5] is
  not defined, then index_to_start is set to 0. */
  let index_to_start = node_vars_values.index_to_start;
  if (!index_to_start) index_to_start = 0;

  console.time("Duration");

  try {
    /* Printing out the value of each variable in the node_vars_values object. */
    for (let variable in node_vars_values) {
      let variable_value = node_vars_values[variable];
      if (!node_vars_values[variable]) variable_value = "not set";
      console.log(`${variable}: ${variable_value}`);
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
        const keysArray = ["allocine", "betaseries", "id", "image", "imdb", "is_active", "item_type", "title"];
        const isDocumentHasInfo = isDocumentExisting.length > 0;
        const document = isDocumentExisting[0];
        keysArray.forEach((key) => {
          if (isDocumentHasInfo && !document.hasOwnProperty(`${key}`)) {
            console.log(`Missing ${key} for ${completeAllocineURL}`);
            process.exit(0);
          }
        });
        if (isDocumentHasInfo && (!document.title || document.title === null)) {
          console.log(`Missing title for ${completeAllocineURL}`);
          process.exit(0);
        }
        if (isDocumentHasInfo && (!document.image || document.image === null)) {
          console.log(`Missing image for ${completeAllocineURL}`);
          process.exit(0);
        }
        if (isDocumentHasInfo) continue;
      }

      // AlloCiné info
      let baseURLType;
      let baseURLCriticDetails;
      if (item_type === "movie") {
        baseURLType = config.baseURLTypeFilms;
        baseURLCriticDetails = config.baseURLCriticDetailsFilms;
      } else {
        baseURLType = config.baseURLTypeSeries;
        baseURLCriticDetails = config.baseURLCriticDetailsSeries;
      }

      const endURLCriticDetails = config.endURLCriticDetails;
      const allocineId = parseInt(allocineURL.match(/=(.*)\./).pop());
      const allocineHomepage = `${baseURLAllocine}${baseURLType}${allocineId}.html`;
      const allocineCriticsDetails = `${baseURLAllocine}${baseURLCriticDetails}${allocineId}${endURLCriticDetails}`;

      // IMDb info
      const baseURLIMDB = config.baseURLIMDB;
      const imdbId = json.IMDB_ID;
      const imdbHomepage = `${baseURLIMDB}${imdbId}/`;

      // BetaSeries info
      const baseURLBetaseriesFilm = config.baseURLBetaseriesFilm;
      const baseURLBetaseriesSerie = config.baseURLBetaseriesSerie;
      let betaseriesId = json.BETASERIES_ID;

      let betaseriesHomepage;
      if (item_type === "movie") {
        betaseriesHomepage = `${baseURLBetaseriesFilm}${betaseriesId}`;
      } else {
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      // If the BetaSeries movie was categorized as a serie
      if (betaseriesId.startsWith("serie/")) {
        const betaseriesIdNew = betaseriesId.split("/");
        betaseriesId = betaseriesIdNew[1];
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      const isActive = json.IS_ACTIVE === "TRUE";

      const theMoviedbId = parseInt(json.THEMOVIEDB_ID);

      if (isNaN(theMoviedbId)) {
        console.log(`Something went wrong, The Movie Database id has not been found for ${completeAllocineURL}!`);
        process.exit(1);
      }

      const data = await createJSON(allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId);
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
