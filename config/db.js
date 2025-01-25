const sql = require('mssql');
require('dotenv').config();

const config = {
    user: 'docpilot',
    password: 'docpilot',
    server: 'localhost',
    database: 'MAXIME',
    options: {
        encrypt: true, // for Azure
        trustServerCertificate: true // change to false for production
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to SQL Server');
        return pool;
    })
    .catch(err => {
        console.log('Database Connection Failed! Bad Config: ', err);
        throw err;
    });

module.exports = {
    sql, poolPromise, config 
};
