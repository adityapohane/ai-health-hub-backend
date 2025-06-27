// db.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,       // e.g., 'localhost'
  user: process.env.DB_USER,       // e.g., 'root'
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
   port: process.env.DB_PORT || 3306, // ✅ Add this line
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
    try {
      const connection = await pool.getConnection();
      console.log('✅ Connected to MySQL database');
      connection.release();
    } catch (err) {
      console.error('❌ Failed to connect to MySQL database:', err.message);
      process.exit(1); // Optional: Exit the app if DB fails
    }
  })();
  

module.exports = pool;
