/**
 * Adds a MongoDB aggregation filter to match documents by names for a specific key,
 * using partial, case-insensitive matching.
 *
 * @param {string} names - Comma-separated string of names to filter by (e.g., "Action,Drama").
 * @param {Array<Object>} pipeline - The existing MongoDB aggregation pipeline to be modified.
 * @param {string} key_value - The document field to match names against (e.g., "platforms_links", "genres", "directors").
 * @param {Object} is_active_item - MongoDB condition to match active items (e.g., { is_active: true }).
 * @param {Object} is_must_see_item - MongoDB condition to match must-see items (e.g., { must_see: true }).
 * @param {Object} is_users_certified_item - MongoDB condition to match user-certified items (e.g., { users_certified: true }).
 * @param {Object} is_critics_certified_item - MongoDB condition to match critics-certified items (e.g., { critics_certified: true }).
 * @returns {Array<Object>} - The updated MongoDB aggregation pipeline.
 */
const getPipelineByNames = (
  names,
  pipeline,
  key_value,
  is_active_item,
  is_must_see_item,
  is_users_certified_item,
  is_critics_certified_item,
) => {
  if (names) {
    const escapeRegExp = (s) => s.replace(/[.*+?{}()|[\]\\]/g, "\\$&");

    const decodedNamesArray = decodeURIComponent(names).split(",");
    const nameSet = new Set(decodedNamesArray.map((s) => s.trim()));

    if (nameSet.has("all") || nameSet.has("allgenres")) return pipeline;

    // Use partial match regex (no ^...$ anchors)
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

    const match = {
      $match: {
        $and: [
          is_active_item,
          is_must_see_item,
          is_users_certified_item,
          is_critics_certified_item,
          condition,
        ],
      },
    };

    pipeline.push(match);
  }

  return pipeline;
};

module.exports = { getPipelineByNames };
