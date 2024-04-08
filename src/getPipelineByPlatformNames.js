/**
 * Constructs a MongoDB aggregation pipeline to filter items based on platform names.
 * @param {Object} config - Configuration object containing platforms for comparison.
 * @param {boolean} is_active_item - The active item flag.
 * @param {string} platform_names - The names of the platforms to retrieve.
 * @param {Array} pipeline - The current pipeline to add to.
 * @returns {Array} - The updated pipeline.
 */
const getPipelineByPlatformNames = (is_active_item, platform_names, pipeline) => {
  if (platform_names) {
    let decodedPlatformNames = decodeURIComponent(platform_names);

    if (decodedPlatformNames.includes("all")) return pipeline;

    let platformCondition = {
      platforms_links: {
        $elemMatch: {
          name: {
            $in: decodedPlatformNames.split(","),
          },
        },
      },
    };

    const matchPlatform = { $match: { $and: [is_active_item, platformCondition] } };
    pipeline.push(matchPlatform);
  }

  return pipeline;
};

module.exports = { getPipelineByPlatformNames };
