const { config } = require("../config");
const { MongoClient, ServerApiVersion } = require("mongodb");
const crypto = require("crypto");

const uri = `mongodb+srv://${config.mongoDbCredentials}@cluster0.yxe57eq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(config.dbName);
const collectionNamePreferences = database.collection(
  config.collectionNamePreferences,
);

function createDigest(email) {
  const combined = email + config.digestSecretValue;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

const getUserPreferences = async (req, res) => {
  try {
    const { email } = req.params;
    const { digest } = req.query;

    const calculatedDigest = createDigest(email);

    if (calculatedDigest !== digest) {
      return res.status(403).json({ message: "Invalid digest." });
    }

    const preferences = await collectionNamePreferences.findOne({ email });

    if (!preferences) {
      res.status(404).json({ message: "Preferences not found." });
    } else {
      res.status(200).json(preferences);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const saveOrUpdateUserPreferences = async (req, res) => {
  try {
    const { email } = req.params;
    const { digest } = req.query;
    const preferences = req.body;

    const calculatedDigest = createDigest(email);

    if (calculatedDigest !== digest) {
      return res.status(403).json({ message: "Invalid digest." });
    }

    const filter = { email };
    const updateDoc = { $set: preferences };
    const options = { upsert: true };

    await collectionNamePreferences.updateOne(filter, updateDoc, options);
    res.status(200).json({ message: "Preferences updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUserPreferences,
  saveOrUpdateUserPreferences,
};
