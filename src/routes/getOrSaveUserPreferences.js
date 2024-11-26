const { MongoClient, ServerApiVersion } = require("mongodb");
const axios = require("axios");
const Hashes = require("jshashes");

const { config } = require("../config");

const uri = `mongodb+srv://${config.mongoDbCredentials}${config.mongoDbCredentialsLastPart}`;
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(config.dbName);
const collectionNamePreferences = database.collection(
  config.collectionNamePreferences,
);

/**
 * Hashes an email combined with a secret using SHA-256.
 *
 * @param {string} email - The email address to be hashed.
 * @param {string} secret - The secret key to be combined with the email.
 * @returns {string} The resulting SHA-256 hash in hexadecimal format.
 */
const createHashForEmail = (email, secret) => {
  const combined = email + secret;
  const SHA256 = new Hashes.SHA256();
  return SHA256.hex(combined);
};

const getUserPreferences = async (req, res) => {
  try {
    const { email } = req.params;
    const { digest } = req.query;

    const calculatedDigest = createHashForEmail(
      email,
      config.digestSecretValue,
    );

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

    const calculatedDigest = createHashForEmail(
      email,
      config.digestSecretValue,
    );

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

/**
 * Watches the 'preferences' collection for new document insertions and triggers a webhook.
 * Logs any errors and indicates when the stream closes.
 */
const watchForNewUserCreated = () => {
  try {
    const changeStream = collectionNamePreferences.watch();

    changeStream.on("change", async (change) => {
      if (change.operationType === "insert") {
        try {
          await axios.post(config.webhooksURL);
        } catch (error) {
          console.error("Error sending notification:", error.message);
        }
      }
    });

    changeStream.on("error", (error) => {
      console.error("Change stream error:", error);
    });

    changeStream.on("close", () => {
      console.log("Change stream closed.");
    });
  } catch (error) {
    console.error("Error setting up change stream:", error);
  }
};

watchForNewUserCreated();

module.exports = {
  getUserPreferences,
  saveOrUpdateUserPreferences,
};
