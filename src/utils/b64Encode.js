/**
 * It takes a string and returns a base64 encoded version of that string
 * @param string - The string to be encoded.
 * @returns A base64 encoded string.
 */
const b64Encode = (string) => {
  return Buffer.from(string, "utf8").toString("base64");
};

module.exports = { b64Encode };
