// db.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://sun_safety_user:rtyoDu5HGsIn4zOZ1OyMJvgqzlnXJshM@dpg-d6nt8cfgi27c73abff40-a.oregon-postgres.render.com/sun_safety', // e.g. postgresql://user:pass@host:5432/dbname
  ssl: { rejectUnauthorized: false }, // enable if your provider requires SSL
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

module.exports = pool;
