const { config } = require("../../config");

const INTEGER_PATTERN = /^-?\d+$/;

const invalidQueryValueMessage = (message, value, name) =>
  `${message} Received '${String(value)}'${name ? ` for '${name}'` : ""}.`;

const resolveValidationMessage = (message, values) =>
  Object.entries(values).reduce(
    (result, [name, value]) => result.replace(`{${name}}`, value),
    message,
  );

/**
 * Returns the validation message for integer params that only have a minimum.
 *
 * @param {string} name
 * @param {number} minimum
 * @returns {string}
 */
const getMinimumMessage = (name, minimum) => {
  if (name === "page" && minimum === 1) return config.invalidPageMessage;

  return resolveValidationMessage(config.invalidIntegerMinimumMessage, {
    minimum,
    name,
  });
};

/**
 * Returns the validation message for integer params constrained by a minimum and a maximum.
 *
 * @param {string} name
 * @param {number} minimum
 * @param {number} maximum
 * @returns {string}
 */
const getMinimumAndMaximumMessage = (name, minimum, maximum) =>
  resolveValidationMessage(config.invalidIntegerRangeMessage, {
    maximum,
    minimum,
    name,
  });

/**
 * Returns the validation message for comma-separated integer lists.
 *
 * @param {string} name
 * @param {number} minimum
 * @returns {string}
 */
const getCommaSeparatedContainMessage = (name, minimum) =>
  resolveValidationMessage(config.invalidIntegerListMinimumMessage, {
    minimum,
    name,
  });

/**
 * Validates a single integer query parameter.
 *
 * @param {string|number|undefined} value
 * @param {string} name
 * @param {number} [minimum=1]
 * @param {number} [maximum]
 * @returns {string|null}
 */
const validateIntegerParam = (value, name, minimum = 1, maximum) => {
  if (typeof value === "undefined") {
    return null;
  }

  const hasMaximum = typeof maximum === "number";
  const trimmedValue = String(value).trim();
  const message = hasMaximum
    ? getMinimumAndMaximumMessage(name, minimum, maximum)
    : getMinimumMessage(name, minimum);

  if (!INTEGER_PATTERN.test(trimmedValue)) {
    return invalidQueryValueMessage(message, value);
  }

  const parsedValue = Number(trimmedValue);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < minimum ||
    (hasMaximum && parsedValue > maximum)
  ) {
    return invalidQueryValueMessage(message, value);
  }

  return null;
};

/**
 * Validates a comma-separated list of integers.
 *
 * @param {string|number|null|undefined} value
 * @param {string} name
 * @param {number} [minimum=1]
 * @returns {string|null}
 */
const validateIntegerListParam = (value, name, minimum = 1) => {
  if (typeof value === "undefined" || value === null) {
    return null;
  }

  const values = String(value).split(",");
  if (values.some((item) => validateIntegerParam(item, name, minimum))) {
    return invalidQueryValueMessage(
      getCommaSeparatedContainMessage(name, minimum),
      value,
    );
  }

  return null;
};

module.exports = {
  invalidQueryValueMessage,
  resolveValidationMessage,
  validateIntegerListParam,
  validateIntegerParam,
};
