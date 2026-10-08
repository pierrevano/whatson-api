const { buildAppendIncludes } = require("../utils/buildAppendIncludes");

/**
 * Builds a MongoDB projection object based on the append_to_response query param.
 * @param {string} [appendToResponse] - Optional comma-separated list of fields to include.
 * @returns {object} MongoDB projection object.
 */
function buildProjection(appendToResponse) {
  const projection = { _id: 0 };
  const includes = buildAppendIncludes(appendToResponse);

  if (!includes("awards")) {
    projection["awards"] = 0;
  }

  if (!includes("critics_rating_details")) {
    projection["allocine.critics_rating_details"] = 0;
  }

  if (!includes("composers")) {
    projection["composers"] = 0;
  }

  if (!includes("countries_of_origin")) {
    projection["countries_of_origin"] = 0;
  }

  if (!includes("directors")) {
    projection["directors"] = 0;
  }

  if (!includes("episodes_details")) {
    projection["episodes_details"] = 0;
  }

  if (!includes("genres")) {
    projection["genres"] = 0;
  }

  if (!includes("highest_episode")) {
    projection["highest_episode"] = 0;
  }

  if (!includes("last_episode")) {
    projection["last_episode"] = 0;
  }

  if (!includes("lowest_episode")) {
    projection["lowest_episode"] = 0;
  }

  if (!includes("mojo")) {
    projection["mojo"] = 0;
  }

  if (!includes("original_title")) {
    projection["original_title"] = 0;
  }

  if (!includes("platforms_links")) {
    projection["platforms_links"] = 0;
  }

  if (!includes("production_companies")) {
    projection["production_companies"] = 0;
  }

  if (!includes("tagline")) {
    projection["tagline"] = 0;
  }

  if (!includes("title_variants")) {
    projection["title_variants"] = 0;
  }

  if (!includes("trailer")) {
    projection["trailer"] = 0;
  }

  if (!includes("image_variants")) {
    projection["image_variants"] = 0;
  }

  if (!includes("certification_variants")) {
    projection["certification_variants"] = 0;
  }

  if (!includes("parents_guide")) {
    projection["parents_guide"] = 0;
  }

  if (!includes("networks")) {
    projection["networks"] = 0;
  }

  if (!includes("next_episode")) {
    projection["next_episode"] = 0;
  }

  return projection;
}

module.exports = { buildProjection };
