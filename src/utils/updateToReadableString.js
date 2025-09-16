function updateToReadableString(str) {
  if (typeof str !== "string") return null;

  const words = str.split("_").map((w) => w.toLowerCase());
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

module.exports = { updateToReadableString };
