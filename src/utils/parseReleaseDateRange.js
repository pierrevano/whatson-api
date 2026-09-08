const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/;

const isValidISODate = (value) => {
  if (
    typeof value !== "string" ||
    !ISO_DATE_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    return false;
  }

  const date = value.slice(0, 10);
  return new Date(date).toISOString().slice(0, 10) === date;
};

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

module.exports = { isValidISODate, parseReleaseDateRange };
