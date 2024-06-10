const fs = require("fs");

const { b64Encode } = require("./utils/b64EncodeAndDecode");
const { config } = require("./config");
const { getNodeVarsValues } = require("./utils/getNodeVarsValues");

const checkDbIds = async (jsonArrayFromCSV, collectionData) => {
  let idsFromFile = [];
  jsonArrayFromCSV.forEach((element) => {
    idsFromFile.push(b64Encode(`${config.baseURLAllocine}${element.URL}`));
  });

  try {
    const allDbData = await collectionData
      .find({ item_type: getNodeVarsValues.item_type })
      .map((el) => {
        return {
          id: el._id,
          allocineUrl: el.allocine ? el.allocine.url : null,
          imdbId: el.imdb ? el.imdb.id : null,
          betaseriesId: el.betaseries ? el.betaseries.id : null,
          tmdbId: el.id ? el.id : null,
          metacriticId: el.metacritic ? el.metacritic.id : null,
          rottenTomatoesId: el.rotten_tomatoes ? el.rotten_tomatoes.id : null,
          letterboxdId: el.letterboxd ? el.letterboxd.id : null,
          senscritiqueId: el.senscritique ? el.senscritique.id : null,
          traktId: el.trakt ? el.trakt.id : null,
        };
      })
      .toArray();

    const idsOnlyInDb = allDbData.filter(
      (element) => !idsFromFile.includes(element.id),
    );

    let dataToWrite = idsOnlyInDb
      .map((element) => {
        return `${element.allocineUrl},${element.imdbId},${element.betaseriesId},${element.tmdbId},${element.metacriticId},${element.rottenTomatoesId},${element.letterboxdId},${element.senscritiqueId},${element.traktId},FALSE\n`;
      })
      .join("");

    if (!dataToWrite.trim()) {
      console.log(
        "----------------------------------------------------------------------------------------------------",
      );
      console.log(
        `The local data is already synced with the DB for ${getNodeVarsValues.item_type} item type.`,
      );
      console.log(
        "----------------------------------------------------------------------------------------------------",
      );

      process.exit(0);
    } else {
      fs.writeFile(
        `temp_check_${getNodeVarsValues.item_type}.txt`,
        dataToWrite,
        (err) => {
          if (err) {
            console.error("An error occurred while writing the file.", err);
          } else {
            console.log(
              "----------------------------------------------------------------------------------------------------",
            );
            console.log(
              `File ./temp_check_${getNodeVarsValues.item_type}.txt has been successfully written.`,
            );
            console.log(
              "----------------------------------------------------------------------------------------------------",
            );

            process.exit(0);
          }
        },
      );
    }
  } catch (error) {
    console.error(
      "Something went wrong when fetching data from the database.",
      error,
    );
  }
};

module.exports = checkDbIds;
