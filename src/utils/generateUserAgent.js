/**
 * This module provides functionality to generate random User-Agent strings.
 * It includes a list of predefined User-Agent templates that cover common browsers
 * and devices, with some templates utilizing a random Chrome browser version.
 *
 * Functions:
 * getRandomChromeVersion() - Generates a random version string for Chrome browsers.
 * generateUserAgent() - Selects a random User-Agent template and returns the generated string.
 */

const userAgents = [
  function () {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${getRandomChromeVersion()} Safari/537.36`;
  },
  function () {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${getRandomChromeVersion()} Safari/537.36`;
  },
];

function getRandomChromeVersion() {
  const major = Math.floor(Math.random() * (90 - 60 + 1) + 60); // Chrome versions 60-90
  const minor = Math.floor(Math.random() * 1000); // 0-999
  return `${major}.${minor}`;
}

function generateUserAgent() {
  const randomUserAgentGenerator =
    userAgents[Math.floor(Math.random() * userAgents.length)];
  return randomUserAgentGenerator();
}

module.exports = {
  generateUserAgent,
};
