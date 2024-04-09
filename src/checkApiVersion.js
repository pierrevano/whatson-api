const fs = require("fs");

fs.stat("./package.json", (err, { mtime }) => {
  if (err) {
    console.log(err);
  } else {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    if (mtime.getTime() < fiveMinutesAgo.getTime()) {
      console.log("The API version has not been updated in the last 5 minutes. Aborting.");
      process.exit(1);
    }
  }
});
