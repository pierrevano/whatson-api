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
  baseURLBetaseriesAPI: "https://api.betaseries.com/shows/display",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLImgTMDB: "https://image.tmdb.org/t/p/w1280",
  baseURLTMDB: "https://api.themoviedb.org/3",
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  collectionName: "data",
  dbName: "whatson",
  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
};

const node_vars = process.argv.slice(2);

const node_vars_values = {
  item_type: node_vars[0],
  get_ids: node_vars[1],
  get_db: node_vars[2],
  environment: node_vars[3],
  is_not_active: node_vars[4],
  index_to_start: node_vars[5],
  skip_already_added_documents: node_vars[6],
};

const item_type = node_vars_values.item_type;

/* Checking if the variable get_ids is true. If it is not true, it will run the function updateIds(). */
const environment = node_vars_values.environment;
const get_ids = node_vars_values.get_ids;
if (get_ids === "update_ids") updateIds();

/* Checking if the second argument is true. If it is, it exits the process. */
const get_db = node_vars_values.get_db;
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
 * It takes a string and removes all the extra characters that are not needed
 * @param string - The string to be modified.
 * @returns the string with the extra characters removed.
 */
function removeExtraChar(string) {
  return string.replace(/(\r\n|\n|\r|\t|amp;)/gm, "");
}

/**
 * It takes in a cheerio object and a boolean value, and returns the content url
 * @param $ - The cheerio object
 * @param backup - If the first script tag doesn't work, we'll try the last one.
 * @returns The content of the last script tag with the type application/ld+json
 */
function getContentUrl($, backup) {
  const JSONValue = backup ? $('script[type="application/ld+json"]') : $('script[type="application/ld+json"]').last();
  const contentParsed = JSON.parse(removeExtraChar(JSONValue.text()));

  return contentParsed;
}

/**
 * It takes a URL and an optional options object, makes a request to the URL, and returns a cheerio
 * object
 * @param url - The URL of the page you want to scrape.
 * @param options - This is an object that contains the headers and other options that you want to pass
 * to the request.
 * @returns A function that returns a promise that resolves to a cheerio object.
 */
const getCheerioContent = async (url, options) => {
  const response = await axios.get(url, options);
  const $ = cheerio.load(response.data);

  return $;
};

/**
 * It gets the trailer link for a movie or TV show
 * @param allocineHomepage - The URL of the movie or TV show.
 * @param betaseriesHomepage - The URL to the TV Show's page on BetaSeries.
 * @param options - This is the object that contains the headers and the proxy.
 * @returns The trailer variable is being returned.
 */
const getTrailer = async (allocineHomepage, betaseriesHomepage, options) => {
  let trailer = null;
  /* TV Show logic to get trailer link. */
  if (allocineHomepage.includes(config.baseURLTypeSeries)) {
    let url = `${betaseriesHomepage}`;
    let $ = await getCheerioContent(url, options);
    const content = getContentUrl($, false);
    if (content && content.video && content.video.embedUrl) trailer = content.video.embedUrl;
    console.log(`trailer: ${trailer}`);

    /* Checking to see if the trailer variable is null. If it is, it will run the code below as a backup video link. */
    if (!trailer) {
      url = `${allocineHomepage}`;
      console.log(`url: ${url}`);

      $ = await getCheerioContent(url, options);
      const hasInactiveVideos = [...$(".third-nav .inactive")].map((e) => removeExtraChar($(e).text())).includes("Vidéos");
      console.log(`hasInactiveVideos: ${hasInactiveVideos}`);

      if (!hasInactiveVideos) {
        const allocineId = parseInt(allocineHomepage.match(/=(.*)\./).pop());
        url = `${config.baseURLAllocine}${config.baseURLCriticDetailsSeries}${allocineId}/videos/`;
        console.log(`url: ${url}`);

        $ = await getCheerioContent(url, options);
        const linkToVideo = $(".meta-title-link").first().attr("href");
        url = `${config.baseURLAllocine}${linkToVideo}`;
        console.log(`url: ${url}`);

        if (linkToVideo) {
          $ = await getCheerioContent(url, options);
          const isPageBroken = $.html().length === 0;
          console.log(`isPageBroken: ${isPageBroken}`);
          if (!isPageBroken) {
            const content = getContentUrl($, true);
            trailer = content.contentUrl;
            console.log(`trailer: ${trailer}`);
          }
        }
      }
    }
  } else {
    /* Movie logic to get trailer link */
    const url = `${allocineHomepage}`;
    console.log(`url: ${url}`);

    $ = await getCheerioContent(url, options);
    const itemJSON = getContentUrl($, true);
    if (itemJSON && itemJSON.trailer) {
      const url = itemJSON.trailer.url;
      $ = await getCheerioContent(url, options);
      const content = getContentUrl($, true);
      trailer = content.contentUrl;
      console.log(`trailer: ${trailer}`);
    }
  }

  return trailer;
};

/**
 * It takes an allocineHomepage and a theMoviedbId as parameters, and returns an image
 * @param allocineHomepage - the URL of the movie or series on Allocine
 * @param theMoviedbId - the id of the movie or series on TheMovieDB
 * @returns The image of the movie or series
 */
