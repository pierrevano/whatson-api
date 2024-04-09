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
  theMovieDatabaseAPI: "https://api.themoviedb.org/3",
  trakt: "https://trakt.tv",
  vercel: "https://www.vercel-status.com",
};

const config = {
  /* Database settings */
  dbName: "whatson",
  collectionName: "data",

  /* Global settings */
  corsURL: "https://cors-sites-aafe82ad9d0c.fly.dev",
  limit: 20,
  maximumThreshold: {
    default: 30,
    metacritic_or_rotten_tomatoes: 95,
    allocine_critics: 80,
  },
  maxSeasonsNumber: 5,
  minimumActiveItems: 150,
  page: 1,
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",

  /* CircleCI settings */
  circleLimitPerDay: 1500,
  circleLimitPerInstance: 50,

  /* Tests settings */
  baseURLLocal: "http://localhost:8081",
  baseURLRemote: "https://whatson-api.onrender.com",
  checkItemsNumber: true,
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
    "trakt",
    "mojo",
    "popularity_average",
    "ratings_average",
    "updated_at",
  ],
  margin: 50,
  maxResponseTime: 5000,
  minimumNumberOfItems: {
    default: 25,
    mojo: 15,
    popularity: 15,
    trailer: 100,
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
    trakt: 3,
  },
  maximumIsActiveItems: 400,
  timeout: 500000,

  /* Services settings */
  services: [
    { name: "Render", url: baseURL.render },
    { name: "Vercel", url: baseURL.vercel },

    { name: "AlloCiné", url: baseURL.allocine },
    { name: "BetaSeries", url: baseURL.betaseries },
    { name: "IMDb", url: baseURL.imdb },
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
  baseURLTMDB: baseURL.theMovieDatabaseAPI,
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
      rottenTomatoes: 10,
      letterboxd: 0,
      senscritique: 0,
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
      trakt: 100,
    },
  },

  /* Platforms settings */
  platforms: ["ADN", "Apple TV+", "Arte", "Canal+", "Canal+ Ciné Séries", "Crunchyroll", "Disney+", "France TV", "Netflix", "OCS", "Paramount+", "Pass Warner", "Prime Video", "TF1+", "Universal+"],

  /* Search settings */
  keysToCheckForSearch: ["allocineid", "betaseriesid", "imdbid", "letterboxdid", "metacriticid", "rottentomatoesid", "senscritiqueid", "traktid", "themoviedbid", "title"],
};

module.exports = { config };
