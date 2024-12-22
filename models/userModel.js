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
  

const findDogByUserId = async (userId) => {
    await initPool();
    console.log("Searching for dog with userId:", userId);

    const query = `
        SELECT 
            DOG_NAME AS dogName, 
            D_COLOR AS dogColor, 
            D_WEIGHT AS dogWeight, 
            D_RACE AS dogRace, 
            USER_ICON AS userIcon, 
            LAST_LOCAT_LAT AS lastLocationLat, 
            LAST_LOCAT_LONG AS lastLocationLong, 
            D_SIZE AS dogSize, 
            D_AGE AS dogAge, 
            D_PERSONALITY AS dogPersonality, 
            D_HOBBIES AS dogHobbies
        FROM USER_DOG
        WHERE USER_ID = @userId
    `;

    const dogResult = await pool.request()
        .input('userId', sql.Int, userId)
        .query(query);

    console.log("Dog found:", JSON.stringify(dogResult.recordset[0])); // Debugging output
    return dogResult.recordset[0]; // Return the first record
};

// Find User by Username
const findUserByUsername = async (username) => {
    await initPool();
   // console.log("Finding user by username:", username);

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


const findUserIdByUsername = async (username) => {
    await initPool();
    console.log("Finding user by username:", username);

    const result = await pool.request()
        .input('username', sql.VarChar, username)
        .query('SELECT id FROM USERS WHERE USERNAME = @username');

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


const updateUser = async (userId, fieldsToUpdate) => {
    const fieldMapping = {
      dogName: 'DOG_NAME',
      dogColor: 'D_COLOR',
      dogWeight: 'D_WEIGHT',
      dogRace: 'D_RACE',
      userIcon: 'USER_ICON',
      lastLocationLat: 'LAST_LOCAT_LAT',
      lastLocationLong: 'LAST_LOCAT_LONG',
      dogSize: 'D_SIZE',
      dogAge: 'D_AGE',
      dogPersonality: 'D_PERSONALITY',
      dogHobbies: 'D_HOBBIES',
    };
  
    const setClauses = Object.keys(fieldsToUpdate)
      .map((key, index) => `${fieldMapping[key]} = @value${index}`)
      .join(', ');

      console.log("stay strong =",setClauses);
  
    const query = `
      UPDATE USER_DOG
      SET ${setClauses}
      WHERE USER_ID = @userId
    `;

    console.log("tell me more  "+query);
  
    const request = pool.request();
    request.input('userId', sql.Int, userId);
  
    Object.values(fieldsToUpdate).forEach((value, index) => {
      request.input(`value${index}`, sql.NVarChar, value);
    });


    try {
        const result = await request.query(query);
        console.log('Update successful:', result);
        return result;
      } catch (error) {
        console.error('Error updating user:', error);
        throw error; // Rethrow for handling by caller
      }
  
   // return request.query(query);
  };


  const signout = async (id, username) => {
    try {
        await initPool();
       // console.log("signout in model ", id, username,id *= -1);

        var negativeNewId=id * -1;
        var deletedTempUsrName = "removed_usr_"+username;


        console.log("Parameters: id =", id, ", negativeNewId =", negativeNewId, ", username =", username);



        // Safely parameterized query
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('negativeNewId', sql.Int, negativeNewId)
            .input('username', sql.VarChar, deletedTempUsrName)
            .query(`
            UPDATE Users SET  PASSWORD='finito', is_deleted=1 WHERE id = @id;
            SET IDENTITY_INSERT Users ON;
            INSERT INTO Users (id, username, email, password, role, status, created_at)
            VALUES (@negativeNewId, @username, @negativeNewId, @negativeNewId, 'user', 'unactive', GETDATE());
            SET IDENTITY_INSERT Users OFF;
            UPDATE Messages SET UserID = @negativeNewId WHERE UserID = @id;
            UPDATE Conversations SET UserID1 = @negativeNewId  WHERE UserID1 = @id; 
            UPDATE Participants SET UserID = @negativeNewId WHERE UserID = @id;
            
            
             UPDATE Friends
            SET 
     id = CASE WHEN id = @id THEN @negativeNewId ELSE id END,
     friend_id = CASE WHEN friend_id = @id THEN @negativeNewId ELSE friend_id END
 WHERE id = @id OR friend_id = @id;



            DELETE FROM Notifications WHERE userId = @id OR relatedUserId = @id;
 `);

 
/*
 UPDATE Friends
            SET id = CASE WHEN id = @id THEN @negativeNewId ELSE id END, friend_id = CASE WHEN friend_id = @id THEN @negativeNewId ELSE friend_id END WHERE id = @id OR friend_id = @id;
            DELETE FROM Users WHERE id = @id;
*/




/*
            SELECT id, Username FROM Users
            WHERE id = @id
        */
        console.log(" result from sign out "+ JSON.stringify(result) );


       // console.log("so user found "+ JSON.stringify(users))

        // Check if both users were found

        return result;

    } catch (error) {
        console.error("Error in signout:", error);
        throw error; // Let the calling function handle the error response
    }
};
  



module.exports = {
    createUser,
    findUserByUsername,
    findUsersByUsername,
    findDogByUserId,
    findUsersForConversation,
    getUsersWithDogsExcludingUser,
    findUserIdByUsername,
    updateUser,
    signout
};
