/* A configuration file for the project. */
const config = {
  /* Prod config */
  baseURLAllocine: "https://www.allocine.fr",
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
  baseURLSurgeAssets: "https://whatson-assets.surge.sh",

  collectionName: "data",
  dbName: "whatson",

  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
  filmsPopularityPath: "popularity_ids_films.txt",
  seriesPopularityPath: "popularity_ids_series.txt",

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
    "mojo",
    "popularity_average",
    "ratings_average",
  ],

  baseURLTheaters: "https://www.allocine.fr/_/showtimes/theater-",
  corsURL: "https://cors-sites-aafe82ad9d0c.fly.dev/",

  limit: 20,
  maxSeasonsNumber: 5,
  page: 1,

  /* Tests config */
  baseURL: "http://localhost:8081",
  baseURLRemote: "https://whatson-api.onrender.com",
  maxResponseTime: 3000,
  timeout: 500000,

  films_ids_path: "./src/assets/films_ids.txt",
  series_ids_path: "./src/assets/series_ids.txt",

  checkItemsNumber: false,
};

module.exports = { config };
