// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgresql://user:pass@host:5432/dbname
  ssl: { rejectUnauthorized: false }, // enable if your provider requires SSL
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = pool;
