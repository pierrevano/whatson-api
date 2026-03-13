const shouldCreateFromImdbReleaseDate = async (imdbData) => {
  if (process.env.CHECK_MISSING_ALLOCINE_IDS !== "true") {
    return { shouldCreate: true, reason: null };
  }

  const releaseDate =
    imdbData?.nextData?.props?.pageProps?.mainColumnData?.releaseDate;
  const releaseYear = Number.parseInt(releaseDate?.year, 10);
  const releaseMonth = Number.parseInt(releaseDate?.month, 10);
  const releaseDay = Number.parseInt(releaseDate?.day, 10);
  const hasFullDate =
    Number.isInteger(releaseYear) &&
    Number.isInteger(releaseMonth) &&
    Number.isInteger(releaseDay);
  const currentYear = new Date().getFullYear();
  const isYearInFuture =
    Number.isInteger(releaseYear) && releaseYear > currentYear;

  let shouldCreate = true;
  if (hasFullDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const releaseDateObj = new Date(releaseYear, releaseMonth - 1, releaseDay);
    shouldCreate = releaseDateObj <= today;
  } else {
    shouldCreate = !isYearInFuture && Number.isInteger(releaseYear);
  }

  return {
    shouldCreate,
    reason: shouldCreate ? null : "future_or_incomplete",
  };
};

module.exports = { shouldCreateFromImdbReleaseDate };
