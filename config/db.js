// db.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

console.log(process.env.PORT)
// Default configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};


const pool = mysql.createPool(dbConfig);

// Test the connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully.✅');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err);

    console.error('Make sure your MySQL server is running and accessible');
    process.exit(1);
  }
})();

module.exports = pool;
