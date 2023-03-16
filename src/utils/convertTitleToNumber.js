/**
 * It takes a string as an argument and returns a number
 * @param title - The title of the review.
 * @returns The number value of the title.
 */
const convertTitleToNumber = (title) => {
  switch (title) {
    case "Chef-d'oeuvre":
      return 5;
    case "Excellent":
      return 4.5;
    case "Très bien":
      return 4;
    case "Bien":
      return 3.5;
    case "Pas mal":
      return 3;
    case "Moyen":
      return 2.5;
    case "Pas terrible":
      return 2;
    case "Mauvais":
      return 1.5;
    case "Très mauvais":
      return 1;
    case "Nul":
      return 0.5;
    default:
      return;
  }
};

module.exports = { convertTitleToNumber };
