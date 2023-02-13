/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const axiosRetry = require("axios-retry");
const axios = require("axios");
const cheerio = require("cheerio");
const csv = require("csvtojson");
const shell = require("shelljs");
const { writeFileSync } = require("fs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* A configuration file for the project. */
const config = {
  baseURLAllocine: "https://www.allocine.fr",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  collectionName: "data",
  dbName: "whatson",
  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
};

const node_vars = process.argv.slice(2);
const item_type = node_vars[0];

/* Checking if the variable get_ids is true. If it is not true, it will run the function updateIds(). */
const environment = node_vars[3];
const get_ids = node_vars[1];
if (get_ids === "update_ids") updateIds();

/* Checking if the second argument is true. If it is, it exits the process. */
const get_db = node_vars[2];
if (get_db !== "update_db") process.exit(1);

/* Removing the file logs.txt */
shell.exec("rm -f ./logs.txt");

/**
 * It takes a string, converts it to a Buffer, and then converts that Buffer to a base64 string
 * @param string - The string to be encoded.
 * @returns The string is being encoded in base64.
 */
function b64Encode(string) {
  return Buffer.from(string, "utf8").toString("base64");
}

/**
 * It takes a string as an argument and returns a number
 * @param title - The title of the movie
 * @returns The number of the title.
 */
function convertTitleToNumber(title) {
  switch (title) {
    case "Chef-d'oeuvre":
      return 5;
    case "Excellent":
      return 4.5;
    case "Très bien":
      return 4;
    case "Bien":
      return 3.5;
    case "Pas mal":
      return 3;
    case "Moyen":
      return 2.5;
    case "Pas terrible":
      return 2;
    case "Mauvais":
      return 1.5;
    case "Très mauvais":
      return 1;
    case "Nul":
      return 0.5;
    default:
      return;
  }
}

/**
 * It takes a JSON array as an argument and returns a filtered array of JSON objects where the value of
 * the key "IS_ACTIVE" is "TRUE"
 * @param jsonArray - The array of JSON objects that you want to filter.
 * @returns the filtered array.
 */
function jsonArrayFiltered(jsonArray) {
  return jsonArray.filter((element) => element.IS_ACTIVE === "TRUE");
}

/**
 * It updates the ids of the movies and tv shows in the database
 */
function updateIds() {
  shell.exec("chmod +x ./utils/getIds.sh");

  if (!environment) {
    if (item_type === "movie") {
      shell.exec("bash ./utils/getIds.sh no_delete circleci movie");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./utils/getIds.sh no_delete circleci tvshow");
      shell.exec(`sed -i "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  } else {
    if (item_type === "movie") {
      shell.exec("bash ./utils/getIds.sh delete local movie");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);
    } else {
      shell.exec("bash ./utils/getIds.sh delete local tvshow");
      shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/series_ids.txt`);
    }
  }
}

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

    if (countAllocineNull > documents / 3) {
      console.log("Something went wrong, at least 1/3 of Allociné ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of null values for the betaseries.users_rating field. */
    const query_betaseries = { "betaseries.users_rating": null };
    const countBetaseriesNull = await collectionData.countDocuments(query_betaseries);
    console.log(`Number of null for betaseries.users_rating: ${countBetaseriesNull}`);

    if (countBetaseriesNull > documents / 3) {
      console.log("Something went wrong, at least 1/3 of Betaseries ratings are set to null");
      process.exit(1);
    }

    /* The above code is counting the number of documents in the collection that have a null value
      for the imdb.users_rating field. */
    const query_imdb = { "imdb.users_rating": null };
    const countIMDbNull = await collectionData.countDocuments(query_imdb);
    console.log(`Number of null for imdb.users_rating: ${countIMDbNull}`);

    if (countIMDbNull > documents / 3) {
      console.log("Something went wrong, at least 1/3 of IMDb ratings are set to null");
      process.exit(1);
    }
  } catch (error) {
    console.log(`countNullElements: ${error}`);
  }
}

/**
 * It takes a movie's allocine homepage as an argument, and returns an object containing the movie's
 * title, image, and users rating
 * @param allocineHomepage - the URL of the movie's page on Allocine.fr
 * @returns An object with the title, image and user rating of the movie.
 */
const getAllocineFirstInfo = async (allocineHomepage) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      validateStatus: (status) => {
        if (status === 404) writeFileSync(`logs.txt`, `allocineHomepage 404: ${allocineHomepage}`, null, { flag: "a+" }, 2);
        return status === 200 || status === 404;
      },
    };
    const response = await axios.get(allocineHomepage, options);
    const $ = cheerio.load(response.data);

    const title = $('meta[property="og:title"]').attr("content");
    const image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));

    if (isNaN(allocineUsersRating)) {
      const allocineUsersRatingEq1 = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
      const allocineUsersRatingEq0 = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
      writeFileSync(`logs.txt`, `${allocineHomepage}: Eq1 - ${allocineUsersRatingEq1} / Eq0 - ${allocineUsersRatingEq0}`, null, { flag: "a+" }, 2);

      allocineUsersRating = null;
    }

    let allocineSeasonsNumber = null;
    if (allocineHomepage.includes("ficheserie_gen_cserie")) {
      allocineSeasonsNumber = parseInt($(".stats-number").eq(0).text());
    }

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      allocineSeasonsNumber: allocineSeasonsNumber,
    };

    return allocineFirstInfo;
  } catch (error) {
    console.log(`getAllocineFirstInfo - ${allocineHomepage}: ${error}`);
  }
};

