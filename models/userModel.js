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
        SELECT u.id, u.username, d.dog_name
        FROM users u
        INNER JOIN public."USER_DOG" d ON u.id = d.user_id
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
        dogName: 'dog_name',
        dogColor: 'd_color',
        dogWeight: 'd_weight',
        dogRace: 'd_race',
        dogSex: 'd_sex',
        lastLocationLat: 'last_locat_lat',
        lastLocationLong: 'last_locat_long',
        dogSize: 'd_size',
        dogAge: 'd_age',
        dogPersonality: 'd_personality',
        dogHobbies: 'd_hobbies',
    };

    const setClauses = Object.entries(fieldsToUpdate)
        .map(([key, value], index) => `${fieldMapping[key]} = $${index + 2}`)
        .join(', ');

    const query = `
        UPDATE user_dog
        SET ${setClauses}
        WHERE user_id = $1;
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
            `UPDATE users SET password = 'finito', is_deleted = TRUE WHERE id = $1;`,
            `INSERT INTO users (id, username, email, password, role, status, created_at)
             VALUES ($1, $2, '', '', 'user', 'inactive', NOW());`,
            `UPDATE messages SET user_id = $1 WHERE user_id = $2;`,
            `UPDATE conversations SET user_id1 = $1 WHERE user_id1 = $2;`,
            `UPDATE participants SET user_id = $1 WHERE user_id = $2;`,
            `UPDATE friends
             SET id = CASE WHEN id = $2 THEN $1 ELSE id END,
                 friend_id = CASE WHEN friend_id = $2 THEN $1 ELSE friend_id END
             WHERE id = $2 OR friend_id = $2;`,
            `DELETE FROM notifications WHERE user_id = $1 OR related_user_id = $1;`,
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
        SET LAST_LOCAT_LAT = $1,
            LAST_LOCAT_LONG = $2
        WHERE "USER_ID" = $3;
    `;
    await executeQuery(query, [lat, long, user.id]);
    console.log('User location updated successfully');
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
};
