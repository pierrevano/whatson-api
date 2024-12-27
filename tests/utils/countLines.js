const fs = require("fs");

/**
 * Counts the number of lines in a file, excluding the header line.
 *
 * @param {string} filename - The name or path of the file to read and count the lines from.
 * @returns {number} The number of lines in the file, excluding the first line (assumed to be the header).
 *
 * @throws {Error} If the file cannot be read, an error will be thrown.
 */
function countLines(filename) {
  const data = fs.readFileSync(filename, "utf8");
  const lines = data.split("\n");

  // Exclude header line
  if (lines.length > 0) {
    lines.shift();
  }

  return lines.length;
}

module.exports = { countLines };
