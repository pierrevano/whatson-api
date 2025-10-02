const { config } = require("../config");

/**
 * Computes the slice of the dataset to process based on the current day and execution shard.
 *
 * @param {boolean} firstHalf - Whether the first half of the month should trigger work.
 * @returns {number|undefined} Calculated offset when processing should continue, otherwise exits the process.
 */
module.exports.getDateValue = function (firstHalf) {
  const day = new Date().getDate();

  if ((firstHalf && day <= 15) || (!firstHalf && day > 15)) {
    return (
      (day - 1) * config.circleLimitPerDay +
      parseInt(process.env.CIRCLE_NODE_INDEX || 0) *
        config.circleLimitPerInstance
    );
  }

  process.exit(0);
};
