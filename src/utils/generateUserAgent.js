/**
 * This module provides functionality to generate random User-Agent strings.
 * It includes predefined User-Agent strings for the latest versions of Chrome,
 * Firefox, and Safari.
 *
 * Functions:
 * generateUserAgent() - Selects a random User-Agent string from predefined options and returns it.
 */

const userAgents = [
  // Chrome User Agents
  () =>
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5449.179 Safari/537.36",
  () =>
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5449.179 Safari/537.36",

  // Firefox User Agents
  () =>
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0",
  () =>
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11.5; rv:116.0) Gecko/20100101 Firefox/116.0",

  // Safari User Agents
  () =>
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
  () =>
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
];

function generateUserAgent() {
  const randomUserAgentGenerator =
    userAgents[Math.floor(Math.random() * userAgents.length)];
  return randomUserAgentGenerator();
}

module.exports = {
  generateUserAgent,
};
