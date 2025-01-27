const { pool } = require('../config/db'); // Use the PostgreSQL pool

// Initialize a query execution function
const executeQuery = async (query, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result;
    } finally {
        client.release();
    }
};

// Create User and Dog
const createUser = async (username, email, password, dogName, dogColor, dogWeight, dogRace, dogSex, dogSize, dogAge, dogPersonality, dogHobbies) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

console.log("starting our signIn");

        // Insert user
        const userQuery = `
            INSERT INTO public.users ("USERNAME", "EMAIL" , "PASSWORD")
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
        const userResult = await client.query(userQuery, [username, email, password]);
        const {id } = userResult.rows[0];

        console.log("----->>>>>>",id);

        // Insert dog
        const dogQuery = `
    INSERT INTO public."USER_DOG" 
    ("DOG_NAME", "USER_ID", "D_COLOR", "D_WEIGHT", "D_RACE", "D_SEX", "LAST_LOCAT_LAT", "LAST_LOCAT_LONG", "D_HOBBIES", "D_AGE", "D_SIZE", "D_PERSONALITY")
    VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, $7, $8, $9, $10);
`;

        await client.query(dogQuery, [dogName, id, dogColor, dogWeight, dogRace, dogSex, dogHobbies, dogAge, dogSize, dogPersonality]);

        await client.query('COMMIT'); // Commit transaction
        console.log('User and dog inserted successfully');
        return id;
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction
        console.error('Error executing transaction:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

// Get users with dogs excluding a specific user
const getUsersWithDogsExcludingUser = async (userId) => {
    const query = `
        SELECT u.id, u."USERNAME", d."DOG_NAME"
        FROM users u
        INNER JOIN "public"."USER_DOG" d ON u.id = d."USER_ID"
        WHERE u.id != $1 AND u.is_deleted != TRUE;
    `;
    const result = await executeQuery(query, [userId]);
    return result.rows;
};

// Find dog by user ID
const findDogByUserId = async (userId) => {
    const query = `
        SELECT 
            "DOG_NAME" AS "dogName", 
            "D_COLOR" AS "dogColor", 
            "D_WEIGHT" AS "dogWeight", 
            "D_RACE" AS "dogRace", 
            "LAST_LOCAT_LAT" AS "lastLocationLat", 
            "LAST_LOCAT_LONG" AS "lastLocationLong", 
            "D_SIZE" AS "dogSize", 
            "D_AGE" AS "dogAge", 
            "D_PERSONALITY" AS "dogPersonality", 
            "D_HOBBIES" AS "dogHobbies"
        FROM public."USER_DOG" 
        WHERE "USER_ID" = $1;
    `;

    const result = await executeQuery(query, [userId]);
    return result.rows[0];
};

// Find user by username
const findUserByUsername = async (username) => {
    const query = `
        SELECT * FROM "public"."users" WHERE "USERNAME" = $1;
    `;
    const result = await executeQuery(query, [username]);
    return result.rows[0] || null;
};

// Find user ID by username
const findUserIdByUsername = async (username) => {
    const query = `
        SELECT id FROM "public"."users" WHERE "USERNAME" = $1;
    `;
    const result = await executeQuery(query, [username]);
    return result.rows[0] || null;
};

// Update user and dog's fields
const updateUser = async (userId, fieldsToUpdate) => {
    const fieldMapping = {
        dogName: '"DOG_NAME"',
        dogColor: '"D_COLOR"',
        dogWeight: '"D_WEIGHT"',
        dogRace: '"D_RACE"',
        dogSex: '"D_SEX"',
        lastLocationLat: '"LAST_LOCAT_LAT"',
        lastLocationLong: '"LAST_LOCAT_LONG"',
        dogSize: '"D_SIZE"',
        dogAge: '"D_AGE"',
        dogPersonality: '"D_PERSONALITY"',
        dogHobbies: '"D_HOBBIES"',
    };

    const setClauses = Object.entries(fieldsToUpdate)
        .map(([key, value], index) => `${fieldMapping[key]} = $${index + 2}`)
        .join(', ');

    const query = `
        UPDATE "public"."USER_DOG"
        SET ${setClauses}
        WHERE "USER_ID" = $1;
    `;
    const values = [userId, ...Object.values(fieldsToUpdate)];
    await executeQuery(query, values);
    console.log('User dog details updated successfully');
};

// Sign out user
const signout = async (id, username) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const negativeId = id * -1;
        const deletedUsername = `removed_usr_${username}`;

        // Perform multiple updates/deletes as part of signout
        const queries = [
            `UPDATE users SET password = 'finito', isDeleted = TRUE WHERE id = $1;`,
            `INSERT INTO "public"."users" (id, USERNAME, EMAIL, PASSWORD, role, status, created_at)
             VALUES ($1, $2, '', '', 'user', 'inactive', NOW());`,
            `UPDATE "public"."Messages" SET userId = $1 WHERE userId = $2;`,
            `UPDATE "public"."Conversations" SET userId1 = $1 WHERE userId1 = $2;`,
            `UPDATE "public"."Participants" SET userId = $1 WHERE userId = $2;`,
            `UPDATE "public"."Friends"
             SET id = CASE WHEN id = $2 THEN $1 ELSE id END,
                 friendId = CASE WHEN friendId = $2 THEN $1 ELSE friendId END
             WHERE id = $2 OR friendId = $2;`,
            `DELETE FROM "public"."Notifications" WHERE userId = $1 OR relatedUserId = $1;`,
        ];

        await Promise.all(
            queries.map((query, index) => client.query(query, [negativeId, id, deletedUsername][index]))
        );

        await client.query('COMMIT');
        console.log('User signed out successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in signout:', error);
        throw error;
    } finally {
        client.release();
    }
};

// Save user's last location
const saveupUserLastLocation = async (username, lat, long) => {
    const user = await findUserIdByUsername(username);
    if (!user) throw new Error('User not found');

    const query = `
        UPDATE public."USER_DOG"
        SET "LAST_LOCAT_LAT" = $1,
            "LAST_LOCAT_LONG" = $2
        WHERE "USER_ID" = $3;
    `;
    await executeQuery(query, [lat, long, user.id]);
    console.log('User location updated successfully');
};

const findUsersByUsername = async (username, userNameFriend) => {
    console.log("Finding users by username:", username, userNameFriend);

    const query = `
        SELECT id, "USERNAME"
        FROM public.users
        WHERE "USERNAME" = $1 OR "USERNAME" = $2;
    `;

    const result = await executeQuery(query, [username, userNameFriend]);

    if (result.rows.length === 0) {
        console.log("User not found");
        return null;
    }

    // Map the result to ensure the order matches the input usernames
    const userMap = result.rows.reduce((map, user) => {
        map[user.USERNAME] = user.id;
        return map;
    }, {});

    const id1 = userMap[username];
    const id2 = userMap[userNameFriend];

    if (!id1 || !id2) {
        console.log("One or both users not found");
        return null;
    }

    console.log("User IDs found:", { id1, id2 });
    return [id1, id2];
};


const findUsersForConversation = async (senderUsername, receiverUsername) => {
    try {
        console.log("Finding users by username:", senderUsername, receiverUsername);

        // Parameterized query using PostgreSQL
        const query = `
            SELECT id, "USERNAME"
            FROM public.users
            WHERE "USERNAME" = $1 OR "USERNAME" = $2;
        `;

        // Execute the query with the input parameters
        const result = await executeQuery(query, [senderUsername, receiverUsername]);

        const users = result.rows;

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
    getUsersWithDogsExcludingUser,
    findDogByUserId,
    findUserByUsername,
    findUserIdByUsername,
    updateUser,
    signout,
    saveupUserLastLocation,
    findUsersByUsername,
    findUsersForConversation
};
