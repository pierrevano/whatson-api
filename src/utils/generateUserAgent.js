/**
 * This module provides functionality to generate random User-Agent strings.
 * It includes predefined User-Agent strings for the latest versions of Chrome,
 * Firefox, and Safari.
 *
 * Functions:
 * generateUserAgent() - Selects a random User-Agent string from predefined options and returns it.
 */

const { config } = require("../config");

const userAgents = [
  () => config.userAgentChrome,
  () => config.userAgentChromeAlt,
  () => config.userAgentFirefox,
  () => config.userAgentFirefoxAlt,
  () => config.userAgentSafari,
  () => config.userAgentSafariAlt,
];

function generateUserAgent() {
  const randomUserAgentGenerator =
    userAgents[Math.floor(Math.random() * userAgents.length)];
  return randomUserAgentGenerator();
}

module.exports = {
  generateUserAgent,
};
