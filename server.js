"use strict";

const app = require("./app");
const { PORT } = require("./config");

app.listen(process.env.PORT, function () {
  console.log(`Started on http://localhost:${PORT}`);
});
