/**
 * Encodes a string in base64 format.
 * @param {string} string - the string to encode
 * @returns The base64 encoded string.
 */
const b64Encode = (string) => {
  return Buffer.from(string, "utf8").toString("base64");
};

/**
 * Decodes a base64 encoded string.
 * @param {string} string - The base64 encoded string to decode.
 * @returns The decoded string.
 */
const b64Decode = (string) => {
  return Buffer.from(string, "base64").toString("utf-8");
};

module.exports = { b64Encode, b64Decode };
