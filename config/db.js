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
    const errorDetails = {
      timestamp: new Date().toISOString(),
      errorType: 'DATABASE_CONNECTION_ERROR',
      errorMessage: err.message,
      errorStack: err.stack,
      retryAttempt: 0
    };

    // Log the error with structured format
    console.error('Database connection failed:', JSON.stringify(errorDetails, null, 2));
    
    // Create a retry mechanism
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds
    
    const retryConnection = async (attempt) => {
      if (attempt >= maxRetries) {
        console.error('Maximum retry attempts reached. Shutting down application.');
        process.exit(1);
        return;
      }

      try {
        console.log(`Attempting database connection retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        pool = mysql.createPool(dbConfig);
        pool.getConnection((err, connection) => {
          if (err) {
            errorDetails.retryAttempt = attempt + 1;
            console.error('Retry attempt failed:', JSON.stringify(errorDetails, null, 2));
            retryConnection(attempt + 1);
          } else {
            console.log('Database connection successful after retry');
            connection.release();
          }
        });
      } catch (retryErr) {
        errorDetails.retryAttempt = attempt + 1;
        console.error('Retry attempt failed:', JSON.stringify(errorDetails, null, 2));
        retryConnection(attempt + 1);
      }
    };

    // Start the first retry
    retryConnection(0);  
  }
})();

module.exports = pool;
