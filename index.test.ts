const fs = require("fs");
const axios = require("axios");

function countLines(filename) {
  const data = fs.readFileSync(filename, "utf8");
  const lines = data.split("\n");

  // Exclude header line
  if (lines.length > 0) {
    lines.shift();
  }

  return lines.length;
}

const config = {
  baseURL: "http://localhost:8081",
  timeout: 500000,

  films_ids_path: "./src/assets/films_ids.txt",
  series_ids_path: "./src/assets/series_ids.txt",

  checkItemsNumber: false,
};

const params = {
  default: {
    query: "",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_movie: {
    query: "?item_type=movie",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_tvshow: {
    query: "?item_type=tvshow",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("tvshow")),
  },

  only_active: {
    query: "?is_active=true",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeTruthy),
  },

  only_non_active: {
    query: "?is_active=false",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeFalsy),
  },

  only_active_and_non_active: {
    query: "?is_active=true,false",
    expectedResult: (items) => items.every((item) => expect(item.is_active).toBeTruthy || expect(item.is_active).toBeFalsy),
  },

  only_cinema_movie: {
    query: "?cinema_id=B2619&item_type=movie",
    expectedResult: (items) => items.every((item) => expect(item.item_type).toBe("movie")),
  },

  only_season_1_and_2: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.item_type).toBe("tvshow");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  only_greater_than_1: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2,5",
    expectedResult: (items) =>
      items.every((item) => {
        expect(item.item_type).toBe("tvshow");
        expect(item.seasons_number).toBeGreaterThanOrEqual(1);
      }),
  },

  only_20_items_on_page_2: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2&page=2&limit=20&data=true",
    expectedResult: (data) => {
      expect(data.page).toBe(2);
      expect(data.results.length).toBe(20);
    },
  },

  only_200_items_on_page_3: {
    query: "?cinema_id=B2619&item_type=tvshow&seasons_number=1,2&page=3&limit=200&data=true",
    expectedResult: (data) => {
      expect(data.page).toBe(3);
      expect(data.results.length).toBe(200);
    },
  },

  only_valid_users_rating: {
    query: "?item_type=tvshow&is_active=true&limit=200",
    expectedResult: (items) =>
      items.every((item) => {
        if (item.allocine && item.allocine.users_rating !== null) {
          expect(item.allocine.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.betaseries !== null) {
          expect(item.betaseries.users_rating).toBeLessThanOrEqual(5);
        }

        if (item.imdb !== null) {
          expect(item.imdb.users_rating).toBeLessThanOrEqual(10);
        }

        if (item.metacritic !== null) {
          expect(item.metacritic.users_rating).toBeLessThanOrEqual(10);
        }
      }),
  },

  only_same_files_line_number_with_remote: {
    query: "?item_type=movie,tvshow&is_active=true,false&total=true",
    expectedResult: (items) => {
      if (config.checkItemsNumber) {
        const filmsLines = countLines(config.films_ids_path);
        const seriesLines = countLines(config.series_ids_path);

        expect(filmsLines + seriesLines - 2).toEqual(items);
      }
    },
  },
};

describe("What's on? API tests", () => {
  Object.entries(params).forEach(([name, { query, expectedResult }]) => {
    it(
      name,
      async () => {
        const response = await axios.get(`${config.baseURL}${query}`);
        const data = response.data;
        const items = data.results;
        const total = data.total_results;

        if (query.includes("data=true")) {
          expectedResult(data);
        } else if (query.includes("total=true")) {
          expectedResult(total);
        } else {
          expectedResult(items);
        }
      },
      config.timeout
    );
  });

  it(
    "API response time should be within an acceptable range",
    async () => {
      const start = new Date().valueOf();

      await axios.get(`${config.baseURL}`);

      const end = new Date().valueOf();
      const responseTime = end - start;

      const maxResponseTime = 10000;

      expect(responseTime).toBeLessThan(maxResponseTime);
    },
    config.timeout
  );
});
