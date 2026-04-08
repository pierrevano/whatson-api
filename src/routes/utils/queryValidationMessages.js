const INTEGER_PATTERN = /^-?\d+$/;

/**
 * Returns the validation message for integer params that only have a minimum.
 *
 * @param {string} name
 * @returns {string}
 */
const getMinimumMessage = (name) => {
  if (name === "page") {
    return `The ${name} must be an integer greater than 0.`;
  }

  return `The ${name} must be an integer greater than or equal to 0.`;
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
  `The ${name} must be an integer between ${minimum} and ${maximum}.`;

/**
 * Returns the validation message for comma-separated integer lists.
 *
 * @param {string} name
 * @param {number} minimum
 * @returns {string}
 */
const getCommaSeparatedContainMessage = (name, minimum) =>
  minimum === 0
    ? `The ${name} must contain only integers greater than or equal to 0.`
    : `The ${name} must contain only integers greater than 0.`;

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
  const receivedValue = `'${String(value)}'`;
  const message = hasMaximum
    ? getMinimumAndMaximumMessage(name, minimum, maximum)
    : getMinimumMessage(name);

  if (!INTEGER_PATTERN.test(trimmedValue)) {
    return `${message} Received ${receivedValue}.`;
  }

  const parsedValue = Number(trimmedValue);

  if (parsedValue < minimum || (hasMaximum && parsedValue > maximum)) {
    return `${message} Received ${receivedValue}.`;
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
  if (typeof value === "undefined" || value === null || value === "") {
    return null;
  }

  const values = String(value)
    .split(",")
    .map((item) => item.trim());
  const receivedValue = `'${String(value)}'`;

  if (values.some((item) => item === "" || !INTEGER_PATTERN.test(item))) {
    return `${getCommaSeparatedContainMessage(name, minimum)} Received ${receivedValue}.`;
  }

  if (values.some((item) => Number(item) < minimum)) {
    return `${getCommaSeparatedContainMessage(name, minimum)} Received ${receivedValue}.`;
  }

  return null;
};

module.exports = {
  validateIntegerListParam,
  validateIntegerParam,
};
