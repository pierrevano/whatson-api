/* A configuration file for the API. */
const config = {
  /* Prod config */
  baseURLAllocine: "https://www.allocine.fr",
  baseURLAllocineFilms: "https://www.allocine.fr/film/aucinema",
  baseURLAllocineSeries: "https://www.allocine.fr/series/top",
  baseURLBetaseriesAPI: "https://api.betaseries.com/shows/display",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLTMDB: "https://api.themoviedb.org/3",
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  baseURLMetacriticFilm: "https://www.metacritic.com/movie/",
  baseURLMetacriticSerie: "https://www.metacritic.com/tv/",
  baseURLRottenTomatoesFilm: "https://www.rottentomatoes.com/m/",
  baseURLRottenTomatoesSerie: "https://www.rottentomatoes.com/tv/",
  baseURLLetterboxdFilm: "https://letterboxd.com/film/",
  baseURLSensCritiqueFilm: "https://www.senscritique.com/film/-/",
  baseURLSensCritiqueSerie: "https://www.senscritique.com/serie/-/",
  baseURLAssets: "https://whatson-assets.vercel.app",

  collectionName: "data",
  dbName: "whatson",

  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
  filmsPopularityPath: "popularity_ids_films.txt",
  seriesPopularityPath: "popularity_ids_series.txt",

  getIdsFilePath: "./data/getIds.sh",

  baseURLTheaters: "https://www.allocine.fr/_/showtimes/theater-",
  corsURL: "https://cors-sites-aafe82ad9d0c.fly.dev/",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",

  keysToCheckForSearch: ["allocineId", "betaseriesId", "imdbId", "metacriticId", "rottentomatoesId", "themoviedbId", "title"],

  limit: 20,
  maxSeasonsNumber: 5,
  page: 1,

  mojo: {
    baseURL: "https://www.boxofficemojo.com",
    urlToFetch: "/chart/ww_top_lifetime_gross",
    tableRowsClasses: ".a-bordered.a-horizontal-stripes.a-size-base",

    maxIterations: 20,
    offset: 200,
  },

  maxErrorCounter: {
    default: 5,
    rotten_tomatoes: 10,
  },

  numberOfDays: 7,

  /* Tests config */
  baseURL: "http://localhost:8081",
  baseURLRemote: "https://whatson-api.onrender.com",
  maxResponseTime: 5000,
  timeout: 500000,

  films_ids_path: "./src/assets/films_ids.txt",
  series_ids_path: "./src/assets/series_ids.txt",

  checkItemsNumber: false,

  keysToCheck: [
    "_id",
    "id",
    "is_active",
    "item_type",
    "title",
    "image",
    "platforms_links",
    "seasons_number",
    "status",
    "trailer",
    "allocine",
    "betaseries",
    "imdb",
    "metacritic",
    "rotten_tomatoes",
    "letterboxd",
    "senscritique",
    "mojo",
    "popularity_average",
    "ratings_average",
    "updated_at",
  ],

  services: [
    { name: "Render", url: "https://status.render.com" },
    { name: "Vercel", url: "https://www.vercel-status.com" },

    { name: "AlloCiné", url: "https://www.allocine.fr" },
    { name: "BetaSeries", url: "https://www.betaseries.com" },
    { name: "IMDb", url: "https://www.imdb.com" },
    { name: "Metacritic", url: "https://www.metacritic.com" },
    { name: "Rotten Tomatoes", url: "https://www.rottentomatoes.com" },
    { name: "Letterboxd", url: "https://letterboxd.com" },
    { name: "SensCritique", url: "https://www.senscritique.com" },
    { name: "Mojo", url: "https://www.boxofficemojo.com" },
  ],

  maximumNumberOfItems: 46500,

  circleLimitPerDay: 3000,
  circleLimitPerInstance: 600,

  maximumThreshold: {
    default: 30,
    metacritic_or_rotten_tomatoes: 95,
    allocine_critics: 80,
  },

  minimumNumberOfItems: {
    default: 25,
    mojo: 15,
    popularity: 15,
    trailer: 200,
    senscritiqueItems: 15,

    allocine: 7,
    imdb: 4,
    betaseries: 3,
    metacritic: 4,
    rottenTomatoes: 4,
    letterboxd: 3,
    senscritique: 3,
  },

  maximumIsActiveItems: 400,

  ratingsValues: {
    minimum: {
      allocine: 0,
      betaseries: 0,
      imdb: 0,
      metacriticUsers: 0,
      metacriticCritics: 10,
      rottenTomatoes: 10,
      letterboxd: 0,
      senscritique: 0,
    },

    maximum: {
      allocine: 5,
      betaseries: 5,
      imdb: 10,
      metacriticUsers: 10,
      metacriticCritics: 100,
      rottenTomatoes: 100,
      letterboxd: 5,
      senscritique: 10,
    },
  },
};

module.exports = { config };
