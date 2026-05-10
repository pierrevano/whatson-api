require("dotenv").config();

const axios = require("axios");
const { readFileSync } = require("fs");

const { config } = require("../src/config");
const { withErrorContext } = require("./utils/withErrorContext");

const baseURL =
  process.env.SOURCE === "remote" ? config.baseURLRemote : config.baseURLLocal;
const TOP_COUNT = 150;
const assetsDir = "./src/assets";

function readTopNItems(popularityFilePath, idsFilePath) {
  const idsContent = readFileSync(idsFilePath, "utf8");
  return readFileSync(popularityFilePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(0, TOP_COUNT)
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
    popularityFilePath: `${assetsDir}/${config.filmsPopularityPath}`,
    idsFilePath: config.filmsIdsFilePath,
  },
  {
    type: "tvshow",
    popularityFilePath: `${assetsDir}/${config.seriesPopularityPath}`,
    idsFilePath: config.seriesIdsFilePath,
  },
];

describe("Top 100 popular items updated recently", () => {
  mediaTypes.forEach(({ type, popularityFilePath, idsFilePath }) => {
    test(
      `top_${TOP_COUNT}_${type}s_updated_within_max_age`,
      async () => {
        const topItems = readTopNItems(popularityFilePath, idsFilePath);
        expect(topItems.length).toBeGreaterThan(0);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.maxAgeInDays);

        for (const { rank, tmdbId } of topItems) {
          const response = await axios.get(
            `${baseURL}/${type}/${tmdbId}?api_key=${config.internalApiKey}`,
            { validateStatus: (status) => status < 500 },
          );
          const imdbId = response.data?.imdb?.id ?? "unknown";
          withErrorContext(`rank ${rank}, IMDb ID ${imdbId}`, () => {
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
  });
});
