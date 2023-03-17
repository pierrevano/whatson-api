/**
 * Filter out all the elements in the array that have an IS_ACTIVE property that is not equal to TRUE.
 * @param jsonArray - The array of JSON objects that you want to filter.
 * @returns An array of objects that have the property IS_ACTIVE with the value of TRUE.
 */
const jsonArrayFiltered = (jsonArray) => {
  return jsonArray.filter((element) => element.IS_ACTIVE === "TRUE");
};

module.exports = { jsonArrayFiltered };
