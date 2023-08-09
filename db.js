var mysql = require("mysql2");

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "admin",
  database: "market_intelligence_dashboard",
});

module.exports = db;
