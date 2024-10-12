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
/*
const findUserByUsername = async (username) => {
    const pool = await poolPromise;
    const result = await pool.request()
        .input('username', username)
        .query('SELECT * FROM USER_DOG WHERE USER_NAME = @username');

    return result.recordset[0]; // Return the found user
};
*/
// Other user-related database operations can be added here as needed

module.exports = {
    createUser,
  //  findUserByUsername,
};