/**
 * It takes the URL of a movie's critics page on Allocine, scrapes the page, and returns an object
 * containing the number of critics, the average rating, and the details of each critic's rating
 * @param allocineCriticsDetails - the URL of the page containing the critics' ratings
 * @returns An object with the following properties:
 * - criticsNumber: the number of critics
 * - criticsRating: the average rating of the critics
 * - criticsRatingDetails: an array of objects with the following properties:
 *   - criticName: the name of the critic
 *   - criticRating: the rating of the critic
 */
const getAllocineCriticInfo = async (allocineCriticsDetails) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      validateStatus: (status) => {
        if (status === 404) writeFileSync(`logs.txt`, `allocineCriticsDetails 404: ${allocineCriticsDetails}`, null, { flag: "a+" }, 2);
        return status === 200 || status === 404;
      },
    };
    const response = await axios.get(allocineCriticsDetails, options);
    const $ = cheerio.load(response.data);

    let criticsRatingDetails;
    criticsRatingDetails = $(".js-anchor-link")
      .map((_i, element) => [
        {
          criticName: element.children[0].data,
          criticRating: convertTitleToNumber(element.parent.children[0].attribs.title),
        },
      ])
      .get();
    if (criticsRatingDetails.length === 0) criticsRatingDetails = null;

    let sum = 0;
    $(".js-anchor-link")
      .map((_i, element) => (sum += convertTitleToNumber(element.parent.children[0].attribs.title)))
      .get();

    let criticsRating;
    let criticsRatingLength;
    criticsRatingLength = $(".js-anchor-link").length;
    if (criticsRatingLength === 0) criticsRatingLength = null;
    criticsRating = criticsRatingLength === null ? null : parseFloat((sum / criticsRatingLength).toFixed(1));

    const allocineCriticInfo = {
      criticsNumber: criticsRatingLength,
      criticsRating: criticsRating,
      criticsRatingDetails: criticsRatingDetails,
    };

    return allocineCriticInfo;
  } catch (error) {
    console.log(`getAllocineCriticInfo - ${allocineCriticsDetails}: ${error}`);
  }
};

/**
 * It takes a betaseriesHomepage as an argument, and returns the criticsRating of the show
 * @param betaseriesHomepage - the URL of the show's page on betaseries.com
 * @returns The critics rating of the show.
 */
const getBetaseriesUsersRating = async (betaseriesHomepage) => {
  try {
    let criticsRating;
    if (!betaseriesHomepage.includes("null")) {
      axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
      const response = await axios.get(betaseriesHomepage);
      const $ = cheerio.load(response.data);

      criticsRating = parseFloat($(".js-render-stars")[0].attribs.title.replace(" / 5", "").replace(",", "."));
      if (criticsRating === 0) criticsRating = null;
    } else {
      criticsRating = null;
    }

    return criticsRating;
  } catch (error) {
    console.log(`getBetaseriesUsersRating - ${betaseriesHomepage}: ${error}`);
  }
};

/**
 * It takes the IMDb homepage of a movie as an argument, and returns the IMDb users rating of that
 * movie
 * @param imdbHomepage - The URL of the movie's IMDB page.
 * @returns The critics rating of the movie.
 */
const getImdbUsersRating = async (imdbHomepage) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
      },
    };
    const response = await axios.get(imdbHomepage, options);
    const $ = cheerio.load(response.data);

    criticsRating = parseFloat($(".rating-bar__base-button").first().text().split("/")[0].replace("IMDb RATING", ""));
    if (isNaN(criticsRating)) {
      const ratingBarText = $(".rating-bar__base-button").first().text();
      writeFileSync(`logs.txt`, `${imdbHomepage}: ${ratingBarText}`, null, { flag: "a+" }, 2);

      criticsRating = null;
    }

    return criticsRating;
  } catch (error) {
    console.log(`getImdbUsersRating - ${imdbHomepage}: ${error}`);
  }
};

