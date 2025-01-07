function generateRandomIp() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(
    ".",
  );
}

module.exports = { generateRandomIp };
