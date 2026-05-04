require("dotenv").config();

const axios = require("axios");
const { readFileSync } = require("fs");

const { config } = require("../src/config");
const { withErrorContext } = require("./utils/withErrorContext");

const baseURL =
  process.env.SOURCE === "remote" ? config.baseURLRemote : config.baseURLLocal;
const TOP_N = 100;
const assetsDir = "./src/assets";

function readTopNItems(popularityFilePath, idsFilePath) {
  const idsContent = readFileSync(idsFilePath, "utf8");
  return readFileSync(popularityFilePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(0, TOP_N)
    .map((line) => {
      const commaIndex = line.indexOf(",");
      const url = line.slice(commaIndex + 1);
      if (!url) return null;
      const match = idsContent.split("\n").find((l) => l.startsWith(url + ","));
      if (!match) return null;
      const tmdbId = match.split(",")[3];
      return tmdbId ? { rank: parseInt(line), tmdbId } : null;
    })
    .filter(Boolean);
}

const itemTypes = [
  {
    name: "movie",
    popularityFilePath: `${assetsDir}/${config.filmsPopularityPath}`,
    idsFilePath: config.filmsIdsFilePath,
  },
  {
    name: "tvshow",
    popularityFilePath: `${assetsDir}/${config.seriesPopularityPath}`,
    idsFilePath: config.seriesIdsFilePath,
  },
];

describe("Top 100 popular items updated recently", () => {
  itemTypes.forEach(({ name, popularityFilePath, idsFilePath }) => {
    test(
      `top_${TOP_N}_${name}s_updated_within_max_age`,
      async () => {
        const topItems = readTopNItems(popularityFilePath, idsFilePath);
        expect(topItems.length).toBeGreaterThan(0);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.maxAgeInDays);

        for (const { rank, tmdbId } of topItems) {
          const response = await axios.get(
            `${baseURL}/${name}/${tmdbId}?api_key=${config.internalApiKey}`,
            { validateStatus: (status) => status < 500 },
          );
          withErrorContext(`rank ${rank}, TMDB ID ${tmdbId}`, () => {
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
