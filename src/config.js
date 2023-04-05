/* A configuration file for the project. */
const config = {
  baseURLAllocine: "https://www.allocine.fr",
  baseURLBetaseriesAPI: "https://api.betaseries.com/shows/display",
  baseURLBetaseriesFilm: "https://www.betaseries.com/film/",
  baseURLBetaseriesSerie: "https://www.betaseries.com/serie/",
  baseURLCriticDetailsFilms: "/film/fichefilm-",
  baseURLCriticDetailsSeries: "/series/ficheserie-",
  baseURLImagekit: "https://ik.imagekit.io/whatson",
  baseURLIMDB: "https://www.imdb.com/title/",
  baseURLImgTMDB: "https://image.tmdb.org/t/p/w1280",
  baseURLTMDB: "https://api.themoviedb.org/3",
  baseURLTypeFilms: "/film/fichefilm_gen_cfilm=",
  baseURLTypeSeries: "/series/ficheserie_gen_cserie=",
  baseURLWhatsonAPI: "https://whatson-api.onrender.com",

  collectionName: "data",
  dbName: "whatson",

  endURLCriticDetails: "/critiques/presse/",
  filmsIdsFilePath: "./src/assets/films_ids.txt",
  seriesIdsFilePath: "./src/assets/series_ids.txt",
};

module.exports = { config };
