/**
 * Constructs a MongoDB aggregation pipeline to filter items based on names.
 *
 * @param {string} names - The names to retrieve, as a comma-separated string.
 * @param {Array} pipeline - The current MongoDB aggregation pipeline to add the filter to.
 * @param {string} key_value - The key in the documents to match against the names (e.g., "platforms_links" or "genres").
 * @param {boolean} is_active_item - The active item flag to include in the match condition.
 * @returns {Array} - The updated MongoDB aggregation pipeline.
 */
const getPipelineByNames = (names, pipeline, key_value, is_active_item) => {
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
      $match: { $and: [is_active_item, condition] },
    };

    pipeline.push(match);
  }

  return pipeline;
};

module.exports = { getPipelineByNames };
