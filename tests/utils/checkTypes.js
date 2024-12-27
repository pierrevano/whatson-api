/**
 * Recursively checks the types of properties in an item against a provided schema.
 * Throws an error if there are unexpected keys, missing keys, or type mismatches.
 *
 * @param {Object} item - The object to be validated against the schema. It can contain various properties
 *                        that need to match the expected types defined in the schema.
 * @param {Object} schema - The schema object that defines the expected structure and types of the `item`.
 *                          The schema can specify primitive types, nested objects, or arrays of objects.
 *
 * @throws {Error} If there is an unexpected key in `item` that is not part of the `schema`,
 *                 or if a required key defined in the `schema` is missing from the `item`.
 */
function checkTypes(item, schema) {
  // Check for extra keys in the item that are not in the schema
  Object.keys(item).forEach((key) => {
    if (!schema.hasOwnProperty(key)) {
      throw new Error(`Unexpected key '${key}' present in the item.`);
    }
  });

  Object.keys(schema).forEach((key) => {
    // Check if the key from schema exists on the item
    if (item.hasOwnProperty(key)) {
      const expectedType = schema[key];
      const actualType = typeof item[key];

      if (item[key] === null) return;

      // Check for an array of objects
      if (
        Array.isArray(expectedType) &&
        expectedType.length > 0 &&
        typeof expectedType[0] === "object"
      ) {
        item[key].forEach((obj) => {
          checkTypes(obj, expectedType[0]);
        });
      } else if (
        typeof expectedType === "object" &&
        !Array.isArray(expectedType)
      ) {
        // Check if the item is an object and recurse
        checkTypes(item[key], expectedType);
      } else {
        // Simple type check
        expect(actualType).toBe(expectedType);
      }
    } else if (!item.hasOwnProperty(key)) {
      // The key is missing in the item
      throw new Error(`Missing required key '${key}' in the item.`);
    }
  });
}

module.exports = { checkTypes };
