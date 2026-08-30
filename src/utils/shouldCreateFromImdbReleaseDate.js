const { config } = require("../config");

const shouldCreateFromImdbReleaseDate = async (imdbData) => {
  if (process.env.CHECK_MISSING_ALLOCINE_IDS !== "true") {
    return { shouldCreate: true, reason: null };
  }

  const mainColumnData = imdbData?.nextData?.props?.pageProps?.mainColumnData;
  const voteCount = Number.parseInt(
    mainColumnData?.ratingsSummary?.voteCount,
    10,
  );
  const releaseDate = mainColumnData?.releaseDate;
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

  const hasEnoughVotes = voteCount > config.minimumFutureReleaseVoteCount;

  let shouldCreate;
  if (hasFullDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nearReleaseCutoff = new Date(today);
    nearReleaseCutoff.setDate(today.getDate() + config.maxDaysInFuture);
    const futureReleaseCutoff = new Date(today);
    futureReleaseCutoff.setMonth(
      today.getMonth() + config.maxFutureReleaseMonths,
    );
    const releaseDateObj = new Date(releaseYear, releaseMonth - 1, releaseDay);
    shouldCreate =
      releaseDateObj <= nearReleaseCutoff ||
      (hasEnoughVotes && releaseDateObj <= futureReleaseCutoff);
  } else {
    shouldCreate = !isYearInFuture && Number.isInteger(releaseYear);
  }

  return {
    shouldCreate,
    reason: shouldCreate ? null : "release_date_or_vote_count",
  };
};

module.exports = { shouldCreateFromImdbReleaseDate };
