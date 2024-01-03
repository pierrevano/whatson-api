const config = {
  reporters: ["default", ["jest-junit", { outputDirectory: "reports", outputName: "report.xml", addFileAttribute: "true" }]],
};

module.exports = config;
