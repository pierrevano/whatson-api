const IMDB_TITLE_ID_REGEX = /^tt\d{7,}$/;
const ALPHANUMERIC_ID_REGEX = /^[A-Za-z0-9_\-!+:]+$/;
const PERSISTENT_ID_REGEX = /^[A-Za-z0-9_\-!+]+={0,2}$/;

function expectPositiveInteger(value) {
  expect(typeof value).toBe("number");
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThan(0);
}

function expectImdbId(value) {
  expect(typeof value).toBe("string");
  expect(value).toMatch(IMDB_TITLE_ID_REGEX);
}

function expectSlugLikeId(value) {
  expect(typeof value).toBe("string");
  const trimmedValue = value.trim();
  expect(trimmedValue.length).toBeGreaterThan(0);
  expect(value).toBe(trimmedValue);
  expect(ALPHANUMERIC_ID_REGEX.test(value)).toBe(true);
}

function expectPersistentId(value) {
  expect(typeof value).toBe("string");
  const trimmedValue = value.trim();
  expect(trimmedValue.length).toBeGreaterThan(0);
  expect(value).toBe(trimmedValue);
  expect(PERSISTENT_ID_REGEX.test(value)).toBe(true);
}

function expectNumericIdOrNumericString(value) {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    expect(trimmedValue.length).toBeGreaterThan(0);
    expect(/^[0-9]+$/.test(trimmedValue)).toBe(true);
  } else {
    expectPositiveInteger(value);
  }
}

function expectIdRatingConsistency(source, ratingKeys, options = {}) {
  if (!source) return;

  const { idKey = "id" } = options;
  const idValue = source[idKey];
  const hasId = idValue !== null && typeof idValue !== "undefined";
  const hasRating = ratingKeys.some((key) => {
    const value = source[key];
    return typeof value === "number" && !Number.isNaN(value);
  });

  if (hasRating) {
    expect(hasId).toBe(true);
  }
}

module.exports = {
  expectPositiveInteger,
  expectImdbId,
  expectSlugLikeId,
  expectPersistentId,
  expectNumericIdOrNumericString,
  expectIdRatingConsistency,
};
