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
    
   // return result.recordset[0]; // Return the created user ID
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

// Other user-related database operations can be added here as needed

module.exports = {
    createUser,
    findUserByUsername,
};
