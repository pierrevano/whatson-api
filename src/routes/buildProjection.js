/**
 * Builds a MongoDB projection object based on the append_to_response query param.
 * @param {string} appendToResponse - Comma-separated list of fields to include.
 * @returns {object} MongoDB projection object with fields excluded if not included in the list.
 */
function buildProjection(appendToResponse) {
  const projection = {};
  const appendList = appendToResponse?.split(",").map((f) => f.trim()) || [];
  const includes = (field) => appendList.includes(field);

  if (!includes("critics_rating_details")) {
    projection["allocine.critics_rating_details"] = 0;
  }

  if (!includes("episodes_details")) {
    projection["episodes_details"] = 0;
  }

  if (!includes("last_episode")) {
    projection["last_episode"] = 0;
  }

  if (!includes("next_episode")) {
    projection["next_episode"] = 0;
  }

  if (!includes("highest_episode")) {
    projection["highest_episode"] = 0;
  }

  if (!includes("lowest_episode")) {
    projection["lowest_episode"] = 0;
  }

  return projection;
}

module.exports = { buildProjection };
