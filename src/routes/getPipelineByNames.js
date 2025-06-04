/**
 * Adds a MongoDB aggregation filter to match documents by names for a specific key.
 *
 * @param {string} names - Comma-separated string of names to filter by (e.g., "Action,Drama").
 * @param {Array<Object>} pipeline - The existing MongoDB aggregation pipeline to be modified.
 * @param {string} key_value - The document field to match names against (e.g., "platforms_links", "genres", "directors").
 * @param {Object} is_active_item - MongoDB condition to match active items (e.g., { is_active: true }).
 * @param {Object} is_must_see_item - MongoDB condition to match must-see items (e.g., { must_see: true }).
 * @returns {Array<Object>} - The updated MongoDB aggregation pipeline.
 */
const getPipelineByNames = (
  names,
  pipeline,
  key_value,
  is_active_item,
  is_must_see_item,
) => {
  if (names) {
    const decodedNames = decodeURIComponent(names);
    const decodedNamesArray = decodedNames.split(",");

    if (
      decodedNamesArray.includes("all") ||
      decodedNamesArray.includes("allgenres")
    )
      return pipeline;

    let condition;
    if (key_value === "platforms_links") {
      condition = {
        [key_value]: {
          $elemMatch: {
            name: {
              $in: decodedNamesArray,
            },
          },
        },
      };
    } else if (key_value === "directors" || key_value === "genres") {
      condition = {
        [key_value]: {
          $in: decodedNamesArray,
        },
      };
    }

    const match = {
      $match: { $and: [is_active_item, is_must_see_item, condition] },
    };

    pipeline.push(match);
  }

  return pipeline;
};

module.exports = { getPipelineByNames };
