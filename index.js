const express = require("express");
const app = express();
const dotenv = require("dotenv");
const users = require("./routes/users");
const cors = require("cors");

app.use(cors());

dotenv.config();

app.use(express.json());

app.use("/v1/user", users);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running");
});
