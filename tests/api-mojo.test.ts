require("dotenv").config();

const axios = require("axios");

const { config } = require("../src/config");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const maxLimitLargeDocuments = config.maxLimitLargeDocuments;
const removeLogs = process.env.REMOVE_LOGS === "true";

/**
 * An object containing various query parameters and their expected results.
 * @type {Record<string, { query: string, expectedResult: (items: any) => void }>}
 */
const params = {
  should_default_to_ascending_mojo_rank: {
    query: "?item_type=movie,tvshow&sort_by=mojo_rank&limit=20",
    expectedResult: (items) => {
      expect(items.length).toBeGreaterThan(1);
      items.forEach((item) => {
        expect(typeof item.mojo?.rank).toBe("number");
      });
      for (let index = 1; index < items.length; index++) {
        expect(items[index].mojo.rank).toBeGreaterThanOrEqual(
          items[index - 1].mojo.rank,
        );
      }
    },
  },

  should_sort_by_mojo_rank_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&sort_by=mojo_rank&order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousRank = null;
      let smallestRank = Infinity;
      let previousTopLifetimeGross = Infinity;

      items.forEach((item, index) => {
        expect(item.mojo).toBeDefined();
        expect(typeof item.mojo.rank).toBe("number");
        expect(item.mojo.rank).toBeGreaterThan(0);

        smallestRank = Math.min(smallestRank, item.mojo.rank);

        if (index < config.minimumNumberOfMojoItems) {
          expect(item.mojo.rank).toBe(index + 1);
          expect(typeof item.mojo.lifetime_gross).toBe("number");
          expect(item.mojo.lifetime_gross).toBeGreaterThan(0);
          expect(item.mojo.lifetime_gross).toBeLessThanOrEqual(
            previousTopLifetimeGross,
          );
          previousTopLifetimeGross = item.mojo.lifetime_gross;
        }

        if (previousRank) {
          expect(item.mojo.rank).toBeGreaterThanOrEqual(previousRank);
        }

        previousRank = item.mojo.rank;
      });

      expect(items[0].mojo.rank).toBe(smallestRank);
    },
  },

  should_sort_by_mojo_rank_descending: {
    query: `?item_type=movie,tvshow&is_active=true,false&sort_by=mojo_rank&order=desc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const itemsWithMojo = items.filter((item) => item.mojo);

      expect(itemsWithMojo).toHaveLength(items.length);
      expect(itemsWithMojo.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      for (let i = 1; i < itemsWithMojo.length; i++) {
        expect(itemsWithMojo[i].mojo.rank).toBeLessThanOrEqual(
          itemsWithMojo[i - 1].mojo.rank,
        );
      }
    },
  },
};

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API mojo tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    async function fetchItemsData() {
      const apiCall = `${baseURL}${query}${query ? "&" : "?"}api_key=${config.internalApiKey}`;

      if (!removeLogs) {
        console.log("Test name:", name);
        console.log(`Calling: ${apiCall}`);

        console.time("axiosCallInTest");
      }

      const response = await axios.get(apiCall, {
        validateStatus: (status) => status < 500,
      });
      console.timeEnd("axiosCallInTest");

      const data = response.data;
      const items = query.startsWith("/") ? data : data.results;

      expectedResult(items, null);
    }

    test(
      name,
      async () => {
        await fetchItemsData();
      },
      config.timeout,
    );
  });
});
