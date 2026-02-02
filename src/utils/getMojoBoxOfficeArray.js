const { existsSync, readFileSync, writeFileSync } = require("fs");

const { getMojoBoxOffice } = require("../content/getMojoBoxOffice");

/**
 * Get a Mojo box office array for the given item type, optionally reusing a cache file.
 * @param {string} item_type
 * @param {string} skip_mojo - "skip_mojo" to skip, "reuse_mojo" to read cache when available.
 * @returns {Promise<Array>} Array of box office entries (empty if skipped or unsupported).
 */
const getMojoBoxOfficeArray = async (item_type, skip_mojo) => {
  const mojoBoxOfficeCachePath = `./temp_mojo_box_office_${item_type || "unknown"}.json`;
  let mojoBoxOfficeArray = [];

  if (item_type === "movie" && skip_mojo !== "skip_mojo") {
    if (skip_mojo === "reuse_mojo") {
      if (!existsSync(mojoBoxOfficeCachePath)) {
        console.error(
          `Mojo cache file not found at ${mojoBoxOfficeCachePath}. Run without reuse_mojo to generate it.`,
        );
        process.exit(1);
      }

      try {
        mojoBoxOfficeArray = JSON.parse(
          readFileSync(mojoBoxOfficeCachePath, "utf-8"),
        );
      } catch (error) {
        console.error(
          `Failed to read Mojo cache file at ${mojoBoxOfficeCachePath}: ${error.message}`,
        );
        process.exit(1);
      }
    } else {
      mojoBoxOfficeArray = await getMojoBoxOffice(item_type);
      writeFileSync(
        mojoBoxOfficeCachePath,
        JSON.stringify(mojoBoxOfficeArray, null, 2),
        "utf-8",
      );
    }
  }

  return mojoBoxOfficeArray;
};

module.exports = { getMojoBoxOfficeArray };
