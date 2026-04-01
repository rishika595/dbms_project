const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const useSsl = Boolean(databaseUrl) && !/localhost|127\.0\.0\.1/i.test(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ...(useSsl
    ? {
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {})
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error", error);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