/**
 * It takes in a bunch of parameters, and returns a JSON object
 * @param allocineCriticsDetails - the URL of the page where the critics' rating details are
 * @param allocineHomepage - the URL of the movie on Allocine
 * @param allocineId - the id of the movie on allocine.fr
 * @param betaseriesHomepage - the betaseries homepage of the movie
 * @param betaseriesId - the id of the movie on betaseries.com
 * @param imdbHomepage - the IMDB homepage of the movie
 * @param imdbId - the IMDB ID of the movie
 * @param isActive - true or false
 * @param theMoviedbId - the id of the movie in the database
 * @returns An object with the following properties:
 * - id: theMoviedbId
 * - is_active: isActive
 * - title: allocineTitle
 * - image: allocineImage
 * - allocine: {
 *   id: allocineId,
 *   url: allocineHomepage,
 *   critics_rating: criticsRating,
 *   critics_number: criticsNumber,
 */
const createJSON = async (allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId) => {
  /* Getting the data from the different websites. */
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);

  /* Creating variables that will be used in the next step. */
  const allocineTitle = allocineFirstInfo.allocineTitle;
  const allocineImage = allocineFirstInfo.allocineImage;
  const criticsRating = allocineCriticInfo.criticsRating;
  const criticsNumber = allocineCriticInfo.criticsNumber;
  const criticsRatingDetails = allocineCriticInfo.criticsRatingDetails;
  const allocineUsersRating = allocineFirstInfo.allocineUsersRating;
  const allocineSeasonsNumber = allocineFirstInfo.allocineSeasonsNumber;

  /* Creating an object called allocineObj that contains the properties of the two objects
  allocineBaseObj and allocineSecondInfo. */
  const allocineBaseObj = {
    id: allocineId,
    url: allocineHomepage,
    users_rating: allocineUsersRating,
  };
  const allocineSecondInfo = {
    critics_rating: criticsRating,
    critics_number: criticsNumber,
    critics_rating_details: criticsRatingDetails,
    seasons_number: allocineSeasonsNumber,
  };
  const allocineObj = Object.assign(allocineBaseObj, allocineSecondInfo);

  /* Creating an object with the betaseriesId, betaseriesHomepage, and betaseriesUsersRating. */
  let betaseriesObj = null;
  if (betaseriesId !== "null") {
    betaseriesObj = {
      id: betaseriesId,
      url: betaseriesHomepage,
      users_rating: betaseriesUsersRating,
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

  const skipAlreadyAddedDocuments = node_vars[6];

  /* The above code is updating all documents in the collectionData collection where the item_type is
  equal to the item_type variable. The updateQuery variable is setting the is_active field to false. */
  if (!skipAlreadyAddedDocuments) {
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

  const is_not_active = node_vars[4];
  const jsonArrayFromCSV = await csv().fromFile(idsFilePath);
  let jsonArray = [];
  /* Checking if the is_not_active variable is false. If it is false, it will run the jsonArrayFiltered
  function on the jsonArrayFromCSV variable. If it is true, it will set the jsonArray variable to
  the jsonArrayFromCSV variable. */
  jsonArray = !is_not_active ? jsonArrayFiltered(jsonArrayFromCSV) : jsonArrayFromCSV;

  /* Setting the index_to_start variable to the value of the node_vars[5] variable. If node_vars[5] is
  not defined, then index_to_start is set to 0. */
  let index_to_start = node_vars[5];
  if (!index_to_start) index_to_start = 0;

  console.time("Duration");

  try {
    /* Logging the values of the variables to the console. */
    console.log(`item_type: ${item_type}`);
    console.log(`get_db: ${get_db}`);
    console.log(`get_ids: ${get_ids}`);
    console.log(`index_to_start: ${index_to_start}`);
    console.log(`environment: ${environment}`);
    console.log(`is_not_active: ${is_not_active}`);

    for (let index = index_to_start; index < jsonArray.length; index++) {
      const json = jsonArray[index];

      console.timeLog("Duration", `- ${index + 1} / ${jsonArray.length} (${(((index + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

      const baseURLAllocine = config.baseURLAllocine;
      const allocineURL = json.URL;
      const completeAllocineURL = `${baseURLAllocine}${allocineURL}`;

      if (skipAlreadyAddedDocuments) {
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
        console.log(`Something went wrong, The Movie Database id ${theMoviedbId} has not been found!`);
        process.exit(1);
      }

      const data = await createJSON(allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId);
      if (typeof data.title === "string") {
        await upsertToDatabase(data, collectionData);
      } else {
        writeFileSync(`logs.txt`, `The title of ${allocineHomepage} has not been found!`, null, { flag: "a+" }, 2);
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
