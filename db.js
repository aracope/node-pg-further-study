require("dotenv").config();

/** Database setup for BizTime. */
const { Client } = require("pg");

let DB_URI;

if (process.env.NODE_ENV === "test") {
  DB_URI = process.env.DATABASE_URL_TEST || "postgresql:///biztime_test";
} else {
  DB_URI = process.env.DATABASE_URL || "postgresql:///biztime";
}

const db = new Client({
  connectionString: DB_URI
});

db.connect()
  .then(() => {
    if (process.env.NODE_ENV === "test") {
      console.log("Connected to test database");
    } else {
      console.log("Connected to development database");
    }
  })
  .catch((err) => {
    console.error("Database connection error:", err.stack);
  });
  
module.exports = db;

