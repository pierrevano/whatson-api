require("dotenv").config();

const axios = require("axios");
const { readFileSync } = require("fs");

const { config } = require("../src/config");
const { withErrorContext } = require("./utils/withErrorContext");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const assetsDir = "./src/assets";

function readTopNItems(popularityFilePath, idsFilePath, topCount) {
  const idsContent = readFileSync(idsFilePath, "utf8");
  return readFileSync(popularityFilePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(0, topCount)
    .map((line) => {
      const commaIndex = line.indexOf(",");
      const slug = line.slice(commaIndex + 1);
      if (!slug) return null;
      const idRow = idsContent
        .split("\n")
        .find((idLine) => idLine.startsWith(slug + ","));
      if (!idRow) return null;
      const tmdbId = idRow.split(",")[3];
      return tmdbId ? { rank: parseInt(line), tmdbId } : null;
    })
    .filter(Boolean);
}

const mediaTypes = [
  {
    type: "movie",
    topCount: 150,
    popularityFilePath: `${assetsDir}/${config.filmsPopularityPath}`,
    idsFilePath: config.filmsIdsFilePath,
  },
  {
    type: "tvshow",
    topCount: 200,
    popularityFilePath: `${assetsDir}/${config.seriesPopularityPath}`,
    idsFilePath: config.seriesIdsFilePath,
  },
];

(isRemoteSource ? describe.skip : describe)(
  "Top popular items updated recently",
  () => {
    mediaTypes.forEach(
      ({ type, topCount, popularityFilePath, idsFilePath }) => {
        test(
          `top_${topCount}_${type}s_updated_within_max_age`,
          async () => {
            const topItems = readTopNItems(
              popularityFilePath,
              idsFilePath,
              topCount,
            );
            expect(topItems.length).toBeGreaterThan(0);

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - config.maxAgeInDays);

            for (const { rank, tmdbId } of topItems) {
              const url = `${baseURL}/${type}/${tmdbId}`;
              const response = await axios.get(
                `${url}?api_key=${config.internalApiKey}`,
                { validateStatus: (status) => status < 500 },
              );
              withErrorContext(`rank ${rank}, URL ${url}`, () => {
                expect(response.status).toBe(200);
                expect(response.data).toHaveProperty("updated_at");
                expect(
                  new Date(response.data.updated_at).getTime(),
                ).toBeGreaterThanOrEqual(cutoffDate.getTime());
              });
            }
          },
          config.timeout,
        );
      },
    );
  },
);
