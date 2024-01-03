const { config } = require("../config");

module.exports.getDateValue = function (firstHalf) {
  const day = new Date().getDate();

  if ((firstHalf && day <= 15) || (!firstHalf && day > 15)) {
    return (day - 1) * config.circleLimitPerDay + parseInt(process.env.CIRCLE_NODE_INDEX || 0) * config.circleLimitPerInstance;
  }

  process.exit(0);
};
