const fs = require("fs");
const readline = require("readline");

const packageJsonPath = "./package.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function updateVersion(newVersion) {
  fs.readFile(packageJsonPath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading ${packageJsonPath}:`, err);
      process.exit(1);
    }

    // Parse the JSON data from package.json
    const packageJson = JSON.parse(data);

    // Update the version property
    packageJson.version = newVersion;

    fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      "utf8",
      (writeErr) => {
        if (writeErr) {
          console.error(`Error writing to ${packageJsonPath}:`, writeErr);
          process.exit(1);
        }

        console.log(`Version updated to ${newVersion} in package.json.`);
        process.exit(0);
      },
    );
  });
}

rl.question("Enter the new version number: ", (answer) => {
  updateVersion(answer);
  rl.close();
});
