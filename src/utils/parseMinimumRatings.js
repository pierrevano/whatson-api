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

module.exports = { parseMinimumRatings };
