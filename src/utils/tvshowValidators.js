const parseMinimumRatings = (value) => {
  if (!value) {
    return null;
  }

  const values = value
    .split(",")
    .map(Number)
    .filter((item) => Number.isFinite(item));

  return values.length ? Math.min(...values) : null;
};

const parseReleaseDateRange = (value) => {
  if (!value) {
    return { gte: null, lte: null };
  }

  const releaseDateFilters = value.split(",").map((item) => item.trim());

  const fromValue = releaseDateFilters.find((item) => item.startsWith("from:"));
  const toValue = releaseDateFilters.find((item) => item.startsWith("to:"));
  const parsedFromDate = fromValue ? new Date(fromValue.slice(5)) : null;
  const parsedToDate = toValue ? new Date(toValue.slice(3)) : null;

  return {
    gte:
      parsedFromDate && !Number.isNaN(parsedFromDate.getTime())
        ? parsedFromDate
        : null,
    lte:
      parsedToDate && !Number.isNaN(parsedToDate.getTime())
        ? parsedToDate
        : null,
  };
};

module.exports = {
  parseMinimumRatings,
  parseReleaseDateRange,
};
