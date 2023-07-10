const generateURLs = (item_type, config, json) => {
  const baseURLType = item_type === "movie" ? config.baseURLTypeFilms : config.baseURLTypeSeries;
  const baseURLCriticDetails = item_type === "movie" ? config.baseURLCriticDetailsFilms : config.baseURLCriticDetailsSeries;

  const allocineURL = json.URL;
  const allocineId = parseInt(allocineURL.match(/=(.*)\./).pop());
  const allocineHomepage = `${config.baseURLAllocine}${baseURLType}${allocineId}.html`;
  const allocineCriticsDetails = `${config.baseURLAllocine}${baseURLCriticDetails}${allocineId}${config.endURLCriticDetails}`;

  const imdbId = json.IMDB_ID;
  const imdbHomepage = `${config.baseURLIMDB}${imdbId}/`;

  let betaseriesId = json.BETASERIES_ID;
  const betaseriesHomepage = item_type === "movie" ? `${config.baseURLBetaseriesFilm}${betaseriesId}` : `${config.baseURLBetaseriesSerie}${betaseriesId}`;

  if (betaseriesId.startsWith("serie/")) {
    const betaseriesIdNew = betaseriesId.split("/");
    betaseriesId = betaseriesIdNew[1];
  }

  const metacriticId = json.METACRITIC_ID;
  const metacriticHomepage = item_type === "movie" ? `${config.baseURLMetacriticFilm}${metacriticId}` : `${config.baseURLMetacriticSerie}${metacriticId}`;

  const isActive = json.IS_ACTIVE_1 === "TRUE";
  const theMoviedbId = parseInt(json.THEMOVIEDB_ID);

  // If The Movie Database ID is not found, log an error and exit
  if (isNaN(theMoviedbId)) {
    throw new Error(`Something went wrong, The Movie Database id has not been found for ${allocineHomepage}!`);
  }

  return {
    allocine: { id: allocineId, lastPartUrl: allocineURL, homepage: allocineHomepage, criticsDetails: allocineCriticsDetails },
    imdb: { id: imdbId, homepage: imdbHomepage },
    betaseries: { id: betaseriesId, homepage: betaseriesHomepage },
    metacritic: { id: metacriticId, homepage: metacriticHomepage },
    themoviedb: { id: theMoviedbId },
    is_active: isActive,
  };
};

module.exports = generateURLs;
