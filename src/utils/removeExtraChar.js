/**
 * It takes a string and removes all the extra characters that are not needed
 * @param string - The string to be modified.
 * @returns the string with the extra characters removed.
 */
function removeExtraChar(string) {
  return string.replace(/(\r\n|\n|\r|\t|amp;)/gm, "");
}

module.exports = { removeExtraChar };
