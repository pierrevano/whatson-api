const cheerio = require("cheerio");

const { config } = require("../config");
const { getHomepageResponse } = require("../utils/getHomepageResponse");
const { logErrors } = require("../utils/logErrors");

/**
 * Finds the Box Office Mojo entry for a given IMDb id.
 *
 * @param {Array<{ imdbId: string|null, rank: number, url: string|null, lifetimeGross: number|null }>} mojoBoxOfficeArray
 * @param {string} imdbId
 * @param {string} item_type
 * @returns {Promise<Object|null>}
 */
async function getObjectByImdbId(mojoBoxOfficeArray, imdbId, item_type) {
  const foundItem = mojoBoxOfficeArray.find((item) => item.imdbId === imdbId);
  return foundItem && item_type === "movie" ? foundItem : null;
}

/**
 * Scrapes a single Box Office Mojo table page and normalises the raw values.
 * Lifetime gross values are converted to numbers (USD).
 *
 * @param {number} offset
 * @returns {Promise<Array<{ rank: number, url: string|null, imdbId: string|null, lifetimeGross: number|null }>|null>}
 */
async function fetchTableData(offset) {
  let tableData = [];

  try {
    const response = await getHomepageResponse(
      `${config.mojo.baseURL}${config.mojo.urlToFetch}?offset=${offset}`,
      { serviceName: "Mojo", id: offset },
    );

    const html = response.data;
    const $ = cheerio.load(html);

    const tableRows = $("tr", config.mojo.tableRowsClasses);

    if (tableRows.length === 0) return null;

    tableRows.each((index, row) => {
      if (index === 0) return;

      const cells = $(row).find("td");
      const rank = offset + index;
      const titleCell = cells.eq(1);
      const grossCell = cells.eq(2);
      const href = titleCell.find("a").attr("href");

      if (!href) {
        console.warn(
          `Skipping Mojo box office row ${rank}: missing title link.`,
        );
        return;
      }

      const rawUrl = `${config.mojo.baseURL}${href}`;
      let url = null;

      try {
        const urlObj = new URL(rawUrl);
        url = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      } catch (urlError) {
        logErrors(urlError, null, "fetchTableData");
      }

      const imdbMatch = rawUrl.match(/title\/(tt\d+)/);
      const sanitizedGross = grossCell.text().trim().replace(/\$|,/g, "");
      const numericGross =
        sanitizedGross === "" ? null : Number(sanitizedGross);

      tableData.push({
        rank,
        url,
        imdbId: imdbMatch ? imdbMatch[1] : null,
        lifetimeGross:
          numericGross !== null && Number.isFinite(numericGross)
            ? numericGross
            : null,
      });
    });
  } catch (error) {
    logErrors(error, null, "fetchTableData");
  }

  return tableData;
}

/**
 * Iterates through the Box Office Mojo lifetime gross chart and returns the
 * consolidated dataset.
 *
 * @param {string} item_type
 * @returns {Promise<Array<{ rank: number, url: string|null, imdbId: string|null, lifetimeGross: number|null }>>}
 */
const getMojoBoxOffice = async (item_type) => {
  let offset = 0;
  let allTableData = [];

  if (item_type !== "movie") return allTableData;

  for (let i = 0; i < config.mojo.maxIterations; i++) {
    const tableData = await fetchTableData(offset);

    if (!tableData || tableData.length === 0) break;

    allTableData = allTableData.concat(tableData);

    const progressPercentage = ((i + 1) / config.mojo.maxIterations) * 100;

    console.log(
      `Fetched ${offset} to ${offset + config.mojo.offset - 1}: ${parseInt(progressPercentage)}% complete.`,
    );

    offset += config.mojo.offset;
  }

  return allTableData;
};

module.exports = { getObjectByImdbId, getMojoBoxOffice };
