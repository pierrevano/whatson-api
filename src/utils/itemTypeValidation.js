const { config } = require("../config");

const isValidItemType = (itemTypeQuery) => {
  if (!itemTypeQuery) return true;
  return itemTypeQuery.split(",").every((t) => config.itemTypes.includes(t));
};

const areQuerySearchKeysMissing = (query, keysToCheckForSearch) => {
  return keysToCheckForSearch.every((key) => {
    return !Object.keys(query).some(
      (queryKey) => queryKey.toLowerCase() === key.toLowerCase(),
    );
  });
};

const invalidItemTypeMessage = (itemTypeQuery) =>
  `Invalid item type provided. Please specify 'movie', 'tvshow', or a combination like 'movie,tvshow'.${
    itemTypeQuery ? ` Received '${itemTypeQuery}'.` : ""
  }`;

module.exports = {
  areQuerySearchKeysMissing,
  invalidItemTypeMessage,
  isValidItemType,
};
