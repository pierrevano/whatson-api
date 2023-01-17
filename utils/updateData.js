/* Importing the libraries that are needed for the script to work. */
const dotenv = require("dotenv");
dotenv.config();

const axios = require("axios");
const cheerio = require("cheerio");
const csv = require("csvtojson");
const shell = require("shelljs");

/* Connecting to the MongoDB database. */
const { MongoClient, ServerApiVersion } = require("mongodb");
const credentials = process.env.CREDENTIALS;
const uri = `mongodb+srv://${credentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Making the getIds.sh file executable and then running it. */
shell.exec("chmod +x ./utils/getIds.sh");
shell.exec("bash ./utils/getIds.sh");

/* Deleting the lines that contain the string "noTheMovieDBId" in the file "films_ids.txt" */
shell.exec(`sed -i '' "/noTheMovieDBId/d" ./src/assets/films_ids.txt`);

/* A constant that contains the URLs of the different websites that are used in the script. */
const config = {
  baseURLAllocine: "https://www.allocine.fr",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetails: "/film/fichefilm-",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLType: "/film/fichefilm_gen_cfilm=",
  collectionName: "data",
  dbName: "whatson",
  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
};

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
 * It connects to the database, then it updates the document with the given data
 * @param data - the data to be inserted into the database
 */
function upsertToDatabase(data) {
  /**
   * It connects to the database, then it updates the document with the same allocine.id as the one in
   * the data object, or it creates a new document if it doesn't exist
   */
  console.log(data);

  const dbName = config.dbName;
  const collectionName = config.collectionName;
  const database = client.db(dbName);

  async function run() {
    try {
      await client.connect();

      const collectionData = await database.collection(collectionName);
      const filter = { id: data.id };
      const options = { upsert: true };
      const updateDoc = { $set: data };
      await collectionData.updateOne(filter, updateDoc, options);

      await client.close();
    } catch (error) {
      console.log(`upsertToDatabase: ${error}`);
    }
  }

  run();
}

/**
 * It takes a movie's allocine homepage as an argument, and returns an object containing the movie's
 * title, image, and users rating
 * @param allocineHomepage - the URL of the movie's page on Allocine.fr
 * @returns An object with the title, image and user rating of the movie.
 */
const getAllocineFirstInfo = async (allocineHomepage) => {
  try {
    const userAgent = config.userAgent;
    const options = {
      headers: {
        "User-Agent": userAgent,
      },
    };
    const response = await axios.get(allocineHomepage, options);
    const $ = cheerio.load(response.data);

    const title = $('meta[property="og:title"]').attr("content");

    const image = $('meta[property="og:image"]').attr("content");

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = null;

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
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
    const userAgent = config.userAgent;
    const options = {
      headers: {
        "User-Agent": userAgent,
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
      const userAgent = config.userAgent;
      const options = {
        headers: {
          "User-Agent": userAgent,
        },
      };
      const response = await axios.get(betaseriesHomepage, options);
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
    let criticsRating;
    if (!imdbHomepage.includes("noImdbId")) {
      const options = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
        },
      };
      const response = await axios.get(imdbHomepage, options);
      const $ = cheerio.load(response.data);

      criticsRating = parseFloat($(".rating-bar__base-button").first().text().split("/")[0].replace("IMDb RATING", ""));
      if (isNaN(criticsRating)) console.log($(".rating-bar__base-button").first().text());
      if (isNaN(criticsRating)) criticsRating = null;
    } else {
      criticsRating = null;
    }

    return criticsRating;
  } catch (error) {
    console.log(`getImdbUsersRating - ${imdbHomepage}: ${error}`);
  }
};

/**
 * It takes in a bunch of parameters, makes a bunch of API calls, and then creates a JSON object that
 * it sends to the database
 * @param allocineId - the id of the movie on allocine.fr
 * @param allocineHomepage - the allocine homepage of the movie
 * @param allocineCriticsDetails - the URL of the page where the critics' reviews are listed
 * @param betaseriesId - the id of the movie on betaseries.com
 * @param betaseriesHomepage - the betaseries homepage of the movie
 * @param imdbId - the id of the movie on IMDB
 * @param imdbHomepage - the IMDB homepage of the movie
 */
const createJSON = async (allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId) => {
  const allocineFirstInfo = await getAllocineFirstInfo(allocineHomepage);
  const allocineCriticInfo = await getAllocineCriticInfo(allocineCriticsDetails);
  const betaseriesUsersRating = await getBetaseriesUsersRating(betaseriesHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);

  const allocineTitle = allocineFirstInfo.allocineTitle;
  const allocineImage = allocineFirstInfo.allocineImage;
  const criticsRating = allocineCriticInfo.criticsRating;
  const criticsNumber = allocineCriticInfo.criticsNumber;
  const criticsRatingDetails = allocineCriticInfo.criticsRatingDetails;
  const allocineUsersRating = allocineFirstInfo.allocineUsersRating;

  if (betaseriesId === "null") {
    betaseriesObj = null;
  } else {
    betaseriesObj = {
      id: betaseriesId,
      url: betaseriesHomepage,
      users_rating: betaseriesUsersRating,
    };
  }

  imdbObj = {
    id: imdbId,
    url: imdbHomepage,
    users_rating: imdbUsersRating,
  };

  upsertToDatabase({
    id: theMoviedbId,
    is_active: isActive,
    title: allocineTitle,
    image: allocineImage,
    allocine: {
      id: allocineId,
      url: allocineHomepage,
      critics_rating: criticsRating,
      critics_number: criticsNumber,
      critics_rating_details: criticsRatingDetails,
      users_rating: allocineUsersRating,
    },
    betaseries: betaseriesObj,
    imdb: imdbObj,
  });
};

(async () => {
  const filmsIdsFilePath = config.filmsIdsFilePath;
  const jsonArray = await csv().fromFile(filmsIdsFilePath);

  console.time("Duration");

  let lineNumber = 1;
  for await (const json of jsonArray) {
    try {
      console.timeLog("Duration", `- ${lineNumber} / ${jsonArray.length} (${((lineNumber * 100) / jsonArray.length).toFixed(1)}%)`);

      // AlloCiné info
      const baseURLAllocine = config.baseURLAllocine;
      const baseURLType = config.baseURLType;
      const baseURLCriticDetails = config.baseURLCriticDetails;
      const endURLCriticDetails = config.endURLCriticDetails;
      const allocineURL = json.URL;
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
      let betaseriesHomepage = `${baseURLBetaseriesFilm}${betaseriesId}`;

      // If the BetaSeries movie was categorized as a serie
      if (betaseriesId.startsWith("serie/")) {
        const betaseriesIdNew = betaseriesId.split("/");
        betaseriesId = betaseriesIdNew[1];
        betaseriesHomepage = `${baseURLBetaseriesSerie}${betaseriesId}`;
      }

      const isActive = json.IS_ACTIVE === "TRUE";

      const theMoviedbId = parseInt(json.THEMOVIEDB_ID);

      await createJSON(allocineCriticsDetails, allocineHomepage, allocineId, betaseriesHomepage, betaseriesId, imdbHomepage, imdbId, isActive, theMoviedbId);

      lineNumber++;
    } catch (error) {
      console.log(`Global: ${error}`);
    }
  }

  console.timeEnd("Duration", `- ${jsonArray.length} elements imported.`);
})();
