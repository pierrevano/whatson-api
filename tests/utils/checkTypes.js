function checkTypes(item, schema) {
  if (item === null) {
    return; // Allow null values without throwing an error
  }

  if (typeof item !== "object") {
    throw new Error(
      `Invalid item: expected an object but received ${typeof item}.`,
    );
  }

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
      if (
        key !== "users_rating_count" &&
        key !== "critics_rating_count" &&
        key !== "must_see"
      ) {
        // The key is missing in the item
        throw new Error(`Missing required key '${key}' in the item.`);
      }
    }
  });
}

module.exports = { checkTypes };
