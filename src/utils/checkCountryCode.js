const { config } = require("../config");
const isThirdPartyServiceOK = require("./thirdPartyStatus");

/**
 * Verifies that the current public IP resolves to France before continuing.
 *
 * @returns {Promise<void>} Resolves when the country code is `FR`, otherwise exits the process.
 */
async function checkCountryCode() {
  try {
    const { success, data } = await isThirdPartyServiceOK(config.countryIs);
    const countryCode = data?.country;

    if (!success || !countryCode) {
      console.error("Failed to fetch country code. Aborting.");
      process.exit(1);
    }

    if (countryCode !== "FR") {
      console.log("Please disable any VPN first.");
      process.exit(1);
    }

    console.log(`Country code is ${countryCode}, continuing...`);
    console.log(
      "----------------------------------------------------------------------------------------------------",
    );
  } catch (error) {
    console.error("Error fetching country code:", error);
    process.exit(1);
  }
}

module.exports = checkCountryCode;
