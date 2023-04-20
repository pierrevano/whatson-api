/**
 * Filters a JSON array to only include elements where the IS_ACTIVE_1 property is "TRUE".
 * @param {Array} jsonArray - the JSON array to filter
 * @returns {Array} - a new array containing only the elements where IS_ACTIVE_1 is "TRUE"
 */
const jsonArrayFiltered = (jsonArray) => {
  return jsonArray.filter((element) => element.IS_ACTIVE_1 === "TRUE");
};

module.exports = { jsonArrayFiltered };
