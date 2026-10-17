/**
 * Adds a MongoDB aggregation filter for case-insensitive name matching.
 * Matches partially by default; ^ and $ can anchor a match.
 *
 * @param {string} [names] - Optional comma-separated string of names to filter by (e.g., "Action,Drama").
 * @param {Array<Object>} pipeline - The existing MongoDB aggregation pipeline to be modified.
 * @param {string} key_value - The document field to match names against (e.g., "platforms_links", "genres", "directors").
 * @returns {Array<Object>} - The updated MongoDB aggregation pipeline.
 */
const getPipelineByNames = (names, pipeline, key_value) => {
  if (names) {
    const escapeRegExp = (s) => s.replace(/[.*+?{}()|[\]\\]/g, "\\$&");

    const namesArray = names.split(",").map((s) => s.trim());
    const nameSet = new Set(namesArray.filter(Boolean));

    if (nameSet.has("all")) return pipeline;

    // Escape regex operators except for the optional ^ and $ anchors.
    const regexArray = [...nameSet].map(
      (name) => new RegExp(escapeRegExp(name), "i"),
    );

    const isNestedField = key_value === "platforms_links";
    const condition = isNestedField
      ? {
          [key_value]: {
            $elemMatch: {
              name: { $in: regexArray },
            },
          },
        }
      : {
          [key_value]: { $in: regexArray },
        };

    pipeline.push({ $match: condition });
  }

  return pipeline;
};

module.exports = { getPipelineByNames };
