const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");

const { config } = require("./config");

let errorCounter = 0;

async function getObjectByImdbId(mojoBoxOfficeArray, imdbId, item_type) {
  const foundItem = mojoBoxOfficeArray.find((item) => item.imdbId === imdbId);

  return foundItem && item_type === "movie" ? foundItem : null;
}

async function fetchTableData(offset) {
  try {
    const response = await axios.get(`${config.mojo.baseURL}${config.mojo.urlToFetch}?offset=${offset}`);
    const html = response.data;
    const $ = cheerio.load(html);

    const tableRows = $("tr", config.mojo.tableRowsClasses);
    let tableData = [];

    if (tableRows.length === 0) return null;

    tableRows.each((index, row) => {
      if (index === 0) return;

      const rowData = {};

      $(row)
        .find("td")
        .each((i, cell) => {
          const cellText = $(cell).text().trim();

          rowData.rank = offset + index;
          if (i === 1) {
            rowData.title = cellText;
            // Get the complete URL and IMDb ID
            const anchorTag = $(cell).find("a");
            const rawUrl = `${config.mojo.baseURL}${anchorTag.attr("href")}`;

            // Remove query parameters from the URL
            const urlObj = new URL(rawUrl);
            const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

            const imdbId = rawUrl.match(/title\/(tt\d+)/)[1];
            rowData.url = cleanUrl;
            rowData.imdbId = imdbId;
          }
          if (i === 2) rowData.lifetimeGross = cellText;
          if (i === 3) rowData.year = parseInt(cellText, 10);
        });

      tableData.push(rowData);
    });

    return tableData;
  } catch (error) {
    const fileName = path.basename(__filename);

    console.log(`Error fetching data from URL: ${error}`);

    errorCounter++;
    if (errorCounter > config.maxErrorCounter.default) {
      console.log(`An error on ${fileName} has been returned more than ${config.maxErrorCounter.default} times, exiting the script.`);
      process.exit(1);
    }
  }
}

const getMojoBoxOffice = async (item_type) => {
  let offset = 0;
  let allTableData = [];

  if (item_type !== "movie") return allTableData;

  for (let i = 0; i < config.mojo.maxIterations; i++) {
    const tableData = await fetchTableData(offset);

    if (!tableData || tableData.length === 0) break;

    allTableData = allTableData.concat(tableData);

    const progressPercentage = ((i + 1) / config.mojo.maxIterations) * 100;

    console.log(`Fetched ${offset} to ${offset + 199}: ${parseInt(progressPercentage)}% complete.`);

    offset += config.mojo.offset;
  }

  return allTableData;
};

module.exports = { getObjectByImdbId, getMojoBoxOffice };
