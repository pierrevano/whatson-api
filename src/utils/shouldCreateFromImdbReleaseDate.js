const { config } = require("../config");
const { httpClient } = require("./httpClient");

const shouldCreateFromImdbReleaseDate = async (imdbData) => {
  if (process.env.CHECK_MISSING_ALLOCINE_IDS !== "true") {
    return { shouldCreate: true, reason: null };
  }

  const mainColumnData = imdbData?.nextData?.props?.pageProps?.mainColumnData;
  const voteCount = Number.parseInt(
    mainColumnData?.ratingsSummary?.voteCount,
    10,
  );
  let releaseDate = mainColumnData?.releaseDate;

  try {
    const { data } = await httpClient.post(
      config.baseURLImdbGraphql,
      {
        query: `query ($id: ID!) {
          title(id: $id) {
            releaseDates(first: 5000000) {
              edges {
                node {
                  country { id }
                  year month day
                  attributes { text }
                }
              }
            }
          }
        }`,
        variables: { id: mainColumnData?.id },
      },
      { headers: { "x-imdb-client-name": "imdb-web-next-localized" } },
    );
    const releaseDates =
      data.data?.title?.releaseDates?.edges.map(({ node }) => node) || [];
    const nonFestivalReleaseDates = releaseDates.filter(
      (date) =>
        !date.attributes.some(({ text }) =>
          /festival|fortnight|cannes/i.test(text),
        ),
    );
    const currentReleaseDates = releaseDates.filter(
      (date) =>
        date.country.id === releaseDate?.country?.id &&
        ["year", "month", "day"].every(
          (key) => date[key] === releaseDate?.[key],
        ),
    );
    releaseDate =
      nonFestivalReleaseDates.find(
        (date) => date.country.id === "FR" && date.year,
      ) ||
      currentReleaseDates.find((date) =>
        nonFestivalReleaseDates.includes(date),
      ) ||
      (currentReleaseDates.length ? null : releaseDate);
  } catch (error) {
    console.log(
      `IMDb release dates unavailable: ${error.message}. Using the current release date.`,
    );
  }

  const releaseYear = Number.parseInt(releaseDate?.year, 10);
  const releaseMonth = Number.parseInt(releaseDate?.month ?? 1, 10);
  const releaseDay = Number.parseInt(releaseDate?.day ?? 1, 10);
  const hasFullDate =
    Number.isInteger(releaseYear) &&
    Number.isInteger(releaseMonth) &&
    Number.isInteger(releaseDay);
  const currentYear = new Date().getFullYear();
  const isYearInFuture =
    Number.isInteger(releaseYear) && releaseYear > currentYear;

  const hasEnoughVotes = voteCount > config.minimumFutureReleaseVoteCount;

  let shouldCreate;
  let reason;
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
    reason =
      `releaseDate=${JSON.stringify(releaseDateObj)}, voteCount=${voteCount}; ` +
      `allowed through ${JSON.stringify(nearReleaseCutoff)}, or through ` +
      `${JSON.stringify(futureReleaseCutoff)} with more than ${config.minimumFutureReleaseVoteCount} votes`;
  } else {
    shouldCreate = !isYearInFuture && Number.isInteger(releaseYear);
    reason = `releaseYear=${releaseYear}, voteCount=${voteCount}; release year must be available and no later than ${currentYear}`;
  }

  return {
    shouldCreate,
    reason: shouldCreate ? null : reason,
  };
};

module.exports = { shouldCreateFromImdbReleaseDate };
