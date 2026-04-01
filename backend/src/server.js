const dotenv = require("dotenv");
const app = require("./app");
const db = require("./config/db");

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
  app.listen(port, async () => {
    console.log(`Server running on port ${port}`);

    try {
      await db.query("SELECT 1");
      console.log("Database connection verified");
    } catch (error) {
      console.error("Database connection check failed", error.message);
    }
  });
};

startServer();
