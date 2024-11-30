const { sql, poolPromise } = require('../config/db');

// Initialize pool once for the entire module
let pool;
const initPool = async () => {
    if (!pool) {
        pool = await poolPromise;
        console.log("Database pool initialized");
    }
};

// Create User
const createUser = async (username, email, password, dogName, dogColor, dogWeight, dogRace, dogSize, dogAge, dogPersonality, dogHobbies) => {
    await initPool();  // Ensure pool is initialized

    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        const request = new sql.Request(transaction);

        // Insert the user
        const userResult = await request
            .input('username', sql.VarChar, username)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, password)
            .query('INSERT INTO USERS (USERNAME, EMAIL, PASSWORD) OUTPUT INSERTED.ID AS userId VALUES (@username, @email, @password)');
        
        const userId = userResult.recordset[0].userId;
        console.log("User inserted with ID:", userId);

        // Insert the dog
        await request
            .input('dogName', sql.VarChar, dogName)
            .input('userId', sql.Int, userId)
            .input('dogColor', sql.VarChar, dogColor)
            .input('dogWeight', sql.VarChar, dogWeight)
            .input('dogRace', sql.VarChar, dogRace)
            .input('lastLocLat', sql.Decimal, null)
            .input('lastLocLong', sql.Decimal, null)
            .input('dogHobbies', sql.VarChar, dogHobbies)
            .input('dogPersonality', sql.VarChar, dogPersonality)
            .input('dogAge', sql.VarChar, dogAge)
            .input('dogSize', sql.VarChar, dogSize)
            .query(`INSERT INTO USER_DOG (DOG_NAME, USER_ID, D_COLOR, D_WEIGHT, D_RACE, LAST_LOCAT_LAT, LAST_LOCAT_LONG, D_HOBBIES, D_AGE, D_SIZE, D_PERSONALITY) 
                    VALUES (@dogName, @userId, @dogColor, @dogWeight, @dogRace, @lastLocLat, @lastLocLong, @dogHobbies, @dogAge, @dogSize, @dogPersonality )`);

        await transaction.commit();
        console.log("User and dog inserted successfully");

        return userResult.recordset;
    } catch (error) {
        console.error("Error executing transaction:", error.message);
        if (transaction) await transaction.rollback();
        throw error;
    }
};



const getUsersWithDogsExcludingUser = async (userId) => {
    try {
        await initPool();
        // Use a parameterized query to exclude the userId
        const result = await pool.request()
            .input('userId', sql.Int, userId) // Pass userId as a parameter
            .query(`
                     SELECT u.id, u.username, d.dog_name
                     FROM users u
                     INNER JOIN user_dog d ON u.id = d.USER_ID
                WHERE u.id != @userId;
            `);

        console.log('Query result:', result.recordset); // Debugging log
        return result.recordset;
    } catch (error) {
        console.error('Database query failed:', error);
        throw error;
    }
};
  

// Find Dog by User ID
const findDogByUserId = async (userId) => {
    await initPool();
    console.log("Searching for dog with userId:", userId);

    const dogResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM USER_DOG WHERE USER_ID = @userId');

 //   console.log("Dog found:", JSON.stringify(dogResult.recordset[0]));
    return dogResult.recordset[0];
};

// Find User by Username
const findUserByUsername = async (username) => {
    await initPool();
    console.log("Finding user by username:", username);

    const result = await pool.request()
        .input('username', sql.VarChar, username)
        .query('SELECT * FROM USERS WHERE USERNAME = @username');

    if (result.recordset.length === 0) {
        console.log("User not found");
        return null;
    }

   // console.log("User found:", result.recordset[0]);
    return result.recordset[0];
};

// Find User by Username
const findUsersByUsername = async (username, userNameFriend) => {
    await initPool();
    console.log("Finding users by username:", username, userNameFriend);

    const result = await pool.request()
        .input('username', sql.VarChar, username)
        .input('username2', sql.VarChar, userNameFriend)
        .query('SELECT id FROM USERS WHERE USERNAME = @username OR  USERNAME = @username2');

    if (result.recordset.length === 0) {
        console.log("User not found");
        return null;
    }

    console.log("User found:", result.recordset);
    return [result.recordset[0].id,result.recordset[1].id];
};


const findUsersForConversation = async (senderUsername, receiverUsername) => {
    try {
        await initPool();
        console.log("Finding users by username:", senderUsername, receiverUsername);

        // Safely parameterized query
        const result = await pool.request()
            .input('senderUsername', sql.VarChar, senderUsername)
            .input('receiverUsername', sql.VarChar, receiverUsername)
            .query(`
                SELECT id, Username FROM Users
                WHERE Username IN (@senderUsername, @receiverUsername)
            `);

        const users = result.recordset;


       // console.log("so user found "+ JSON.stringify(users))

        // Check if both users were found
        if (users.length < 2) {
            throw new Error('One or both users not found');
        }

        return users;

    } catch (error) {
        console.error("Error in findUsersForConversation:", error);
        throw error; // Let the calling function handle the error response
    }
};


module.exports = {
    createUser,
    findUserByUsername,
    findUsersByUsername,
    findDogByUserId,
    findUsersForConversation,
    getUsersWithDogsExcludingUser
};
