require("dotenv").config();

const axios = require("axios");
const { readFileSync } = require("fs");

const { checkRatings } = require("./utils/checkRatings");
const { checkTypes } = require("./utils/checkTypes");
const { config } = require("../src/config");
const { countNullValues } = require("./utils/countNullValues");
const {
  expectPositiveInteger,
  expectImdbId,
  expectSlugLikeId,
  expectPersistentId,
  expectNumericIdOrNumericString,
  expectIdRatingConsistency,
} = require("./utils/idExpectations");
const { formatDate } = require("../src/utils/formatDate");
const { schema } = require("../src/schema");

const isRemoteSource = process.env.SOURCE === "remote";
const baseURL = isRemoteSource ? config.baseURLRemote : config.baseURLLocal;
const higherLimit = isRemoteSource ? config.maxLimitRemote : config.maxLimit;
const removeLogs = process.env.REMOVE_LOGS === "true";

/**
 * Validates properties and metrics of a list of items against predefined expectations.
 * The function checks for the presence and validity of certain properties based on item status and type.
 *
 * @param {Array<Object>} items - An array of objects representing the items to be validated. Each object
 *     should contain properties like `is_active`, `item_type`, `title`, `release_date`, and various
 *     ratings from different platforms (e.g., IMDb, AlloCiné, etc.).
 */
