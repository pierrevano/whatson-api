const { config } = require("../config");
const { getCheerioContent } = require("../utils/getCheerioContent");
const { httpClient } = require("../utils/httpClient");
const { logErrors } = require("../utils/logErrors");

/**
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @param {string} origin - Caller name used for request logging.
 * @returns {Promise<object|null>} Parsed NEXT_DATA payload, or null when unavailable.
 */
const getNextData = async (imdbHomepage, origin) => {
  const parentalGuideUrl = `${imdbHomepage}${config.imdbParentalGuidePath}`;

  try {
    const $ = await getCheerioContent(parentalGuideUrl, undefined, origin);

    if (typeof $ !== "function") {
      throw (
        $?.error || new Error("IMDb parental guide payload is unavailable.")
      );
    }

    const jsonText = $("#__NEXT_DATA__").html();

    return jsonText ? JSON.parse(jsonText) : null;
  } catch (error) {
    logErrors(error, parentalGuideUrl, origin);
  }
};

/**
 * @param {Array<object>} certificateEdges - Certificate entries to search.
 * @param {string} countryId - Country id to match in the certificates list.
 * @returns {string|null} Trimmed certification rating for the requested country.
 */
const getCertificationRating = (certificateEdges, countryId) => {
  const certificate = certificateEdges.find(
    (edge) => edge?.node?.country?.id === countryId,
  );

  return certificate?.node?.rating?.trim?.() || null;
};

/**
 * @param {string} imdbHomepage - The IMDb homepage URL.
 * @returns {Promise<{
 *   certification: string|null,
 *   certificationVariants: Record<string, string|null>
 * }>} Certification values derived from the parental guide payload.
 */
const getCertification = async (imdbHomepage) => {
  const nextData = await getNextData(imdbHomepage, "getCertification");
  const certificates =
    nextData?.props?.pageProps?.contentData?.data?.title?.certificates;
  const certificateEdges = certificates?.edges || [];
  let certification = getCertificationRating(certificateEdges, "US");
  let fr = getCertificationRating(certificateEdges, "FR");
  const imdbId = imdbHomepage.match(/\/title\/(tt\d+)\/$/)?.[1];

  if (
    imdbId &&
    (!nextData ||
      (certificates?.total > certificateEdges.length &&
        (!certification || !fr)))
  ) {
    const query = `{
      title(id: "${imdbId}") {
        certificates(first: ${certificates?.total ?? 1000}) {
          edges { node { country { id } rating } }
        }
      }
    }`;
    const url = `${config.baseURLImdbGraphql}?query=${encodeURIComponent(query)}`;
    const response = await httpClient.get(url, {
      headers: { Referer: `${imdbHomepage}${config.imdbParentalGuidePath}` },
    });
    const fullEdges = response.data?.data?.title?.certificates?.edges || [];
    certification ||= getCertificationRating(fullEdges, "US");
    fr ||= getCertificationRating(fullEdges, "FR");
  }

  return {
    certification,
    certificationVariants: { fr },
  };
};

module.exports = {
  getCertification,
  getNextData,
};
