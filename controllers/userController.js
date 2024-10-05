const { poolPromise } = require('../config/db');

const getUsers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM USER_DOG');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};


const findUserByUsername = async (req, res) => {
    try {
        console.log("findUserByUsername reached"); // For debugging

        // Access username from request body
        const username = req.body.username; // Get the username from the request body
        
        // Log the username to check if it's being received correctly
        console.log("Username from body: " + username); 

        // Check if username is provided
        if (!username) {
            return res.status(400).send({ message: "Username is required." }); // Bad Request
        }

        const pool = await poolPromise;

        // Use a parameterized query to avoid SQL Injection
        const result = await pool.request()
            .input('username', username)  // Bind the username parameter
            .query('SELECT * FROM USER_DOG WHERE USER_NAME = @username');  // Use @username as a placeholder

        // Check if any user was found
        if (result.recordset.length === 0) {
            return res.status(404).send({ message: "User not found." }); // Not Found
        }

        res.json(result.recordset); // Send the result back
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};




module.exports = {
    getUsers,
    findUserByUsername  
};
