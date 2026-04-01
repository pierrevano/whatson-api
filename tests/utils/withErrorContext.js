/**
 * Runs an assertion block and prefixes thrown error messages with context.
 *
 * @param {string} context - Context to include in assertion failures.
 * @param {() => void} assertion - Assertion block to execute.
 * @throws {Error} Rethrows the original error after prefixing its message.
 */
function withErrorContext(context, assertion) {
  try {
    assertion();
  } catch (error) {
    if (error instanceof Error) {
      error.message = `[${context}] ${error.message}`;
    }
    throw error;
  }
}

module.exports = { withErrorContext };