const getImageFromTMDB = async (allocineHomepage, theMoviedbId) => {
  try {
    const baseURLTMDB = config.baseURLTMDB;
    const type = allocineHomepage.includes(config.baseURLTypeSeries) ? "tv" : "movie";
    const themoviedb_api_key = process.env.THEMOVIEDB_API_KEY;
    const url = `${baseURLTMDB}/${type}/${theMoviedbId}?api_key=${themoviedb_api_key}`;
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      validateStatus: (status) => {
        if (status === 404) writeFileSync(`logs.txt`, `getImageFromTMDB 404: ${allocineHomepage}`, null, { flag: "a+" }, 2);
        return status === 200 || status === 404;
      },
    };
    const response = await axios.get(url, options);
    const image_path = response.data.poster_path || response.data.profile_path;
    const baseURLImgTMDB = config.baseURLImgTMDB;
    const image = `${baseURLImgTMDB}${image_path}`;

    return image;
  } catch (error) {
    console.log(`getImageFromTMDB - ${allocineHomepage}: ${error}`);
  }
};

/**
 * It gets the title, image, users rating, seasons number and trailer of a movie or a series from the
 * Allocine website
 * @param allocineHomepage - the allocine homepage of the movie/series
 * @param betaseriesHomepage - the betaseries homepage of the movie/series
 * @param theMoviedbId - the id of the movie/series on TheMovieDB
 * @returns An object with the following properties:
 * - allocineTitle
 * - allocineImage
 * - allocineUsersRating
 * - allocineSeasonsNumber
 * - trailer
 */
const getAllocineFirstInfo = async (allocineHomepage, betaseriesHomepage, theMoviedbId) => {
  try {
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      validateStatus: (status) => {
        if (status === 404) writeFileSync(`logs.txt`, `allocineHomepage 404: ${allocineHomepage}`, null, { flag: "a+" }, 2);
        return status === 200 || status === 404;
      },
    };
    const $ = await getCheerioContent(allocineHomepage, options);

    const title = $('meta[property="og:title"]').attr("content");
    let image = $('meta[property="og:image"]').attr("content");
    if (image.includes("empty_portrait")) image = await getImageFromTMDB(allocineHomepage, theMoviedbId);

    let allocineUsersRating = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
    if (isNaN(allocineUsersRating)) allocineUsersRating = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));

    if (isNaN(allocineUsersRating)) {
      const allocineUsersRatingEq1 = parseFloat($(".stareval-note").eq(1).text().replace(",", "."));
      const allocineUsersRatingEq0 = parseFloat($(".stareval-note").eq(0).text().replace(",", "."));
      writeFileSync(`logs.txt`, `${allocineHomepage}: Eq1 - ${allocineUsersRatingEq1} / Eq0 - ${allocineUsersRatingEq0}`, null, { flag: "a+" }, 2);

      allocineUsersRating = null;
    }

    let allocineSeasonsNumber = null;
    if (allocineHomepage.includes(config.baseURLTypeSeries)) allocineSeasonsNumber = parseInt($(".stats-number").eq(0).text());

    const trailer = await getTrailer(allocineHomepage, betaseriesHomepage, options);

    let allocineFirstInfo = {
      allocineTitle: title,
      allocineImage: image,
      allocineUsersRating: allocineUsersRating,
      allocineSeasonsNumber: allocineSeasonsNumber,
      trailer: trailer,
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
    const $ = await getCheerioContent(allocineCriticsDetails, options);

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
      const options = {
        validateStatus: (status) => {
          if (status === 404) writeFileSync(`logs.txt`, `betaseriesHomepage 404: ${betaseriesHomepage}`, null, { flag: "a+" }, 2);
          return status === 200 || status === 404;
        },
      };
      const $ = await getCheerioContent(betaseriesHomepage, options);

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
 * It takes an IMDB homepage as an argument and returns an array of objects containing the name and
 * link_url of the platforms where the movie or TV show is available
 * @param imdbHomepage - the IMDB homepage of the movie or TV show.
 * @returns An array of objects with the name and link_url of the platforms.
 */
const getBetaseriesPlatformsLinks = async (imdbHomepage) => {
  try {
    const betaseries_api_key = process.env.BETASERIES_API_KEY;
    const baseURLBetaseriesAPI = config.baseURLBetaseriesAPI;
    const imdbHomepageId = imdbHomepage.split("/")[4];
    const url = `${baseURLBetaseriesAPI}?key=${betaseries_api_key}&imdb_id=${imdbHomepageId}`;
    axiosRetry(axios, { retries: 3, retryDelay: () => 3000 });
    const options = {
      validateStatus: (status) => {
        if (status === 404) writeFileSync(`logs.txt`, `getBetaseriesPlatformsLinks 404: ${imdbHomepage}`, null, { flag: "a+" }, 2);
        return status === 200 || status === 404;
      },
    };
    const response = await axios.get(url, options);
    let platformsLinks = null;
    if (response.data.show.platforms && response.data.show.platforms.svods) {
      const svods = response.data.show.platforms.svods;
      platformsLinks = [];
      svods.forEach((element) => {
        platformsLinks.push({
          name: element.name,
          link_url: element.link_url,
        });
      });
      if (platformsLinks.length === 0) platformsLinks = null;
    }
    return platformsLinks;
  } catch (error) {
    console.log(`getBetaseriesPlatformsLinks - ${imdbHomepage}: ${error}`);
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
    const $ = await getCheerioContent(imdbHomepage, options);

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
  const betaseriesPlatformsLinks = await getBetaseriesPlatformsLinks(imdbHomepage);
  const imdbUsersRating = await getImdbUsersRating(imdbHomepage);

  /* Creating variables that will be used in the next step. */
  const allocineTitle = allocineFirstInfo.allocineTitle;
  const allocineImage = allocineFirstInfo.allocineImage;
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

      console.timeLog("Duration", `- ${index + 1} / ${jsonArray.length} (${(((index + 1) * 100) / jsonArray.length).toFixed(1)}%)`);

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
