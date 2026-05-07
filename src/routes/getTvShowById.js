const { buildAppendIncludes } = require("../utils/buildAppendIncludes");
const { collectionData } = require("../utils/mongoClient");

const buildTvShowProjection = (appendToResponse = "") => {
  const includes = buildAppendIncludes(appendToResponse);

  return {
    _id: 0,
    id: 1,
    item_type: 1,
    title: 1,
    image: 1,
    networks: 1,
    seasons_number: 1,
    status: 1,
    episodes_details: 1,
    ...(includes("highest_episode") ? { highest_episode: 1 } : {}),
    ...(includes("last_episode") ? { last_episode: 1 } : {}),
    ...(includes("lowest_episode") ? { lowest_episode: 1 } : {}),
    ...(includes("next_episode") ? { next_episode: 1 } : {}),
  };
};

const getTvShowById = async (id, appendToResponse = "") =>
  collectionData.findOne(
    { id, item_type: "tvshow" },
    { projection: buildTvShowProjection(appendToResponse) },
  );

module.exports = getTvShowById;
