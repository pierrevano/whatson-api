const logExecutionTime = (origin, url, status, startTime) => {
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  const thresholdMs = 5000;
  const timeLabel =
    executionTime > thresholdMs
      ? `\x1b[31m${executionTime}ms\x1b[0m`
      : `${executionTime}ms`;
  console.log(`${origin} - ${url}:`, status, "- Execution time:", timeLabel);
};

module.exports = { logExecutionTime };
