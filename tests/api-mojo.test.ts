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
  should_sort_by_mojo_rank_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=asc&limit=${maxLimitLargeDocuments}`,
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
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=desc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      const itemsWithMojo = items.filter((item) => item.mojo);

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

  should_fallback_to_popularity_when_mojo_rank_order_invalid: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=invalid&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      let previousPopularity = -Infinity;
      let sawMissingRank = false;

      items.forEach((item) => {
        const popularity =
          typeof item.popularity_average === "number"
            ? item.popularity_average
            : Number.POSITIVE_INFINITY;

        expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        previousPopularity = popularity;

        if (!item.mojo || typeof item.mojo.rank !== "number") {
          sawMissingRank = true;
        }
      });

      expect(sawMissingRank).toBe(true);
    },
  },

  should_prioritize_imdb_top_ranking_and_mojo_rank_orders: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=asc&mojo_rank_order=asc&limit=${maxLimitLargeDocuments}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(
        config.minimumNumberOfItems.softDefault,
      );

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.mojo).toBeDefined();
        expect(typeof item.mojo.rank).toBe("number");
      });

      const comparator = (a, b) => {
        if (a.imdb.top_ranking !== b.imdb.top_ranking) {
          return a.imdb.top_ranking - b.imdb.top_ranking;
        }
        if (a.mojo.rank !== b.mojo.rank) {
          return a.mojo.rank - b.mojo.rank;
        }
      };

      const expectedOrder = items
        .slice()
        .sort(comparator)
        .map((item) => item.id);
      const actualOrder = items.map((item) => item.id);

      expect(actualOrder).toEqual(expectedOrder);
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
