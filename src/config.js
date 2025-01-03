require("dotenv").config();

const baseURL = {
  allocine: "https://www.allocine.fr",
  assets: "https://whatson-assets.vercel.app",
  betaseries: "https://www.betaseries.com",
  betaseriesAPI: "https://api.betaseries.com",
  dailymotion: "https://www.dailymotion.com/embed/video/",
  imdb: "https://www.imdb.com",
  letterboxd: "https://letterboxd.com",
  metacritic: "https://www.metacritic.com",
  mojo: "https://www.boxofficemojo.com",
  render: "https://status.render.com",
  rottenTomatoes: "https://www.rottentomatoes.com",
  senscritique: "https://www.senscritique.com",
  tmdbAPI: "https://api.themoviedb.org/3",
  tmdb: "https://www.themoviedb.org",
  trakt: "https://trakt.tv",
  vercel: "https://www.vercel-status.com",
  whatsonAPI: "https://whatson-api.onrender.com",
  whatsonAPICircleCI: "https://whatson-api-circleci.onrender.com",
};

const config = {
  /* Credentials */
  betaseriesApiKey: process.env.BETASERIES_API_KEY,
  digestSecretValue: process.env.DIGEST_SECRET_VALUE,
  internalApiKey: process.env.INTERNAL_API_KEY,
  mongoDbCredentials: process.env.CREDENTIALS,
  tmdbApiKey: process.env.THEMOVIEDB_API_KEY,

  /* Database settings */
  mongoDbCredentialsLastPart:
    "@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority",
  dbName: "whatson",
  collectionName: "data",
  collectionNameApiKey: "apikey",
  collectionNamePreferences: "preferences",

  /* Rate limit settings */
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  max: 500,

  /* Global settings */
  IPinfo: "https://ipinfo.io/country",
  webhooksURL: "https://hook.eu2.make.com/cie2nax47q0fpjri8ivcx5hoal6gtziu",

  limit: 15,
  maximumThreshold: {
    default: 30,
    metacritic_or_rotten_tomatoes: 95,
    allocine_critics: 80,
  },
  maxSeasonsNumber: 5,
  minimumActiveItems: 150,
  page: 1,
  retries: 20,
  retryDelay: 5000,
  userAgentChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5449.179 Safari/537.36",
  userAgentChromeAlt:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5449.179 Safari/537.36",
  userAgentFirefox:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0",
  userAgentFirefoxAlt:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11.5; rv:117.0) Gecko/20100101 Firefox/117.0",
  userAgentSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/606.1.15",
  userAgentSafariAlt:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5449.179 Safari/538.36",

  /* CircleCI settings */
  circleLimitPerDay: 1500,
  circleLimitPerInstance: 50,

  /* Tests settings */
  baseURLLocal: "http://localhost:8081",
  baseURLRemote: process.env.WHATSON_API_URL,
  maxLimitLocal: 2000,
  maxLimitRemote: 500,
  maxMongodbItemsLimit: 6500,
  checkItemsNumber: true,
  keysToCheck: [
    "_id",
    "id",
    "item_type",
    "is_active",
    "title",
    "directors",
    "genres",
    "image",
    "release_date",
    "tagline",
    "trailer",
    "episodes_details",
    "platforms_links",
    "seasons_number",
    "status",
    "allocine",
    "betaseries",
    "imdb",
    "letterboxd",
    "metacritic",
    "rotten_tomatoes",
    "senscritique",
    "tmdb",
    "trakt",
    "mojo",
    "popularity_average",
    "ratings_average",
    "updated_at",
  ],
  ratingsKeys: [
    "allocine",
    "betaseries",
    "imdb",
    "metacritic",
    "rotten_tomatoes",
    "letterboxd",
    "senscritique",
    "tmdb",
    "trakt",
  ],
  margin: 10,
  maxResponseTime: 5000,
  maxNullValues: 600,
  minimumNumberOfItems: {
    default: 25,
    mojo: 15,
    popularity: 10,
    trailer: 20,
    senscritiqueItems: 3,
    traktItems: 3,
    platformsLinksMovies: 5,

    allocine: 7,
    imdb: 4,
    betaseries: 3,
    metacritic: 4,
    rottenTomatoes: 4,
    letterboxd: 3,
    senscritique: 3,
    tmdb: 3,
    trakt: 3,
  },
  maximumIsActiveItems: 400,
  maxPopularityDiff: 20,
  ratings_filters:
    "allocine_critics,allocine_users,betaseries_users,imdb_users,letterboxd_users,metacritic_critics,metacritic_users,rottenTomatoes_critics,rottenTomatoes_users,senscritique_users,tmdb_users,trakt_users",
  timeout: 500000,

  /* Services settings */
  services: [
    { name: "What's on? API", url: baseURL.whatsonAPI },
    { name: "What's on? API CircleCI", url: baseURL.whatsonAPICircleCI },
    { name: "Render", url: baseURL.render },
    { name: "Vercel", url: baseURL.vercel },

    { name: "AlloCiné", url: baseURL.allocine },
    { name: "BetaSeries", url: baseURL.betaseries },
    { name: "IMDb", url: baseURL.imdb },
    { name: "TMDB", url: baseURL.tmdb },
    { name: "Metacritic", url: baseURL.metacritic },
    { name: "Rotten Tomatoes", url: baseURL.rottenTomatoes },
    { name: "Letterboxd", url: baseURL.letterboxd },
    { name: "SensCritique", url: baseURL.senscritique },
    { name: "Trakt", url: baseURL.trakt },
    { name: "Mojo", url: baseURL.mojo },
  ],

  /* URLs and paths settings */
  baseURLAllocine: baseURL.allocine,
  baseURLAllocineFilms: `${baseURL.allocine}/film/aucinema`,
  baseURLAllocineSeries: `${baseURL.allocine}/series/top`,
  baseURLAssets: baseURL.assets,
  baseURLBetaseriesAPIFilms: `${baseURL.betaseriesAPI}/movies/movie`,
  baseURLBetaseriesAPISeries: `${baseURL.betaseriesAPI}/shows/display`,
  baseURLBetaseriesFilm: `${baseURL.betaseries}/film/`,
  baseURLBetaseriesSerie: `${baseURL.betaseries}/serie/`,
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLDailymotion: baseURL.dailymotion,
  baseURLIMDB: `${baseURL.imdb}/title/`,
  baseURLLetterboxdFilm: `${baseURL.letterboxd}/film/`,
  baseURLMetacriticFilm: `${baseURL.metacritic}/movie/`,
  baseURLMetacriticSerie: `${baseURL.metacritic}/tv/`,
  baseURLRottenTomatoesFilm: `${baseURL.rottenTomatoes}/m/`,
  baseURLRottenTomatoesSerie: `${baseURL.rottenTomatoes}/tv/`,
  baseURLSensCritiqueFilm: `${baseURL.senscritique}/film/-/`,
  baseURLSensCritiqueSerie: `${baseURL.senscritique}/serie/-/`,
  baseURLTheaters: `${baseURL.allocine}/_/showtimes/theater-`,
  baseURLTMDBFilm: `${baseURL.tmdb}/movie/`,
  baseURLTMDBSerie: `${baseURL.tmdb}/tv/`,
  baseURLTMDBAPI: baseURL.tmdbAPI,
  baseURLTraktFilm: `${baseURL.trakt}/movies/`,
  baseURLTraktSerie: `${baseURL.trakt}/shows/`,
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  endURLCriticDetails: "/critiques/presse/",

  filmsIdsFilePath: "./src/assets/films_ids.txt",
  filmsPopularityPath: "popularity_ids_films.txt",
  getIdsFilePath: "./src/data/getIds.sh",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
  seriesPopularityPath: "popularity_ids_series.txt",

  /* Mojo specific settings */
  mojo: {
    baseURL: baseURL.mojo,
    urlToFetch: "/chart/ww_top_lifetime_gross",
    tableRowsClasses: ".a-bordered.a-horizontal-stripes.a-size-base",

    maxIterations: 30,
    offset: 200,
  },

  /* Ratings settings */
  ratingsValues: {
    minimum: {
      allocine: 0,
      betaseries: 0,
      imdb: 0,
      metacriticUsers: 0,
      metacriticCritics: 10,
      rottenTomatoes: 0,
      letterboxd: 0,
      senscritique: 0,
      tmdb: 0,
      trakt: 0,
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
      tmdb: 10,
      trakt: 100,
    },
  },

  /* Platforms settings (ordered by popularity) */
  platforms: [
    "Canal+ Ciné Séries",
    "Netflix",
    "Prime Video",
    "Canal+",
    "OCS",
    "Disney+",
    "Apple TV+",
    "Pass Warner",
    "Paramount+",
    "TF1+",
    "France TV",
    "Crunchyroll",
    "Arte",
    "ADN",
    "Criterion Channel",
    "Tubi TV",
    "Kanopy",
    "TCM",
    "Hoopla",
    "FlixFling",
    "Showtime",
    "Max",
    "Sundance Now Amazon Channel",
  ],

  /* Search settings */
  keysToCheckForSearch: [
    "allocineid",
    "betaseriesid",
    "imdbid",
    "letterboxdid",
    "metacriticid",
    "rottentomatoesid",
    "senscritiqueid",
    "title",
    "tmdbid",
    "traktid",
  ],
};

module.exports = { config };
