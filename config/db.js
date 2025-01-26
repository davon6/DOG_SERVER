const { Pool } = require('pg'); // Import pg (node-postgres)
require('dotenv').config(); // Load environment variables

// PostgreSQL database configuration
const config = {
    user: 'docpilot',
    password: 'docpilot',
    host: 'autorack.proxy.rlwy.net', // Update with your PostgreSQL server host
    port: 47271, // Default PostgreSQL port
    database: 'railway', // Your database name
    ssl: { rejectUnauthorized: false }, // Use this if you need SSL (e.g., for production or hosted DBs)
};

// Create a pool for PostgreSQL connections
const pool = new Pool(config);

pool
    .connect()
    .then(client => {
        console.log('Connected to PostgreSQL Server');
        client.release(); // Release the client after a successful connection test
    })
    .catch(err => {
        console.log('Database Connection Failed! Bad Config: ', err);
        throw err;
    });

module.exports = {
    pool, // Export the pool for querying the database
    config, // Export the configuration if needed elsewhere
};
