function isNotNull(id) {
  if (id === null || id === "null") {
    return null;
  } else {
    return id;
  }
}

module.exports = { isNotNull };
