const { MongoClient, ServerApiVersion } = require("mongodb");

const { buildAppendIncludes } = require("../utils/buildAppendIncludes");
const { config } = require("../config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

const database = client.db(config.dbName);
const collectionData = database.collection(config.collectionName);

const buildTvShowProjection = (appendToResponse = "") => {
  const includes = buildAppendIncludes(appendToResponse);

  return {
    _id: 0,
    id: 1,
    item_type: 1,
    title: 1,
    seasons_number: 1,
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
