const parseReleaseDateRange = (value) => {
  if (!value) {
    return { gte: null, lte: null };
  }

  const releaseDateFilters = value.split(",").map((item) => item.trim());

  const fromValue = releaseDateFilters.find((item) =>
    item.toLowerCase().startsWith("from:"),
  );
  const toValue = releaseDateFilters.find((item) =>
    item.toLowerCase().startsWith("to:"),
  );
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

module.exports = { parseReleaseDateRange };
