/**
 * Generates URLs for various movie or series related websites based on the provided item type, configuration, and JSON data.
 * @param {string} item_type - The type of item (movie or series).
 * @param {object} config - The configuration object containing base URLs for different websites.
 * @param {object} json - The JSON data containing information about the item.
 * @returns {object} - An object containing URLs for AlloCiné, IMDb, BetaSeries, Metacritic, Rotten Tomatoes, Letterboxd, SensCritique, Trakt, The Movie Database, and an isActive flag.
 * @throws {Error} - If an invalid AlloCiné URL is provided or if The Movie Database ID is not found.
 */
const generateURLs = (item_type, config, json) => {
  const baseURLType =
    item_type === "movie" ? config.baseURLTypeFilms : config.baseURLTypeSeries;
  const baseURLCriticDetails =
    item_type === "movie"
      ? config.baseURLCriticDetailsFilms
      : config.baseURLCriticDetailsSeries;

  const allocineURL = json.URL;
  const allocineIdMatch = allocineURL.match(/=(.*)\./);
  if (!allocineIdMatch) {
    throw new Error(`Invalid AlloCiné URL: ${allocineURL}`);
  }
  const allocineId = parseInt(allocineIdMatch.pop());
  const allocineHomepage = `${config.baseURLAllocine}${baseURLType}${allocineId}.html`;
  const allocineCriticsDetails = `${config.baseURLAllocine}${baseURLCriticDetails}${allocineId}${config.endURLCriticDetails}`;

  const imdbId = json.IMDB_ID;
  const imdbHomepage = `${config.baseURLIMDB}${imdbId}/`;

  let betaseriesId = json.BETASERIES_ID;
  const betaseriesHomepage =
    item_type === "movie"
      ? `${config.baseURLBetaseriesFilm}${betaseriesId}`
      : `${config.baseURLBetaseriesSerie}${betaseriesId}`;

  if (betaseriesId.startsWith("serie/")) {
    const betaseriesIdNew = betaseriesId.split("/");
    betaseriesId = betaseriesIdNew[1];
  }

  const metacriticId = json.METACRITIC_ID;
  const metacriticHomepage =
    item_type === "movie"
      ? `${config.baseURLMetacriticFilm}${metacriticId}`
      : `${config.baseURLMetacriticSerie}${metacriticId}`;

  const rottenTomatoesId = json.ROTTEN_TOMATOES_ID;
  const rottenTomatoesHomepage =
    item_type === "movie"
      ? `${config.baseURLRottenTomatoesFilm}${rottenTomatoesId}`
      : `${config.baseURLRottenTomatoesSerie}${rottenTomatoesId}`;

  const letterboxdId = item_type === "movie" ? json.LETTERBOXD_ID : null;
  const letterboxdHomepage =
    item_type === "movie"
      ? `${config.baseURLLetterboxdFilm}${letterboxdId}`
      : null;

  const sensCritiqueId = parseInt(json.SENSCRITIQUE_ID);
  const sensCritiqueHomepage =
    item_type === "movie"
      ? `${config.baseURLSensCritiqueFilm}${sensCritiqueId}`
      : `${config.baseURLSensCritiqueSerie}${sensCritiqueId}`;

  const tmdbId = parseInt(json.THEMOVIEDB_ID);
  const tmdbHomepage =
    item_type === "movie"
      ? `${config.baseURLTMDBFilm}${tmdbId}`
      : `${config.baseURLTMDBSerie}${tmdbId}`;

  const traktId = json.TRAKT_ID;
  const traktHomepage =
    item_type === "movie"
      ? `${config.baseURLTraktFilm}${traktId}`
      : `${config.baseURLTraktSerie}${traktId}`;

  const isActive = json.IS_ACTIVE === "TRUE";

  // If the Movie Database ID is not found, log an error and exit.
  if (isNaN(tmdbId)) {
    throw new Error(
      `Something went wrong, The Movie Database ID has not been found for ${allocineHomepage}!`,
    );
  }

  return {
    allocine: {
      id: allocineId,
      lastPartUrl: allocineURL,
      homepage: allocineHomepage,
      criticsDetails: allocineCriticsDetails,
    },
    imdb: { id: imdbId, homepage: imdbHomepage },
    betaseries: { id: betaseriesId, homepage: betaseriesHomepage },
    metacritic: { id: metacriticId, homepage: metacriticHomepage },
    rotten_tomatoes: { id: rottenTomatoesId, homepage: rottenTomatoesHomepage },
    letterboxd: { id: letterboxdId, homepage: letterboxdHomepage },
    senscritique: { id: sensCritiqueId, homepage: sensCritiqueHomepage },
    tmdb: { id: tmdbId, homepage: tmdbHomepage },
    trakt: { id: traktId, homepage: traktHomepage },
    is_active: isActive,
  };
};

module.exports = generateURLs;
