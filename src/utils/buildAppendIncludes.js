/**
 * Returns a helper that checks whether an append key is requested via `append_to_response`.
 * @param {string|undefined|null} appendToResponse - Comma-separated keys to append.
 * @returns {(key: string) => boolean} Predicate indicating if the key should be appended.
 */
const buildAppendIncludes = (appendToResponse) => {
  const appendSet = new Set(
    String(appendToResponse || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  return (key) => appendSet.has(key);
};

module.exports = { buildAppendIncludes };
