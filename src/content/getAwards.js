/**
 * Extracts the top award and aggregate totals from a raw award data object.
 *
 * @param {object} mainColumnData - Raw data object containing award-related fields.
 * @returns {{
 *   top: { name: string, wins: number|null, nominations: number|null }|null,
 *   total: { wins: number|null, nominations: number|null }|null
 * } | null}
 */
const getAwards = (mainColumnData) => {
  const totalWins = mainColumnData?.wins?.total;
  const nominationsExcludeWins = mainColumnData?.nominationsExcludeWins?.total;
  const totalNominations =
    Number.isInteger(nominationsExcludeWins) || Number.isInteger(totalWins)
      ? (nominationsExcludeWins ?? 0) + (totalWins ?? 0)
      : undefined;
  const awardSummary = mainColumnData?.prestigiousAwardSummary;

  const awardName = awardSummary?.award?.text ?? "";

  const hasTotal =
    (Number.isInteger(totalWins) && totalWins > 0) ||
    (Number.isInteger(totalNominations) && totalNominations > 0);
  const hasTop = awardName.length > 0;

  if (!hasTotal && !hasTop) return null;

  return {
    top: hasTop
      ? {
          name: awardName,
          wins: awardSummary.wins ?? null,
          nominations:
            (awardSummary.nominations ?? 0) + (awardSummary.wins ?? 0) || null,
        }
      : null,
    total: hasTotal
      ? {
          wins: Number.isInteger(totalWins) ? totalWins : null,
          nominations: Number.isInteger(totalNominations)
            ? totalNominations
            : null,
        }
      : null,
  };
};

module.exports = { getAwards };