function checkItemProperties(items) {
  return items.forEach((item) => {
    /* Common */
    config.keysToCheck.forEach((key) => {
      expect(item).toHaveProperty(key);
      expect(typeof item[key]).not.toBe("undefined");
    });
    expect(item.id).toBeGreaterThan(0);
    expect(
      items.filter((item) => item.original_title).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(item.image).not.toBeNull();
    expect(item.image).toMatch(
      /^https:\/\/.*\.(jpg|jpeg|png|gif|jfif)(\?[a-zA-Z0-9=&]*)?$/i,
    );
    expect(
      items.filter((item) => item.release_date !== null).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(items.filter((item) => item.tagline).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.default,
    );
    expect(
      items.filter((item) => item.production_companies).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.is_adult === "boolean").length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.runtime === "number").length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    if (item.item_type === "movie") {
      expect(
        items.filter(
          (item) => item.platforms_links && item.platforms_links.length > 0,
        ).length,
      ).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.platformsLinksMovies,
      );
    } else {
      if (item.is_active === true) {
        expect(
          items.filter((item) => item.next_episode).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.nextEpisodes);
      }
      expect(
        items.filter((item) => item.networks).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    }

    expect(Object.keys(item).length).toEqual(config.keysToCheck.length);

    expect(items.filter((item) => item.is_active).length).toBeLessThanOrEqual(
      config.maximumIsActiveItems,
    );

    expect(item._id).not.toBeNull();
    expectPersistentId(item._id);

    expect(item.id).not.toBeNull();
    expectPositiveInteger(item.id);

    expect(["movie", "tvshow"]).toContain(item.item_type);

    expect(item.title).not.toBeNull();

    expect(
      items.filter((item) => item.directors && item.directors.length > 0)
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    expect(
      items.filter((item) => item.genres && item.genres.length > 0).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    item.release_date !== null
      ? expect(!isNaN(new Date(item.release_date).getTime())).toBe(true)
      : null;

    expect(item.ratings_average).toBeGreaterThan(0);

    if (item.is_adult !== null) {
      expect(typeof item.is_adult).toBe("boolean");
    }
    if (item.runtime !== null) {
      expect(typeof item.runtime).toBe("number");
      expect(item.runtime).toBeGreaterThan(0);
    }

    if (item.item_type === "tvshow") {
      expect(
        items.filter(
          (item) => item.platforms_links && item.platforms_links.length > 0,
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter((item) => item.episodes_details).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        item.episodes_details === null ||
          (Array.isArray(item.episodes_details) &&
            item.episodes_details.every((ep) => ep !== null)),
      ).toBe(true);
      expect(
        items.filter((item) => item.last_episode).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter((item) => item.highest_episode).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter((item) => item.lowest_episode).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(["Canceled", "Ended", "Ongoing", "Pilot", "Unknown"]).toContain(
        item.status,
      );
      if (item.platforms_links) {
        expect(
          item.platforms_links.filter((link) =>
            link.link_url.startsWith("https"),
          ).length,
        ).toBe(item.platforms_links.length);
        item.platforms_links.forEach((platform_link) => {
          expect(platform_link.name.includes("Regarder")).toBeFalsy();
        });
      }
    }

    if (item.item_type !== "tvshow") {
      expect(item.episodes_details).toBeNull();
      expect(item.highest_episode).toBeNull();
      expect(item.last_episode).toBeNull();
      expect(item.lowest_episode).toBeNull();
      expect(item.networks).toBeNull();
      expect(item.next_episode).toBeNull();
      expect(item.seasons_number).toBeNull();
      expect(item.status).toBeNull();
    } else if (item.is_active === true) {
      expect(item.seasons_number).not.toBeNull();
      expect(item.seasons_number).toBeGreaterThan(0);
      expect(item.status).not.toBeNull();
    }

    if (item.metacritic) {
      expect(item.metacritic.must_see).not.toBeNull();
    }

    item.trailer
      ? expect(item.trailer).toMatch(
          /^(https:\/\/(fr\.vid\.web\.acsta\.net.*\.mp4|www\.youtube\.com\/embed.*|www\.dailymotion\.com\/embed.*))$/,
        )
      : null;
    expect(items.filter((item) => item.trailer).length).toBeGreaterThanOrEqual(
      config.minimumNumberOfItems.trailer,
    );

    item.item_type === "tvshow" &&
    item.episodes_details &&
    item.episodes_details.length > 0 &&
    item.episodes_details[0]
      ? expect(
          items.filter(
            (item) =>
              item.episodes_details &&
              item.episodes_details.length > 0 &&
              item.episodes_details[0] &&
              typeof item.episodes_details[0].season === "number" &&
              typeof item.episodes_details[0].episode === "number" &&
              typeof item.episodes_details[0].title === "string" &&
              typeof item.episodes_details[0].id === "string" &&
              typeof item.episodes_details[0].url === "string" &&
              typeof item.episodes_details[0].users_rating === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    if (Array.isArray(item.episodes_details)) {
      item.episodes_details.forEach((episode) => {
        if (episode?.id) {
          expectImdbId(episode.id);
        }
        expectIdRatingConsistency(episode, ["users_rating"]);
      });
    }

    const releaseDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    item.last_episode && item.last_episode.release_date
      ? expect(item.last_episode.release_date).toMatch(releaseDatePattern)
      : null;
    item.last_episode
      ? [
          "season",
          "episode",
          "episode_type",
          "title",
          "description",
          "id",
          "url",
          "release_date",
          "users_rating",
        ].forEach((key) => {
          expect(item.last_episode[key]).not.toBe("");

          if (["season", "episode", "title", "id", "url"].includes(key)) {
            expect(item.last_episode[key]).not.toBeNull();
          }
        })
      : null;
    if (item.last_episode?.id) {
      expectImdbId(item.last_episode.id);
    }
    expectIdRatingConsistency(item.last_episode, ["users_rating"]);

    item.next_episode
      ? [
          "season",
          "episode",
          "episode_type",
          "title",
          "description",
          "id",
          "url",
          "release_date",
          "users_rating",
        ].forEach((key) => {
          expect(item.next_episode[key]).not.toBe("");

          if (
            [
              "season",
              "episode",
              "title",
              "id",
              "url",
              "release_date",
            ].includes(key)
          ) {
            expect(item.next_episode[key]).not.toBeNull();
          }
        })
      : null;
    if (item.next_episode?.id) {
      expectImdbId(item.next_episode.id);
    }
    expectIdRatingConsistency(item.next_episode, ["users_rating"]);

    if (item.highest_episode?.id) {
      expectImdbId(item.highest_episode.id);
    }
    expectIdRatingConsistency(item.highest_episode, ["users_rating"]);

    if (item.lowest_episode?.id) {
      expectImdbId(item.lowest_episode.id);
    }
    expectIdRatingConsistency(item.lowest_episode, ["users_rating"]);

    /* Popularity */
    item.is_active === true
      ? expect(
          items.filter((item) => item.allocine?.popularity).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.popularity)
      : null;
    item.is_active === true
      ? expect(
          items.filter((item) => item.imdb?.popularity).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.popularity)
      : null;

    /* AlloCiné */
    if (item.allocine) {
      expect(item.allocine).not.toBeNull();
      expect(item.allocine.id).not.toBeNull();
      expectPositiveInteger(item.allocine.id);
      expect(item.allocine.url).not.toBeNull();
      expect(Object.keys(item.allocine).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.allocine,
      );
      if (item.allocine?.users_rating) {
        expectIdRatingConsistency(item.allocine, ["users_rating"]);
      }
      if (item.allocine?.critics_rating) {
        expectIdRatingConsistency(item.allocine, ["critics_rating"]);
      }
    }
    expect(
      items.filter((item) => typeof item.allocine?.users_rating === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) => typeof item.allocine?.users_rating_count === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.allocine?.critics_rating === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) => typeof item.allocine?.critics_rating_count === "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => item.allocine?.critics_rating_details).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter(
        (item) =>
          item.allocine?.critics_rating_details &&
          typeof item.allocine?.critics_rating_details[0].critic_name ===
            "string" &&
          typeof item.allocine?.critics_rating_details[0].critic_rating ===
            "number",
      ).length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    item.allocine?.critics_rating_count && item.allocine?.critics_rating_details
      ? expect(item.allocine.critics_rating_count).toEqual(
          item.allocine.critics_rating_details.length,
        )
      : null;
    expect(
      items.filter(
        (item) =>
          item.allocine &&
          !item.allocine?.users_rating &&
          !item.allocine?.critics_rating &&
          typeof item.imdb?.users_rating !== "number",
      ).length,
    ).toBe(0);
    if (
      item.allocine?.users_rating &&
      typeof item.allocine?.users_rating_count !== "undefined"
    ) {
      expect(item.allocine.users_rating_count).toBeGreaterThan(0);
    }
    if (
      item.allocine?.critics_rating &&
      typeof item.allocine?.critics_rating_count !== "undefined"
    ) {
      expect(item.allocine.critics_rating_count).toBeGreaterThan(0);
    }

    /* IMDb */
    if (typeof item.imdb?.top_ranking === "number") {
      expect(item.imdb.top_ranking).toBeGreaterThan(0);
    }
    if (item.imdb) {
      expect(item.imdb).not.toBeNull();
      expect(item.imdb.id).not.toBeNull();
      expectImdbId(item.imdb.id);
      expect(item.imdb.url).not.toBeNull();
      expect(Object.keys(item.imdb).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.imdb,
      );
      expectIdRatingConsistency(item.imdb, ["users_rating"]);
    }
    expect(
      items.filter((item) => typeof item.imdb?.users_rating === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => typeof item.imdb?.users_rating_count === "number")
        .length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    expect(
      items.filter((item) => item.imdb && !item.imdb?.users_rating).length,
    ).toBe(0);
    if (
      item.imdb?.users_rating &&
      typeof item.imdb?.users_rating_count !== "undefined"
    ) {
      expect(item.imdb.users_rating_count).toBeGreaterThan(0);
    }
    expect(
      items.filter((item) => typeof item.certification === "string").length,
    ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);

    /* BetaSeries */
    if (item.betaseries) {
      expect(item.betaseries.id).not.toBeNull();
      expectSlugLikeId(item.betaseries.id);
      expect(item.betaseries.url).not.toBeNull();
      expect(Object.keys(item.betaseries).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.betaseries,
      );
      expectIdRatingConsistency(item.betaseries, ["users_rating"]);
      expect(
        items.filter(
          (item) => typeof item.betaseries?.users_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      if (item.is_active === true) {
        expect(
          items.filter(
            (item) => item.betaseries && !item.betaseries?.users_rating,
          ).length,
        ).toBe(0);
        if (
          item.betaseries?.users_rating &&
          typeof item.betaseries?.users_rating_count !== "undefined"
        ) {
          expect(item.betaseries.users_rating_count).toBeGreaterThan(0);
        }
      }
    }
    item.is_active === true
      ? expect(
          items.filter(
            (item) => typeof item.betaseries?.users_rating_count === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;

    /* Metacritic */
    if (item.metacritic) {
      expect(item.metacritic.id).not.toBeNull();
      expectSlugLikeId(item.metacritic.id);
      expect(item.metacritic.url).not.toBeNull();
      expect(Object.keys(item.metacritic).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.metacritic,
      );
      expectIdRatingConsistency(item.metacritic, [
        "users_rating",
        "critics_rating",
      ]);
      expect(
        items.filter(
          (item) => typeof item.metacritic?.users_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      if (item.is_active === true) {
        expect(
          items.filter(
            (item) =>
              item.metacritic &&
              !item.metacritic?.users_rating &&
              !item.metacritic?.critics_rating,
          ).length,
        ).toBe(0);
        if (
          item.metacritic?.users_rating &&
          typeof item.metacritic?.users_rating_count !== "undefined"
        ) {
          expect(item.metacritic.users_rating_count).toBeGreaterThan(0);
        }
        if (
          item.metacritic?.critics_rating &&
          typeof item.metacritic?.critics_rating_count !== "undefined"
        ) {
          expect(item.metacritic.critics_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.metacritic?.must_see === true) {
      expect(item.metacritic.critics_rating).toBeGreaterThanOrEqual(80);
      expect(item.metacritic.critics_rating_count).toBeGreaterThanOrEqual(15);
    }
    if (item.is_active === true) {
      expect(
        items.filter(
          (item) => typeof item.metacritic?.users_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) => typeof item.metacritic?.critics_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) => typeof item.metacritic?.critics_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter((item) => item.metacritic?.must_see === true).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mustSee);
    }

    /* Rotten Tomatoes */
    if (item.rotten_tomatoes) {
      expect(item.rotten_tomatoes.id).not.toBeNull();
      expectSlugLikeId(item.rotten_tomatoes.id);
      expect(item.rotten_tomatoes.url).not.toBeNull();
      expect(Object.keys(item.rotten_tomatoes).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.rottenTomatoes,
      );
      expectIdRatingConsistency(item.rotten_tomatoes, [
        "users_rating",
        "critics_rating",
      ]);
      if (
        typeof item.rotten_tomatoes?.users_rating_liked_count === "number" ||
        typeof item.rotten_tomatoes?.users_rating_not_liked_count === "number"
      ) {
        expect(typeof item.rotten_tomatoes.users_rating_liked_count).toBe(
          "number",
        );
        expect(typeof item.rotten_tomatoes.users_rating_not_liked_count).toBe(
          "number",
        );
      }
      if (item.rotten_tomatoes?.users_rating_count) {
        expect(item.rotten_tomatoes.users_rating_count).toBeGreaterThan(0);
        expect(item.rotten_tomatoes.users_rating_count).toBe(
          item.rotten_tomatoes.users_rating_liked_count +
            item.rotten_tomatoes.users_rating_not_liked_count,
        );
        const expectedUsersRating = Math.round(
          (item.rotten_tomatoes.users_rating_liked_count /
            item.rotten_tomatoes.users_rating_count) *
            100,
        );
        expect(
          Math.abs(item.rotten_tomatoes.users_rating - expectedUsersRating),
        ).toBeLessThanOrEqual(2);
      }
      expect(
        items.filter(
          (item) => typeof item.rotten_tomatoes?.users_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) => typeof item.rotten_tomatoes?.critics_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      if (item.is_active === true) {
        expect(
          items.filter(
            (item) =>
              item.rotten_tomatoes &&
              !item.rotten_tomatoes?.users_rating &&
              !item.rotten_tomatoes?.critics_rating,
          ).length,
        ).toBe(0);
        if (
          item.rotten_tomatoes?.critics_rating &&
          typeof item.rotten_tomatoes?.critics_rating_count !== "undefined"
        ) {
          expect(item.rotten_tomatoes.critics_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.is_active === true) {
      if (item.item_type === "movie") {
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_count === "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_liked_count ===
              "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_not_liked_count ===
              "number",
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      } else if (item.item_type === "tvshow") {
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_count === "number",
          ).length,
        ).toBeGreaterThanOrEqual(0);
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_liked_count ===
              "number",
          ).length,
        ).toBeGreaterThanOrEqual(0);
        expect(
          items.filter(
            (item) =>
              typeof item.rotten_tomatoes?.users_rating_not_liked_count ===
              "number",
          ).length,
        ).toBeGreaterThanOrEqual(0);
      }
      expect(
        items.filter(
          (item) =>
            typeof item.rotten_tomatoes?.critics_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) =>
            typeof item.rotten_tomatoes?.critics_rating_liked_count ===
            "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) =>
            typeof item.rotten_tomatoes?.critics_rating_not_liked_count ===
            "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      if (item.rotten_tomatoes?.critics_rating_count) {
        expect(item.rotten_tomatoes.critics_rating_count).toBe(
          item.rotten_tomatoes.critics_rating_liked_count +
            item.rotten_tomatoes.critics_rating_not_liked_count,
        );
      }
      if (item.item_type === "movie") {
        expect(
          items.filter((item) => item.rotten_tomatoes?.users_certified === true)
            .length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mustSee);
        expect(
          items.filter(
            (item) => item.rotten_tomatoes?.critics_certified === true,
          ).length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mustSee);
      }
    }

    /* Letterboxd */
    if (item.letterboxd) {
      expect(item.letterboxd.id).not.toBeNull();
      expectSlugLikeId(item.letterboxd.id);
      expect(item.letterboxd.url).not.toBeNull();
      expect(Object.keys(item.letterboxd).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.letterboxd,
      );
      expectIdRatingConsistency(item.letterboxd, ["users_rating"]);
      if (item.is_active === true) {
        expect(
          items.filter(
            (item) => item.letterboxd && !item.letterboxd?.users_rating,
          ).length,
        ).toBe(0);
        if (
          item.letterboxd?.users_rating &&
          typeof item.letterboxd?.users_rating_count !== "undefined"
        ) {
          expect(item.letterboxd.users_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.is_active === true && item.item_type === "movie") {
      expect(
        items.filter(
          (item) => typeof item.letterboxd?.users_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) => typeof item.letterboxd?.users_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    }
    item.item_type === "tvshow" ? expect(item.letterboxd).toBeNull() : null; // No tvshows on Letterboxd (yet).

    /* SensCritique */
    if (item.senscritique) {
      expect(item.senscritique.id).not.toBeNull();
      expectNumericIdOrNumericString(item.senscritique.id);
      expect(item.senscritique.url).not.toBeNull();
      expect(Object.keys(item.senscritique).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.senscritique,
      );
      expectIdRatingConsistency(item.senscritique, ["users_rating"]);
      if (item.is_active === true) {
        expect(
          items.filter(
            (item) => item.senscritique && !item.senscritique?.users_rating,
          ).length,
        ).toBe(0);
        if (
          item.senscritique?.users_rating &&
          typeof item.senscritique?.users_rating_count !== "undefined"
        ) {
          expect(item.senscritique.users_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.is_active === true) {
      expect(
        items.filter(
          (item) => typeof item.senscritique?.users_rating === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.senscritiqueItems);
      expect(
        items.filter(
          (item) => typeof item.senscritique?.users_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.senscritiqueItems);
    }

    /* TMDB */
    if (item.tmdb) {
      expect(item.tmdb.id).not.toBeNull();
      expectPositiveInteger(item.tmdb.id);
      expect(item.tmdb.url).not.toBeNull();
      expect(Object.keys(item.tmdb).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.tmdb,
      );
      expectIdRatingConsistency(item.tmdb, ["users_rating"]);
      if (item.is_active === true) {
        expect(
          items.filter((item) => item.tmdb && !item.tmdb?.users_rating).length,
        ).toBe(0);
        if (
          item.tmdb?.users_rating &&
          typeof item.tmdb?.users_rating_count !== "undefined"
        ) {
          expect(item.tmdb.users_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.is_active === true) {
      expect(
        items.filter((item) => typeof item.tmdb?.users_rating === "number")
          .length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
      expect(
        items.filter(
          (item) => typeof item.tmdb?.users_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default);
    }

    /* Trakt */
    if (item.trakt) {
      expect(item.trakt.id).not.toBeNull();
      expectSlugLikeId(item.trakt.id);
      expect(item.trakt.url).not.toBeNull();
      expect(Object.keys(item.trakt).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.trakt,
      );
      expectIdRatingConsistency(item.trakt, ["users_rating"]);
      if (item.is_active === true) {
        expect(
          items.filter((item) => item.trakt && !item.trakt?.users_rating)
            .length,
        ).toBe(0);
        if (
          item.trakt?.users_rating &&
          typeof item.trakt?.users_rating_count !== "undefined"
        ) {
          expect(item.trakt.users_rating_count).toBeGreaterThan(0);
        }
      }
    }
    if (item.is_active === true) {
      expect(
        items.filter((item) => typeof item.trakt?.users_rating === "number")
          .length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.traktItems);
      expect(
        items.filter(
          (item) => typeof item.trakt?.users_rating_count === "number",
        ).length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.traktItems);
    }

    /* TV Time */
    if (item.tv_time) {
      expect(item.tv_time.id).not.toBeNull();
      expectPositiveInteger(item.tv_time.id);
      expect(item.tv_time.url).not.toBeNull();
      expect(Object.keys(item.tv_time).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.tvtime,
      );
      expectIdRatingConsistency(item.tv_time, ["users_rating"]);
      if (item.is_active === true) {
        expect(
          items.filter((item) => item.tv_time && !item.tv_time?.users_rating)
            .length,
        ).toBe(0);
      }
    }
    item.item_type === "tvshow"
      ? expect(
          items.filter((item) => typeof item.tv_time?.users_rating === "number")
            .length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    item.item_type === "movie" ? expect(item.tv_time).toBeNull() : null; // No tv_time information for movie item type.

    /* TheTVDB */
    if (item.thetvdb) {
      expect(item.thetvdb.id).not.toBeNull();
      expectPositiveInteger(item.thetvdb.id);
      expect(item.thetvdb.url).not.toBeNull();
      expect(Object.keys(item.thetvdb).length).toBeGreaterThanOrEqual(
        config.minimumNumberOfItems.thetvdb,
      );
      if (item.is_active === true) {
        expect(
          items.filter((item) => item.thetvdb && !item.thetvdb?.slug).length,
        ).toBe(0);
      }
    }
    item.is_active === true
      ? expect(
          items.filter((item) => typeof item.thetvdb?.slug === "string").length,
        ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.default)
      : null;
    if (item.thetvdb?.slug) {
      expectSlugLikeId(item.thetvdb.slug);
    }

    /* Mojo */
    if (item.is_active === true && item.mojo) {
      expect(item.mojo).toEqual(
        expect.objectContaining({
          rank: expect.any(Number),
          url: expect.stringMatching(
            /^https:\/\/www\.boxofficemojo\.com\/title\/tt\d+\/?$/,
          ),
          lifetime_gross: expect.any(Number),
        }),
      );
      expect(Number.isInteger(item.mojo.rank)).toBe(true);
      expect(item.mojo.rank).toBeGreaterThan(0);
      expect(item.mojo.lifetime_gross).toBeGreaterThan(0);
    }
    if (item.is_active === true && item.item_type === "movie") {
      expect(
        items.filter((item) => typeof item.mojo?.lifetime_gross === "number")
          .length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo);
      expect(
        items.filter((item) => item.mojo && Number.isInteger(item.mojo.rank))
          .length,
      ).toBeGreaterThanOrEqual(config.minimumNumberOfItems.mojo);
      expect(
        items.filter(
          (entry) =>
            typeof entry.mojo?.rank === "number" && entry.mojo.rank >= 1200,
        ).length,
      ).toBeGreaterThanOrEqual(1);
    }
    item.item_type === "tvshow" ? expect(item.mojo).toBeNull() : null; // No mojo information for tvshow item type.
  });
}

/**
 * Validates that the ID of a single item in an array matches the expected value.
 *
 * @param {Array<Object>} items - An array of items, typically containing only one item, expected to be returned from the API.
 *                                The item is expected to have a `tmdb` object containing an `id` property.
 * @param {number} expectedId - The expected ID value that the single item's ID should match.
 */
function checkSingleItemId(items, expectedId) {
  expect(items.length).toBe(1);
  expect(items[0].tmdb.id).toBe(expectedId);
}

const SINGLE_RATING_ALLOWED_DELTA = 0.2;

const createSingleRatingsFilterExpectation = ({ getRating, divisor = 1 }) => {
  return (items) => {
    items.forEach((item) => {
      const rating = getRating(item);

      expect(rating).not.toBeNull();
      expect(rating).not.toBeUndefined();
      expect(typeof rating).toBe("number");
      expect(Number.isFinite(rating)).toBe(true);
      expect(typeof item.ratings_average).toBe("number");

      const normalizedRating = rating / divisor;
      const roundedAverage =
        Math.round((normalizedRating + Number.EPSILON) * 10) / 10;

      expect(
        Math.abs(item.ratings_average - roundedAverage),
      ).toBeLessThanOrEqual(SINGLE_RATING_ALLOWED_DELTA);
    });
  };
};

/**
 * An object containing various query parameters and their expected results.
 * @type {Record<string, { query: string, expectedResult: (items: any) => void }>}
 */
const params = {
  valid_users_ratings: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        const ratingItems = [
          {
            source: item.allocine,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.allocine,
            max: config.ratingsValues.maximum.allocine,
            isStrict: true,
          },
          {
            source: item.allocine,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.allocine,
            max: config.ratingsValues.maximum.allocine,
            isStrict: true,
          },
          {
            source: item.betaseries,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.betaseries,
            max: config.ratingsValues.maximum.betaseries,
          },
          {
            source: item.imdb,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.imdb,
            max: config.ratingsValues.maximum.imdb,
            isStrict: true,
          },
          {
            source: item.metacritic,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.metacriticUsers,
            max: config.ratingsValues.maximum.metacriticUsers,
          },
          {
            source: item.metacritic,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.metacriticCritics,
            max: config.ratingsValues.maximum.metacriticCritics,
          },
          {
            source: item.rotten_tomatoes,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.rottenTomatoes,
            max: config.ratingsValues.maximum.rottenTomatoes,
          },
          {
            source: item.rotten_tomatoes,
            ratingType: "critics_rating",
            min: config.ratingsValues.minimum.rottenTomatoes,
            max: config.ratingsValues.maximum.rottenTomatoes,
          },
          {
            source: item.letterboxd,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.letterboxd,
            max: config.ratingsValues.maximum.letterboxd,
          },
          {
            source: item.senscritique,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.senscritique,
            max: config.ratingsValues.maximum.senscritique,
          },
          {
            source: item.tmdb,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.tmdb,
            max: config.ratingsValues.maximum.tmdb,
            isStrict: true,
          },
          {
            source: item.trakt,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.trakt,
            max: config.ratingsValues.maximum.trakt,
            isStrict: true,
          },
          {
            source: item.tv_time,
            ratingType: "users_rating",
            min: config.ratingsValues.minimum.tvtime,
            max: config.ratingsValues.maximum.tvtime,
            isStrict: true,
          },
        ];

        for (let ratingItem of ratingItems) {
          checkRatings(
            ratingItem.source,
            ratingItem.ratingType,
            ratingItem.min,
            ratingItem.max,
            ratingItem.isStrict,
          );
        }
      }),
  },

  all_keys_type_check: {
    query: `?item_type=movie,tvshow&is_active=true,false&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => checkTypes(item, schema)),
  },

  default_movies: {
    query: "",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");

        const movieItems = items.filter((item) => item.item_type === "movie");
        const tvshowItems = items.filter((item) => item.item_type === "tvshow");

        expect(movieItems.length).toBeGreaterThan(0);
        expect(tvshowItems.length).toBeGreaterThan(0);

        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");

        item.metacritic
          ? expect([true, false]).toContain(item.metacritic.must_see)
          : null;

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_movies: {
    query: "?item_type=movie",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");

        item.metacritic
          ? expect([true, false]).toContain(item.metacritic.must_see)
          : null;

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_tvshows: {
    query: "?item_type=tvshow",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");

        item.metacritic
          ? expect([true, false]).toContain(item.metacritic.must_see)
          : null;

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_active_items: {
    query: "?is_active=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeTruthy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_non_active_items: {
    query: "?is_active=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(item.is_active).toBeFalsy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_adult_items: {
    query: "?item_type=movie,tvshow&is_active=true,false&is_adult=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeTruthy();
      }),
  },

  only_non_adult_items: {
    query: "?item_type=movie,tvshow&is_active=true,false&is_adult=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_must_see_items: {
    query: "?must_see=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.metacritic).toHaveProperty("must_see");
        expect(item.metacritic.must_see).toBeTruthy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_non_must_see_items: {
    query: "?must_see=false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.metacritic).toHaveProperty("must_see");
        expect(item.metacritic.must_see).toBeFalsy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_users_certified_items: {
    query: "?users_certified=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.rotten_tomatoes).toHaveProperty("users_certified");
        expect(item.rotten_tomatoes.users_certified).toBeTruthy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  only_critics_certified_items: {
    query: "?critics_certified=true",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.rotten_tomatoes).toHaveProperty("critics_certified");
        expect(item.rotten_tomatoes.critics_certified).toBeTruthy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  both_movies_and_tvshows: {
    query: "?item_type=movie,tvshow",
    expectedResult: (items) => {
      const movieItems = items.filter((item) => item.item_type === "movie");
      const tvshowItems = items.filter((item) => item.item_type === "tvshow");

      expect(movieItems.length).toBeGreaterThan(0);
      expect(tvshowItems.length).toBeGreaterThan(0);
    },
  },

  both_active_and_non_active_items: {
    query: "?is_active=true,false",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("is_active");
        expect(
          item.is_active === true || item.is_active === false,
        ).toBeTruthy();

        expect(item).toHaveProperty("is_adult");
        expect(item.is_adult).toBeFalsy();
      }),
  },

  movies_with_runtime_between_60_and_120_minutes: {
    query: "?item_type=movie&runtime=3600,7200",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
        expect(item).toHaveProperty("runtime");
        expect(typeof item.runtime).toBe("number");
        expect(item.runtime).toBeGreaterThanOrEqual(3600);
        expect(item.runtime).toBeLessThanOrEqual(7200);
      });
    },
  },

  movies_with_runtime_between_60_and_120_minutes_unsorted_values: {
    query: "?item_type=movie&runtime=7200,3600",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
        expect(item).toHaveProperty("runtime");
        expect(typeof item.runtime).toBe("number");
        expect(item.runtime).toBeGreaterThanOrEqual(3600);
        expect(item.runtime).toBeLessThanOrEqual(7200);
      });
    },
  },

  tvshows_with_runtime_between_30_and_60_minutes: {
    query: "?item_type=tvshow&runtime=1800,3600",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("runtime");
        expect(typeof item.runtime).toBe("number");
        expect(item.runtime).toBeGreaterThanOrEqual(1800);
        expect(item.runtime).toBeLessThanOrEqual(3600);
      });
    },
  },

  movies_with_runtime_single_value: {
    query: "?item_type=movie&runtime=5400",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const expectedRuntime = items[0].runtime;
      expect(typeof expectedRuntime).toBe("number");
      expect(expectedRuntime).toBe(5400);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
        expect(item).toHaveProperty("runtime");
        expect(item.runtime).toBe(expectedRuntime);
      });
    },
  },

  movies_with_invalid_runtime_value: {
    query: "?item_type=movie&runtime=invalid",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const itemsWithRuntime = items.filter(
        (item) => typeof item.runtime === "number" && item.runtime > 0,
      );
      expect(itemsWithRuntime.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("movie");
        expect(item).toHaveProperty("runtime");
        if (typeof item.runtime === "number") {
          expect(item.runtime).toBeGreaterThan(0);
        } else {
          expect(item.runtime === null).toBe(true);
        }
      });
    },
  },

  should_limit_null_values_for_specific_keys_in_active_movies_and_tvshows: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const result = countNullValues(items);

      expect(result.totalMovieNullCount).toBeLessThanOrEqual(
        config.maxNullValues,
      );
      expect(result.totalTVShowNullCount).toBeLessThanOrEqual(
        config.maxNullValues,
      );
    },
  },

  only_tvshows_with_1_season: {
    query: "?item_type=tvshow&seasons_number=1",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBe(1);
      });
    },
  },

  only_tvshows_with_1_and_2_seasons: {
    query: "?item_type=tvshow&seasons_number=1,2",
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      });
    },
  },

  should_return_all_tvshows_since_max_season_number_is_included: {
    query: `?item_type=tvshow&seasons_number=1,2,3,4,5&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      const hasSeason1 = items.some((item) => item.seasons_number === 1);
      const hasManySeasons = items.some((item) => item.seasons_number > 5);

      expect(hasSeason1).toBe(true);
      expect(hasManySeasons).toBe(true);

      items.forEach((item) => {
        expect(item).toHaveProperty("item_type");
        expect(item.item_type).toBe("tvshow");
        expect(item).toHaveProperty("seasons_number");
        expect(typeof item.seasons_number).toBe("number");
      });
    },
  },

  tvshows_seasons_number_should_be_at_least_episode_season: {
    query: `?item_type=tvshow&append_to_response=last_episode,next_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      items.forEach((item) => {
        if (item.seasons_number) {
          const checkSeasonNumber = (episode) => {
            expect(typeof episode.season).toBe("number");
            expect(item.seasons_number).toBeGreaterThanOrEqual(episode.season);
          };

          if (item.next_episode) {
            checkSeasonNumber(item.next_episode);
          } else if (item.last_episode) {
            checkSeasonNumber(item.last_episode);
          }
        }
      });
    },
  },

  only_episodes_from_season_2: {
    query:
      "?item_type=tvshow&append_to_response=episodes_details&filtered_seasons=2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("episodes_details");
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            expect(episode).toHaveProperty("season");
            expect(episode.season).toBe(2);
          });
        }
      }),
  },

  only_episodes_from_season_3_and_2: {
    query:
      "?item_type=tvshow&append_to_response=episodes_details&filtered_seasons=3,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("episodes_details");
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            expect(episode).toHaveProperty("season");
            expect([2, 3]).toContain(episode.season);
          });
        }
      }),
  },

  should_return_all_seasons_on_wrong_filtered_seasons_value: {
    query: `?item_type=tvshow&append_to_response=episodes_details&filtered_seasons=wrong_value&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      let hasSeason1 = false;
      let hasSeason2 = false;

      items.forEach((item) => {
        expect(item).toHaveProperty("episodes_details");
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            expect(episode).toHaveProperty("season");

            if (episode.season === 1) hasSeason1 = true;
            if (episode.season === 2) hasSeason2 = true;
          });
        }
      });

      expect(hasSeason1).toBe(true);
      expect(hasSeason2).toBe(true);
    },
  },

  only_episodes_from_season_3_and_1_on_search: {
    query:
      "?imdbid=tt0903747&append_to_response=episodes_details&filtered_seasons=3,1",
    expectedResult: (items) => {
      checkSingleItemId(items, 1396);
      const item = items[0];
      expect(item).toHaveProperty("episodes_details");
      if (Array.isArray(item.episodes_details)) {
        item.episodes_details.forEach((episode) => {
          expect(episode).toHaveProperty("season");
          expect([1, 3]).toContain(episode.season);
        });
      }
    },
  },

  should_return_all_seasons_on_wrong_filtered_seasons_value_on_search: {
    query:
      "?imdbid=tt0903747&append_to_response=episodes_details&filtered_seasons=wrong_value",
    expectedResult: (items) => {
      checkSingleItemId(items, 1396);
      const item = items[0];
      expect(item).toHaveProperty("episodes_details");
      if (Array.isArray(item.episodes_details)) {
        item.episodes_details.forEach((episode) => {
          expect(episode).toHaveProperty("season");
          expect([1, 2, 3, 4, 5]).toContain(episode.season);
        });
      }
    },
  },

  should_not_return_an_error_if_append_to_response_is_empty_and_filtered_seasons_is_added_on_search:
    {
      query: "?imdbid=tt0903747&append_to_response=&filtered_seasons=1",
      expectedResult: (items) => {
        checkSingleItemId(items, 1396);
        expect(items[0]).not.toHaveProperty("episodes_details");
      },
    },

  only_ongoing_tvshows: {
    query: "?item_type=tvshow&status=ongoing",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item.status).not.toBeNull();
      }),
  },

  ongoing_and_canceled_tvshows: {
    query: "?item_type=tvshow&is_active=true,false&status=canceled,ended",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(["Canceled", "Ended"]).toContain(item.status);
      }),
  },

  only_null_status_items: {
    query: "?item_type=movie&status=&limit=200",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe(null);
      }),
  },

  cinema_id_should_be_ignored: {
    query: "?cinema_id=undefined&is_active=true,false&limit=200",
    expectedResult: (items) =>
      items.forEach((_) => {
        expect(items.length).toBe(200);
      }),
  },

  custom_limit_value_to_1: {
    query: "?limit=1",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
    },
  },

  custom_limit_value_to_5: {
    query: "?limit=5",
    expectedResult: (items) => {
      expect(items.length).toBe(5);
    },
  },

  only_movies_directed_by_christopher_nolan: {
    query: `?is_active=true,false&item_type=movie&directors=${encodeURIComponent("Christopher Nolan")}`,
    expectedResult: (items) => {
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(Array.isArray(item.directors)).toBe(true);
        expect(item.directors).toContain("Christopher Nolan");
      });
    },
  },

  ongoing_tvshows_with_1_and_2_seasons: {
    query: "?item_type=tvshow&status=ongoing&seasons_number=1,2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ongoing");
        expect(item).toHaveProperty("seasons_number");
        expect(item.seasons_number).toBeLessThanOrEqual(2);
      }),
  },

  return_correct_movie_item_type_on_same_path_id: {
    query: "/movie/10003?append_to_response",
    expectedResult: (item) => {
      expect(item.id).toBe(10003);
      expect(item.item_type).toBe("movie");
    },
  },

  return_correct_tvshow_item_type_on_same_path_id: {
    query: "/tvshow/10003?append_to_response",
    expectedResult: (item) => {
      expect(item.id).toBe(10003);
      expect(item.item_type).toBe("tvshow");
    },
  },

  correct_tmdb_id_returned_on_path: {
    query: "/tvshow/249042?append_to_response",
    expectedResult: (item) => {
      expect(item.id).toBe(249042);
      expect(item.allocine).not.toHaveProperty("critics_rating_details");
      expect(item).not.toHaveProperty("episodes_details");
    },
  },

  correct_tmdb_id_returned_on_path_with_critics_rating_details: {
    query: "/tvshow/249042?append_to_response=critics_rating_details",
    expectedResult: (item) => {
      expect(item.id).toBe(249042);
      expect(item.allocine).toHaveProperty("critics_rating_details");
      expect(item).not.toHaveProperty("episodes_details");
    },
  },

  correct_tmdb_id_returned_on_path_with_episodes_details: {
    query: "/tvshow/249042?append_to_response=episodes_details",
    expectedResult: (item) => {
      expect(item.id).toBe(249042);
      expect(item.allocine).not.toHaveProperty("critics_rating_details");
      expect(item).toHaveProperty("episodes_details");
    },
  },

  correct_tmdb_id_returned_on_search: {
    query: "?tmdbid=249042",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(249042);
      expect(items[0].allocine).not.toHaveProperty("critics_rating_details");
      expect(items[0]).not.toHaveProperty("episodes_details");
    },
  },

  correct_tmdb_id_returned_on_search_with_append_to_response: {
    query:
      "?tmdbid=249042&append_to_response=critics_rating_details,episodes_details",
    expectedResult: (items) => {
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(249042);
      expect(items[0].allocine).toHaveProperty("critics_rating_details");
      expect(items[0]).toHaveProperty("episodes_details");
    },
  },

  correct_tmdb_id_returned_on_search_with_append_to_response_but_without_critics_rating_details:
    {
      query: "?tmdbid=249042&append_to_response=episodes_details",
      expectedResult: (items) => {
        expect(items.length).toBe(1);
        expect(items[0].id).toBe(249042);
        expect(items[0].allocine).not.toHaveProperty("critics_rating_details");
        expect(items[0]).toHaveProperty("episodes_details");
      },
    },

  titles_containing_breaking_bad_on_search: {
    query: "?title=breaking bad",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.title.toLowerCase()).toContain("breaking bad");
      }),
  },

  title_with_commas_on_search: {
    query: "?title=cours lola cours",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.title).toBe("Cours, Lola, cours");
      }),
  },

  should_return_allocine_id_on_search: {
    query: "?allocineid=304508",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_betaseries_id_on_search: {
    query: "?betaseriesid=132011-emilia-perez&allocineid=304508",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_imdb_id_on_search: {
    query: "?imdbid=tt20221436&letterboxdid=unknown",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_imdb_id_case_sensitive_on_search: {
    query: "?imdbId=tt20221436&letterboxdid=unknown",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_letterboxd_id_on_search: {
    query: "?letterboxdid=emilia-perez",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_metacritic_id_on_search: {
    query: "?metacriticid=squid-game",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
    },
  },
  should_return_rottentomatoes_id_on_search: {
    query: "?rottentomatoesid=emilia_perez",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_senscritique_id_on_search: {
    query: "?senscritiqueid=54313969",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_trakt_id_on_search: {
    query: "?traktid=783557",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_tmdb_id_on_search: {
    query: "?tmdbid=974950",
    expectedResult: (items) => {
      checkSingleItemId(items, 974950);
    },
  },
  should_return_tvtime_id_on_search: {
    query: "?tvtimeid=383275",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
    },
  },
  should_return_thetvdb_id_on_search: {
    query: "?thetvdbid=383275",
    expectedResult: (items) => {
      checkSingleItemId(items, 93405);
    },
  },

  ascending_popularity_average: {
    query: "?item_type=tvshow",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].popularity_average).toBeGreaterThanOrEqual(
          items[i - 1].popularity_average,
        );
      }
    },
  },

  top_popularity_items_movie: {
    query: "?item_type=movie&limit=200",
    expectedResult: (items) => {
      expect(
        items.filter(
          (item) =>
            item.allocine?.popularity >= 1 && item.allocine?.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        items.filter(
          (item) => item.imdb?.popularity >= 1 && item.imdb?.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
    },
  },

  top_popularity_items_tvshow: {
    query: "?item_type=tvshow&limit=200",
    expectedResult: (items) => {
      expect(
        items.filter(
          (item) =>
            item.allocine?.popularity >= 1 && item.allocine?.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
      expect(
        items.filter(
          (item) => item.imdb?.popularity >= 1 && item.imdb?.popularity <= 5,
        ).length,
      ).toBeGreaterThan(0);
    },
  },

  correct_allocine_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=allocine_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].allocine.popularity).toBeGreaterThanOrEqual(
          items[i - 1].allocine.popularity,
        );
      }
    },
  },

  correct_imdb_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].imdb.popularity).toBeGreaterThanOrEqual(
          items[i - 1].imdb.popularity,
        );
      }
    },
  },

  correct_none_popularity_order: {
    query: "?item_type=tvshow&popularity_filters=none,imdb_popularity",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(
          items[i - 1].ratings_average,
        );
      }
    },
  },

  popularity_filters_with_wrong_value: {
    query: "?item_type=tvshow&popularity_filters=wrong_value",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(
          items[i - 1].ratings_average,
        );
      }
    },
  },

  items_with_minimum_ratings: {
    query: "?minimum_ratings=4,3.5",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(3.5);
      }),
  },

  items_with_no_minimum_ratings: {
    query: `?item_type=movie,tvshow&is_active=true,false&minimum_ratings=0&limit=${higherLimit}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item.ratings_average).toBeGreaterThanOrEqual(0);
        expect(items.length).toEqual(higherLimit);
      }),
  },

  compare_two_minimum_ratings: {
    query: "?item_type=tvshow&popularity_filters=none&minimum_ratings=3.5",
    expectedResult: async (items) => {
      const response = await axios.get(
        `${baseURL}?item_type=tvshow&popularity_filters=none&minimum_ratings=3.5,1&api_key=${config.internalApiKey}`,
      );
      const data = response.data;
      const itemsFromExtraCall = data.results;

      expect(items.length).toEqual(itemsFromExtraCall.length);

      items.forEach((item, index) => {
        expect(item).toEqual(itemsFromExtraCall[index]);
      });
    },
  },

  compare_two_ratings_filters: {
    query: "?ratings_filters=all",
    expectedResult: async (items) => {
      const response = await axios.get(
        `${baseURL}?ratings_filters=${config.ratings_filters}&api_key=${config.internalApiKey}`,
      );
      const results = response.data.results;

      items.forEach((item, index) => {
        expect(item.ratings_average).toEqual(results[index].ratings_average);
      });
    },
  },

  allocine_critics_rating_present: {
    query: "?ratings_filters=allocine_critics",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.allocine?.critics_rating,
    }),
  },

  allocine_users_rating_present: {
    query: "?ratings_filters=allocine_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.allocine?.users_rating,
    }),
  },

  betaseries_users_rating_present: {
    query: "?ratings_filters=betaseries_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.betaseries?.users_rating,
    }),
  },

  imdb_users_rating_present: {
    query: "?ratings_filters=imdb_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.imdb?.users_rating,
      divisor: 2,
    }),
  },

  metacritic_critics_rating_present: {
    query: "?ratings_filters=metacritic_critics",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.metacritic?.critics_rating,
      divisor: 20,
    }),
  },

  metacritic_users_rating_present: {
    query: "?ratings_filters=metacritic_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.metacritic?.users_rating,
      divisor: 2,
    }),
  },

  rottentomatoes_critics_rating_present: {
    query: "?ratings_filters=rottentomatoes_critics",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.rotten_tomatoes?.critics_rating,
      divisor: 20,
    }),
  },

  rottentomatoes_users_rating_present: {
    query: "?ratings_filters=rottentomatoes_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.rotten_tomatoes?.users_rating,
      divisor: 20,
    }),
  },

  letterboxd_users_rating_present: {
    query: "?ratings_filters=letterboxd_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.letterboxd?.users_rating,
    }),
  },

  senscritique_users_rating_present: {
    query: "?ratings_filters=senscritique_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.senscritique?.users_rating,
      divisor: 2,
    }),
  },

  tmdb_users_rating_present: {
    query: "?ratings_filters=tmdb_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.tmdb?.users_rating,
      divisor: 2,
    }),
  },

  trakt_users_rating_present: {
    query: "?ratings_filters=trakt_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.trakt?.users_rating,
      divisor: 20,
    }),
  },

  tvtime_users_rating_present: {
    query: "?ratings_filters=tvtime_users",
    expectedResult: createSingleRatingsFilterExpectation({
      getRating: (item) => item.tv_time?.users_rating,
      divisor: 2,
    }),
  },

  ratings_average_when_selecting_three_sources: {
    query: "?ratings_filters=imdb_users,allocine_users,metacritic_users",
    expectedResult: (items) => {
      items.forEach((item) => {
        const allocineRating = item.allocine?.users_rating;
        const imdbRating = item.imdb?.users_rating;
        const metacriticRating = item.metacritic?.users_rating;

        const ratings = [
          { value: allocineRating, divisor: 1 },
          { value: imdbRating, divisor: 2 },
          { value: metacriticRating, divisor: 2 },
        ];

        const numericRatings = ratings.filter(({ value }) => {
          return typeof value === "number" && Number.isFinite(value);
        });

        expect(typeof item.ratings_average).toBe("number");
        expect(Number.isFinite(item.ratings_average)).toBe(true);

        const normalizedRatings = numericRatings.map(
          ({ value, divisor }) => value / divisor,
        );

        const average =
          normalizedRatings.reduce((sum, rating) => sum + rating, 0) /
          normalizedRatings.length;
        const roundedAverage = Math.round((average + Number.EPSILON) * 10) / 10;

        expect(
          Math.abs(item.ratings_average - roundedAverage),
        ).toBeLessThanOrEqual(SINGLE_RATING_ALLOWED_DELTA);
      });
    },
  },

  ratings_average_for_incorrect_minimum_ratings: {
    query:
      "?item_type=tvshow&popularity_filters=none&minimum_ratings=some invalid value to be tested",
    expectedResult: (items) => {
      for (let i = 1; i < items.length; i++) {
        expect(items[i].ratings_average).toBeLessThanOrEqual(
          items[i - 1].ratings_average,
        );
      }
    },
  },

  items_with_all_required_keys_active_movie: {
    query: `?item_type=movie&is_active=true&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_movie: {
    query: `?item_type=movie&is_active=false&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${higherLimit}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_active_tvshow: {
    query: `?item_type=tvshow&is_active=true&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  items_with_all_required_keys_inactive_tvshow: {
    query: `?item_type=tvshow&is_active=false&append_to_response=critics_rating_details,episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: checkItemProperties,
  },

  all_keys_are_lowercase: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) =>
      items.forEach((item) => {
        for (let key in item) {
          expect(key).toEqual(key.toLowerCase());
        }
      }),
  },

  unique_allocine_ids_movie: {
    query: `?item_type=movie&is_active=true,false&limit=${higherLimit}`,
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  unique_allocine_ids_tvshow: {
    query: `?item_type=tvshow&is_active=true,false&limit=${higherLimit}`,
    expectedResult: (items) => {
      const ids = items.map((item) => item.allocine.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toEqual(ids.length);
    },
  },

  items_updated_within_last_2_months: {
    query: `?item_type=movie,tvshow&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const today = new Date();
      const dateInThePast = new Date(
        today.getTime() - 60 * 24 * 60 * 60 * 1000,
      );

      items.forEach((item) => {
        expect(item).toHaveProperty("updated_at");
        let itemDate = new Date(item.updated_at);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(
          dateInThePast.getTime(),
        );
      });
    },
  },

  should_return_all_platforms: {
    query: `?item_type=tvshow&is_active=true,false&platforms=${encodeURIComponent("all,Disney+")}&limit=250`,
    expectedResult: (items) => {
      expect(items.length).toBe(250);
    },
  },

  only_platforms_disney_plus: {
    query: `?item_type=tvshow&platforms=${encodeURIComponent("allWrong,Disney+")}&limit=250`,
    expectedResult: (items) => {
      expect(items.length).not.toBe(250);

      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        expect(
          item.platforms_links.some((platform) => platform.name === "Disney+"),
        ).toBeTruthy();
      });
    },
  },

  only_platforms_netflix_or_canal: {
    query: `?item_type=movie&platforms=${encodeURIComponent("Netflix,Canal+")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        const hasNetflix = item.platforms_links.some(
          (platform) => platform.name === "Netflix",
        );
        const hasCanalPlus = item.platforms_links.some(
          (platform) => platform.name === "Canal+",
        );
        expect(hasNetflix || hasCanalPlus).toBeTruthy();
      });
    },
  },

  should_return_correct_value_when_platform_contains_all: {
    query: `?platforms=${encodeURIComponent("allAndSomeOtherWords,Netflix")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("platforms_links");
        expect(item.platforms_links).not.toBeNull();
        expect(
          item.platforms_links.some((platform) => platform.name === "Netflix"),
        ).toBeTruthy();
      });
    },
  },

  should_return_all_genres: {
    query: `?item_type=tvshow&is_active=true,false&genres=${encodeURIComponent("allgenres,Drama")}&limit=250`,
    expectedResult: (items) => {
      expect(items.length).toBe(250);
    },
  },

  only_genres_drama: {
    query: `?item_type=tvshow&genres=${encodeURIComponent("allgenresWrong,Drama")}&limit=250`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("genres");
        expect(item.genres).not.toBeNull();
        expect(item.genres.some((genre) => genre === "Drama")).toBeTruthy();
      });
    },
  },

  only_genres_drama_and_platforms_netflix: {
    query: `?item_type=tvshow&genres=${encodeURIComponent("Drama")}&platforms=${encodeURIComponent("Netflix")}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("genres");
        expect(item).toHaveProperty("platforms_links");

        expect(item.genres).not.toBeNull();
        expect(item.platforms_links).not.toBeNull();

        expect(item.genres.some((genre) => genre === "Drama")).toBeTruthy();
        expect(
          item.platforms_links.some((platform) => platform.name === "Netflix"),
        ).toBeTruthy();
      });
    },
  },

  only_networks_hbo: {
    query: `?item_type=tvshow&networks=${encodeURIComponent("^hbo$")}&is_active=true,false&limit=900`, // Added ‘HBO’ in lowercase and as a regex on purpose to ensure it works.
    expectedResult: (items) => {
      expect(items.length).not.toBe(900);

      items.forEach((item) => {
        expect(item).toHaveProperty("networks");
        expect(item.networks).not.toBeNull();
        expect(item.networks.some((network) => network === "HBO")).toBeTruthy();
      });
    },
  },

  only_production_companies_paramount_pictures: {
    query: `?item_type=tvshow&production_companies=${encodeURIComponent("^paramount pictures$")}&is_active=true,false&limit=900`, // Added ‘Paramount Pictures’ in lowercase and as a regex on purpose to ensure it works.
    expectedResult: (items) => {
      expect(items.length).not.toBe(900);

      items.forEach((item) => {
        expect(item).toHaveProperty("production_companies");
        expect(item.production_companies).not.toBeNull();
        expect(
          item.production_companies.some(
            (company) => company === "Paramount Pictures",
          ),
        ).toBeTruthy();
      });
    },
  },

  only_networks_and_production_companies_hbo: {
    query: `?item_type=tvshow&networks=${encodeURIComponent("^hbo$")}&production_companies=${encodeURIComponent("^hbo$")}&is_active=true,false&limit=900`,
    expectedResult: (items) => {
      expect(items.length).not.toBe(900);

      items.forEach((item) => {
        expect(item).toHaveProperty("networks");
        expect(item.networks).not.toBeNull();
        expect(item.networks.some((network) => network === "HBO")).toBeTruthy();

        expect(item).toHaveProperty("production_companies");
        expect(item.production_companies).not.toBeNull();
        expect(
          item.production_companies.some((company) => company === "HBO"),
        ).toBeTruthy();
      });
    },
  },

  multiple_networks_and_companies: {
    query: `?item_type=tvshow&networks=${encodeURIComponent("hbo,netflix")}&production_companies=${encodeURIComponent("universal,warner")}&is_active=true,false&limit=900`,
    expectedResult: (items) => {
      expect(items.length).not.toBe(900);

      items.forEach((item) => {
        expect(item).toHaveProperty("networks");
        expect(item.networks).not.toBeNull();

        const matchesNetwork = item.networks.some((network) => {
          const name = network.toLowerCase();
          return name.includes("hbo") || name.includes("netflix");
        });
        expect(matchesNetwork).toBeTruthy();

        expect(item).toHaveProperty("production_companies");
        expect(item.production_companies).not.toBeNull();

        const matchesCompany = item.production_companies.some((company) => {
          const name = company.toLowerCase();
          return name.includes("universal") || name.includes("warner");
        });
        expect(matchesCompany).toBeTruthy();
      });
    },
  },

  should_return_new_items_movie_when_filtered_by_release_date: {
    query: `?item_type=movie&is_active=true&release_date=everything,new&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          sixMonthsAgo.getTime(),
        );
      });
    },
  },

  should_return_new_items_tvshow_when_filtered_by_release_date: {
    query: `?item_type=tvshow&is_active=true&release_date=everything,new&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const eighteenMonthsAgo = new Date();
        eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          eighteenMonthsAgo.getTime(),
        );
      });
    },
  },

  should_return_all_items_if_release_date_does_not_include_new: {
    query: `?item_type=movie&is_active=true&release_date=everything&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("release_date");

        const releaseDate = new Date(item.release_date);
        const severalYearsAgo = new Date();
        severalYearsAgo.setFullYear(severalYearsAgo.getFullYear() - 1000);
        expect(releaseDate).toBeInstanceOf(Date);
        expect(releaseDate).not.toBeNaN();
        expect(releaseDate.getTime()).toBeGreaterThanOrEqual(
          severalYearsAgo.getTime(),
        );
      });
    },
  },

  should_return_minimum_5_recently_released_items: {
    query: `?item_type=movie&is_active=true&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const recentItems = items.filter((item) => {
        if (!item.hasOwnProperty("release_date")) {
          return false;
        }
        const releaseDate = new Date(item.release_date);
        if (isNaN(releaseDate.getTime())) {
          return false;
        }
        const today = new Date();
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);
        return releaseDate >= twoWeeksAgo && releaseDate <= today;
      });

      expect(recentItems.length).toBeGreaterThanOrEqual(5);
    },
  },

  should_return_correct_episodes_details_values: {
    query: `?item_type=movie,tvshow&append_to_response=episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.episodes_details) {
          if (item.item_type === "movie") {
            expect(item.episodes_details).toBeNull();
          } else {
            let lastGlobalEpisodeNumber = -1;
            item.episodes_details.forEach((episode) => {
              if (episode?.season && episode?.episode) {
                const currentGlobalEpisodeNumber = parseInt(
                  `${String(episode.season)}${String(episode.episode).padStart(2, "0")}`,
                );
                expect(currentGlobalEpisodeNumber).toBeGreaterThan(
                  lastGlobalEpisodeNumber,
                );
                lastGlobalEpisodeNumber = currentGlobalEpisodeNumber;

                // Check that future episodes have null users_rating
                if (episode.release_date) {
                  if (
                    formatDate(episode.release_date) >= formatDate(new Date())
                  ) {
                    expect(episode.users_rating).toBeNull();
                  }
                }
              }
            });
          }
        }
      });
    },
  },

  should_match_last_episode_details: {
    query: `?item_type=tvshow&is_active=true&append_to_response=episodes_details,last_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (item.episodes_details && item.last_episode) {
          const pastEpisodes = item.episodes_details.filter(
            (ep) =>
              ep?.release_date &&
              formatDate(ep.release_date) < formatDate(new Date()) &&
              ep?.users_rating &&
              ep?.users_rating_count,
          );

          const lastAired = pastEpisodes[pastEpisodes.length - 1];

          if (lastAired) {
            expect(lastAired.title).toBe(item.last_episode.title);
            expect(lastAired.episode).toBe(item.last_episode.episode);
            expect(lastAired.season).toBe(item.last_episode.season);
            expect(lastAired.id).toBe(item.last_episode.id);
            expect(lastAired.url).toBe(item.last_episode.url);
            expect(lastAired.users_rating).toBeGreaterThan(0);
            expect(item.last_episode.users_rating).toBeGreaterThan(0);
            expect(lastAired.users_rating_count).toBeGreaterThan(0);
            expect(item.last_episode.users_rating_count).toBeGreaterThan(0);
          }
        }
      });
    },
  },

  should_have_next_episode_greater_than_last_episode: {
    query: `?item_type=tvshow&is_active=true&append_to_response=last_episode,next_episode,episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const today = formatDate(new Date());

      items.forEach((item) => {
        if (item.last_episode && item.next_episode) {
          const lastSeason = item.last_episode.season;
          const lastEpisode = item.last_episode.episode;
          const nextSeason = item.next_episode.season;
          const nextEpisode = item.next_episode.episode;

          const isSequential =
            (nextSeason === lastSeason && nextEpisode === lastEpisode + 1) ||
            (nextSeason === lastSeason + 1 && nextEpisode === 1);

          expect(isSequential).toBe(true);

          const lastEpisodeIndex = item.episodes_details.findIndex(
            (episode) => episode.id === item.last_episode.id,
          );
          expect(lastEpisodeIndex).toBeGreaterThanOrEqual(0);

          const expectedNextEpisode =
            item.episodes_details[lastEpisodeIndex + 1] ?? null;

          expect(expectedNextEpisode).not.toBeNull();
          expect(expectedNextEpisode?.id).toBe(item.next_episode.id);

          const lastReleaseDate = formatDate(item.last_episode.release_date);
          const nextReleaseDate = formatDate(item.next_episode.release_date);

          expect(lastReleaseDate < today).toBe(true);
          expect(nextReleaseDate >= today).toBe(true);
        }
      });
    },
  },

  should_have_increasing_episode_order_if_release_dates_differ: {
    query: `?item_type=tvshow&is_active=true&append_to_response=episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (Array.isArray(item.episodes_details)) {
          for (let i = 0; i < item.episodes_details.length - 1; i++) {
            const current = item.episodes_details[i];
            const next = item.episodes_details[i + 1];

            if (
              current.release_date &&
              next.release_date &&
              current.release_date !== next.release_date
            ) {
              const currentCombined = current.season * 100 + current.episode;
              const nextCombined = next.season * 100 + next.episode;

              expect(nextCombined).toBeGreaterThan(currentCombined);
            }
          }
        }
      });
    },
  },

  should_have_release_date_after_current_date: {
    query: `?item_type=tvshow&is_active=true&append_to_response=last_episode,next_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      const currentDate = new Date().getTime();
      const thresholdDate = currentDate - 48 * 60 * 60 * 1000;

      items.forEach((item) => {
        if (item.next_episode) {
          expect(item.next_episode.users_rating).toBeNull();

          if (
            item.next_episode.season !== 1 ||
            item.next_episode.episode !== 1
          ) {
            expect(item.last_episode).not.toBeNull();
          }

          const releaseDate = new Date(
            item.next_episode.release_date,
          ).getTime();
          expect(!isNaN(releaseDate)).toBe(true);
          expect(releaseDate).toBeGreaterThan(thresholdDate);
        }
      });
    },
  },

  should_not_have_next_episode_when_tvshow_is_ended: {
    query: `?item_type=tvshow&status=ended&is_active=true,false&append_to_response=episodes_details,next_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        expect(item).toHaveProperty("status");
        expect(item.status).toBe("Ended");
        expect(item.next_episode).toBeNull();
      });
    },
  },

  should_only_have_valid_imdb_episode_urls: {
    query: `?item_type=tvshow&is_active=true,false&append_to_response=episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            if (episode?.url) {
              expect(typeof episode.url).toBe("string");
              expect(
                /^https:\/\/www\.imdb\.com\/title\/tt\d+\/$/.test(episode.url),
              ).toBe(true);
            }
          });
        }
      });
    },
  },

  should_not_have_season_and_episode_to_null: {
    query: `?item_type=tvshow&is_active=true,false&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            expect(episode.season).not.toBeNull();
            expect(episode.episode).not.toBeNull();
          });
        }
      });
    },
  },

  should_have_highest_rated_episode_above_second_best: {
    query: `?item_type=tvshow&is_active=true,false&append_to_response=episodes_details,highest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        const all = item.episodes_details;
        const best = item.highest_episode;

        if (Array.isArray(all) && all.length > 1 && best) {
          const sorted = all
            .filter(
              (ep) =>
                ep?.users_rating != null &&
                ep?.users_rating_count != null &&
                ep?.release_date,
            )
            .sort((a, b) => {
              if (b.users_rating !== a.users_rating) {
                return b.users_rating - a.users_rating;
              }
              if (b.users_rating_count !== a.users_rating_count) {
                return b.users_rating_count - a.users_rating_count;
              }
              return new Date(b.release_date) - new Date(a.release_date);
            });

          const secondBest = sorted[1];
          if (secondBest) {
            expect(best.users_rating).toBeGreaterThanOrEqual(
              secondBest.users_rating,
            );
            if (best.users_rating === secondBest.users_rating) {
              expect(best.users_rating_count).toBeGreaterThanOrEqual(
                secondBest.users_rating_count,
              );
            }
          }
        }
      });
    },
  },

  should_have_lowest_rated_episode_below_second_worst: {
    query: `?item_type=tvshow&is_active=true,false&append_to_response=episodes_details,last_episode,next_episode,highest_episode,lowest_episode&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      items.forEach((item) => {
        const all = item.episodes_details;
        const worst = item.lowest_episode;

        if (Array.isArray(all) && all.length > 1 && worst) {
          const sorted = all
            .filter(
              (ep) =>
                ep?.users_rating != null &&
                ep?.users_rating_count != null &&
                ep?.release_date,
            )
            .sort((a, b) => {
              if (a.users_rating !== b.users_rating) {
                return a.users_rating - b.users_rating;
              }
              if (a.users_rating_count !== b.users_rating_count) {
                return a.users_rating_count - b.users_rating_count;
              }
              return new Date(a.release_date) - new Date(b.release_date);
            });

          const secondWorst = sorted[1];
          if (secondWorst) {
            expect(worst.users_rating).toBeLessThanOrEqual(
              secondWorst.users_rating,
            );
            if (worst.users_rating === secondWorst.users_rating) {
              expect(worst.users_rating_count).toBeLessThanOrEqual(
                secondWorst.users_rating_count,
              );
            }
          }
        }
      });
    },
  },

  should_have_limited_null_release_dates: {
    query: `?item_type=tvshow&is_active=true&append_to_response=episodes_details&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      let nullReleaseDateCount = 0;

      items.forEach((item) => {
        if (Array.isArray(item.episodes_details)) {
          item.episodes_details.forEach((episode) => {
            if (episode.release_date == null) {
              nullReleaseDateCount++;
            }
          });
        }
      });

      expect(nullReleaseDateCount).toBeLessThanOrEqual(
        config.maxNullReleaseDates,
      );
    },
  },

  only_last_episode: {
    query:
      "?item_type=tvshow&append_to_response=last_episode&filtered_seasons=2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("last_episode");
        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");
        expect(item).not.toHaveProperty("next_episode");
        expect(item).not.toHaveProperty("highest_episode");
        expect(item).not.toHaveProperty("lowest_episode");
      }),
  },

  only_next_episode: {
    query:
      "?item_type=tvshow&append_to_response=next_episode&filtered_seasons=2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("next_episode");
        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");
        expect(item).not.toHaveProperty("last_episode");
        expect(item).not.toHaveProperty("highest_episode");
        expect(item).not.toHaveProperty("lowest_episode");
      }),
  },

  only_highest_episode: {
    query:
      "?item_type=tvshow&append_to_response=highest_episode&filtered_seasons=2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("highest_episode");
        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");
        expect(item).not.toHaveProperty("next_episode");
        expect(item).not.toHaveProperty("last_episode");
        expect(item).not.toHaveProperty("lowest_episode");
      }),
  },

  only_lowest_episode: {
    query:
      "?item_type=tvshow&append_to_response=lowest_episode&filtered_seasons=2",
    expectedResult: (items) =>
      items.forEach((item) => {
        expect(item).toHaveProperty("lowest_episode");
        expect(item.allocine).not.toHaveProperty("critics_rating_details");
        expect(item).not.toHaveProperty("episodes_details");
        expect(item).not.toHaveProperty("next_episode");
        expect(item).not.toHaveProperty("last_episode");
        expect(item).not.toHaveProperty("highest_episode");
      }),
  },

  should_sort_by_imdb_top_ranking_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=asc&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      let previousRanking = null;
      let smallestRanking = Infinity;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        smallestRanking = Math.min(smallestRanking, item.imdb.top_ranking);

        if (previousRanking) {
          expect(item.imdb.top_ranking).toBeGreaterThanOrEqual(previousRanking);
        }

        previousRanking = item.imdb.top_ranking;
      });

      expect(items[0].imdb.top_ranking).toBe(smallestRanking);
    },
  },

  should_sort_by_imdb_top_ranking_descending: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=desc&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      let previousRanking = null;
      let largestRanking = -Infinity;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        largestRanking = Math.max(largestRanking, item.imdb.top_ranking);

        if (previousRanking) {
          expect(item.imdb.top_ranking).toBeLessThanOrEqual(previousRanking);
        }

        previousRanking = item.imdb.top_ranking;
      });

      expect(items[0].imdb.top_ranking).toBe(largestRanking);
    },
  },

  should_keep_popularity_order_when_top_ranking_ties: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=asc&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      let previousPopularity = null;
      let previousTopRanking = null;

      items.forEach((item) => {
        expect(item.imdb).toBeDefined();
        expect(typeof item.imdb.top_ranking).toBe("number");
        expect(item.imdb.top_ranking).toBeGreaterThan(0);

        const popularity = item.popularity_average;

        if (
          previousTopRanking &&
          item.imdb.top_ranking === previousTopRanking &&
          popularity &&
          previousPopularity
        ) {
          expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        }

        previousPopularity = popularity;
        previousTopRanking = item.imdb.top_ranking;
      });
    },
  },

  should_fallback_to_popularity_when_top_ranking_order_invalid: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=invalid&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      let previousPopularity = -Infinity;
      let sawMissingTopRanking = false;

      items.forEach((item) => {
        const popularity =
          typeof item.popularity_average === "number"
            ? item.popularity_average
            : Number.POSITIVE_INFINITY;

        expect(popularity).toBeGreaterThanOrEqual(previousPopularity);
        previousPopularity = popularity;

        if (!item.imdb || typeof item.imdb.top_ranking !== "number") {
          sawMissingTopRanking = true;
        }
      });

      expect(sawMissingTopRanking).toBe(true);
    },
  },

  should_sort_by_mojo_rank_ascending: {
    query: `?item_type=movie,tvshow&is_active=true,false&mojo_rank_order=asc&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

      let previousRank = null;
      let smallestRank = Infinity;

      items.forEach((item) => {
        expect(item.mojo).toBeDefined();
        expect(typeof item.mojo.rank).toBe("number");
        expect(item.mojo.rank).toBeGreaterThan(0);

        smallestRank = Math.min(smallestRank, item.mojo.rank);

        if (previousRank) {
          expect(item.mojo.rank).toBeGreaterThanOrEqual(previousRank);
        }

        previousRank = item.mojo.rank;
      });

      expect(items[0].mojo.rank).toBe(smallestRank);
    },
  },

  should_prioritize_imdb_top_ranking_and_mojo_rank_orders: {
    query: `?item_type=movie,tvshow&is_active=true,false&popularity_filters=allocine_popularity,imdb_popularity&top_ranking_order=asc&mojo_rank_order=asc&limit=${config.maxLimitRemote}`,
    expectedResult: (items) => {
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);

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
 * Validates the structure and content of a paginated API response object.
 *
 * This function performs assertions on the presence and values of standard
 * pagination keys: `page`, `results`, `total_pages`, and `total_results`.
 * It allows optional expectations to override default checks.
 *
 * @param {Object} data - The API response data object to validate.
 * @param {Object} [expected={}] - Optional expectations for the validation.
 * @param {number} [expected.resultsLength] - Expected number of items in `results`.
 * @param {number} [expected.total_pages] - Expected total number of pages.
 * @param {number} [expected.total_results] - Expected total number of results.
 *
 * @throws Will throw assertion errors if any validation fails.
 */
function validatePaginationKeys(data, expected = {}) {
  expect(data).toHaveProperty("page");
  expect(data.page).toBe(1);

  expect(data).toHaveProperty("results");
  expect(Array.isArray(data.results)).toBe(true);
  if (expected.resultsLength) {
    expect(data.results.length).toBe(expected.resultsLength);
  } else {
    expect(data.results.length).toBeGreaterThan(1);
  }

  expect(data).toHaveProperty("total_pages");
  if (expected.total_pages) {
    expect(data.total_pages).toBe(expected.total_pages);
  } else {
    expect(data.total_pages).toBeGreaterThan(1);
  }

  expect(data).toHaveProperty("total_results");
  if (expected.total_results) {
    expect(data.total_results).toBe(expected.total_results);
  } else {
    expect(data.total_results).toBeGreaterThan(1);
  }
}

/**
 * Tests the What's on? API by iterating through the params object and running each test case.
 * @returns None
 */
describe("What's on? API tests", () => {
  if (!removeLogs) {
    console.log(`Testing on ${baseURL}`);
  }

  const simpleApiCall = `${baseURL}?api_key=${config.internalApiKey}`;

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

  test("should_have_top_level_pagination_keys", async () => {
    const response = await axios.get(simpleApiCall);

    if (!removeLogs) {
      console.log("Test name: should_have_top_level_pagination_keys");
      console.log(`Calling: ${simpleApiCall}`);
    }

    expect(response.status).toBe(200);
    validatePaginationKeys(response.data);
  });

  test("should_have_top_level_pagination_keys_equal_to_one_on_search", async () => {
    const simpleApiCallOnSearch = `${baseURL}?imdbid=tt0903747&api_key=${config.internalApiKey}`;
    const response = await axios.get(simpleApiCallOnSearch);

    if (!removeLogs) {
      console.log(
        "Test name: should_have_top_level_pagination_keys_equal_to_one_on_search",
      );
      console.log(`Calling: ${simpleApiCallOnSearch}`);
    }

    expect(response.status).toBe(200);
    validatePaginationKeys(response.data, {
      page: 1,
      resultsLength: 1,
      total_pages: 1,
      total_results: 1,
    });
  });

  test(
    "api_response_time_should_be_within_an_acceptable_range",
    async () => {
      const start = new Date().valueOf();
      await axios.get(`${baseURL}?api_key=${config.internalApiKey}`);
      const end = new Date().valueOf();
      expect(end - start).toBeLessThan(config.maxResponseTime);
    },
    config.timeout,
  );

  test(
    "api_response_time_should_be_within_an_acceptable_range_on_important_limit",
    async () => {
      const start = new Date().valueOf();
      const apiCall = `${baseURL}?item_type=movie,tvshow&limit=${config.maxLimit}&api_key=${config.internalApiKey}`;

      if (!removeLogs) {
        console.log(`Calling: ${apiCall}`);
      }

      await axios.get(apiCall);
      const end = new Date().valueOf();
      expect(end - start).toBeLessThan(config.maxResponseTime);
    },
    config.timeout,
  );

  const countTrueLines = (filePath) => {
    const content = readFileSync(filePath, "utf-8");
    return content.split("\n").filter((line) => line.trim().endsWith(",TRUE"))
      .length;
  };

  function extractAllocinePathsFromFile(filePath) {
    const content = readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(",TRUE"))
      .map((line) => {
        const parts = line.split(",");
        return parts[0]?.trim();
      })
      .filter((path) => !!path);
  }

  function extractAllocinePathsFromApi(apiResponse) {
    return apiResponse.data.results
      .map((item) => {
        const fullUrl = item.allocine?.url;
        try {
          return new URL(fullUrl).pathname;
        } catch (e) {
          return null;
        }
      })
      .filter((path) => !!path);
  }

  function getDiffs(fileIds, apiIds) {
    const inFileNotInApi = fileIds.filter((id) => !apiIds.includes(id));
    const inApiNotInFile = apiIds.filter((id) => !fileIds.includes(id));

    return { inFileNotInApi, inApiNotInFile };
  }

  (isRemoteSource ? test.skip : test)(
    "Local item count from files should match API response for active items",
    async () => {
      const movieFileCount = countTrueLines(config.filmsIdsFilePath);
      const seriesFileCount = countTrueLines(config.seriesIdsFilePath);

      const [movieResponse, seriesResponse] = await Promise.all([
        axios.get(baseURL, {
          params: {
            item_type: "movie",
            is_active: true,
            limit: `${config.maxLimit}`,
            api_key: `${config.internalApiKey}`,
          },
        }),
        axios.get(baseURL, {
          params: {
            item_type: "tvshow",
            is_active: true,
            limit: `${config.maxLimit}`,
            api_key: `${config.internalApiKey}`,
          },
        }),
      ]);

      if (process.env.DEBUG_ALLOCINE === "true") {
        const fileAllocineIds = extractAllocinePathsFromFile(
          config.seriesIdsFilePath,
        );
        const apiAllocineIds = extractAllocinePathsFromApi(seriesResponse);

        const diffs = getDiffs(fileAllocineIds, apiAllocineIds);

        if (diffs.inFileNotInApi.length || diffs.inApiNotInFile.length) {
          console.warn("Allociné ID diff detected:");

          if (diffs.inFileNotInApi.length) {
            console.warn("→ Present in file but missing in API:");
            diffs.inFileNotInApi.forEach((id) => console.warn("   -", id));
          }

          if (diffs.inApiNotInFile.length) {
            console.warn("→ Present in API but missing in file:");
            diffs.inApiNotInFile.forEach((id) => console.warn("   -", id));
          }
        }
      }

      expect(movieResponse.status).toBe(200);
      expect(seriesResponse.status).toBe(200);

      const movieCount = Array.isArray(movieResponse.data.results)
        ? movieResponse.data.results.length
        : 0;
      const seriesCount = Array.isArray(seriesResponse.data.results)
        ? seriesResponse.data.results.length
        : 0;

      expect(Math.abs(movieCount - movieFileCount)).toBeLessThanOrEqual(7);
      expect(Math.abs(seriesCount - seriesFileCount)).toBeLessThanOrEqual(0);
    },
  );
});
