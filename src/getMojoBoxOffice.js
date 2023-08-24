const axios = require("axios");
const cheerio = require("cheerio");

const config = {
  url: "https://www.boxofficemojo.com/chart/top_lifetime_gross",
  tableRowsClasses: ".a-bordered.a-horizontal-stripes.a-size-base",

  maxIterations: 15,
  offset: 200,
};

async function getObjectByImdbId(mojoBoxOfficeArray, imdbId) {
  const foundItem = mojoBoxOfficeArray.find((item) => item.imdbId === imdbId);

  return foundItem ? foundItem : null;
}

async function fetchTableData(offset) {
  try {
    const response = await axios.get(`${config.url}?offset=${offset}`);
    const html = response.data;
    const $ = cheerio.load(html);

    const tableRows = $("tr", config.tableRowsClasses);
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
            const rawUrl = `https://www.boxofficemojo.com${anchorTag.attr("href")}`;

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
    console.error(`Error fetching data from URL: ${error}`);
  }
}

const getMojoBoxOffice = async () => {
  let offset = 0;
  let allTableData = [];

  for (let i = 0; i < config.maxIterations; i++) {
    const tableData = await fetchTableData(offset);

    if (!tableData || tableData.length === 0) break;

    allTableData = allTableData.concat(tableData);

    const progressPercentage = ((i + 1) / config.maxIterations) * 100;

    console.log(`Fetched ${offset} to ${offset + 199}: ${parseInt(progressPercentage)}% complete.`);

    offset += config.offset;
  }

  return allTableData;
};

module.exports = { getObjectByImdbId, getMojoBoxOffice };
