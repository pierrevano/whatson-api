const areQuerySearchKeysMissing = (query, keysToCheckForSearch) => {
  return keysToCheckForSearch.every((key) => {
    return !Object.keys(query).some(
      (queryKey) => queryKey.toLowerCase() === key.toLowerCase(),
    );
  });
};

module.exports = { areQuerySearchKeysMissing };
