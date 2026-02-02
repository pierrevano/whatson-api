const { config } = require("../config");

const handleConsentBanner = async (page) => {
  const consentSelector = ".fc-cta-consent";
  const consentLabelRegex = /consent/i;
  const delayMs = 1000;
  const contexts = [page, ...page.frames()];
  const tryClickFirst = async (locator) => {
    if ((await locator.count()) > 0) {
      await locator.first().click({ timeout: 2000 });
      await page
        .waitForLoadState("domcontentloaded", { timeout: 5000 })
        .catch(() => {});
      return true;
    }

    return false;
  };

  for (let attempt = 0; attempt < config.retries; attempt += 1) {
    await page.waitForTimeout(delayMs);
    for (const context of contexts) {
      try {
        const selectorLocator = context.locator(consentSelector);
        if (await tryClickFirst(selectorLocator)) return true;
      } catch (_) {}

      try {
        const roleLocator = context.getByRole("button", {
          name: consentLabelRegex,
        });
        if (await tryClickFirst(roleLocator)) return true;
      } catch (_) {}
    }
  }

  return false;
};

module.exports = { handleConsentBanner };
