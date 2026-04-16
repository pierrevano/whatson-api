const fs = require("fs").promises;
const readline = require("readline");

const packageJsonPath = "./package.json";
const openapiPath = "./public/openapi.yaml";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function updateVersion(newVersion) {
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
    packageJson.version = newVersion;
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "utf8",
    );
    console.log(`Version updated to ${newVersion} in package.json.`);

    const yaml = await fs.readFile(openapiPath, "utf8");
    await fs.writeFile(
      openapiPath,
      yaml.replace(/^  version: [\d.]+$/m, `  version: ${newVersion}`),
      "utf8",
    );
    console.log(`Version updated to ${newVersion} in openapi.yaml.`);

    process.exit(0);
  } catch (err) {
    console.error("Error updating version:", err);
    process.exit(1);
  }
}

rl.question("Enter the new version number: ", (answer) => {
  updateVersion(answer);
  rl.close();
});
