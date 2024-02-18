const logErrors = (error, item, origin) => {
  if (error instanceof RangeError) {
    console.log("First item not updated:", item);
    process.exit(1);
  }

  if (error.response && error.response.status >= 500) {
    console.log(`Error - status code ${error.response.status} - ${item}`);
    process.exit(1);
  }

  let errorMsg = `${item} - ${origin} - ${error}`;
  if (!errorMsg.includes("AxiosError: Request failed with status code 404") && !errorMsg.includes("TypeError: $ is not a function")) {
    console.log(errorMsg);
    process.exit(1);
  }
};

module.exports = { logErrors };
