const { poolPromise } = require('../config/db');

// Create User
const createUser = async (username, email, password) => {

    console.log("tempting connection to db");


    //console.log("here we go"+ input('username', username)+input('email', email)+input('password', password));


    const pool = await poolPromise;
    console.log("Connected to DB");

    console.log(`Username: ${username}, Email: ${email}, Password: ${password}`); 


    console.log(`Executing query: INSERT INTO USERS (USERNAME, EMAIL, PASSWORD) OUTPUT INSERTED.ID VALUES ('${username}', '${email}', '${password}')`);


    try {
        const result = await pool.request()
            .input('username', username)
            .input('email', email)
            .input('password', password)
            .query('INSERT INTO USERS (USERNAME, EMAIL, PASSWORD) OUTPUT INSERTED.ID VALUES (@username, @email, @password)');
        
        console.log("User inserted successfully:", result.recordset[0]);

        return result.recordset[0]; // Return the created user ID
    } catch (error) {
        console.error("Error executing query:", error.message);  // Log the error
        throw error;  // Re-throw the error for further handling
    }

};

// Find User by Username

const findUserByUsername = async (username) => {
    console.log("Finding user by username:", username); // Debugging log

    const pool = await poolPromise;

    // Use a parameterized query to avoid SQL Injection
    const result = await pool.request()
        .input('username', username)
        .query('SELECT * FROM USERS WHERE USERNAME = @username'); // Adjust the table name as needed

    // Check if any user was found
    if (result.recordset.length === 0) {
        console.log("User not found");
        return null; // Return null if no user is found
    }

    console.log("User found:", result.recordset[0]);
    return result.recordset[0]; // Return the found user
};

const findUserInfoByUsername = async (username) => {
    try {
        console.log("findUserInfoByUsername reached"); // For debugging

        // Access username from request body
        //const username = req.body.username; // Get the username from the request body
        
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
            //.query('SELECT * FROM [users] u JOIN user_dog ud ON u.username = ud.user_name WHERE u.username = @username');
            
        // Check if any user was found
        if (result.recordset.length === 0) {
            return res.status(404).send({ message: "User not found." }); // Not Found
        }


        console.log("found and even fetched "+ JSON.stringify(result.recordset[0]));


        return result.recordset[0];
       // res.json(result.recordset); // Send the result back
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

module.exports = {
    createUser,
    findUserByUsername,
    findUserInfoByUsername,
};
