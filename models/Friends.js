const { sql, poolPromise } = require('../config/db');
const { clients } = require('../wsServer');

let pool;

// Initialize the pool once, with retries if necessary
const initPool = async () => {
  try {
    if (!pool) {
      pool = await poolPromise;
      console.log("Database pool initialized");
    }
    return pool;
  } catch (error) {
    console.error("Error initializing database pool:", error);
    throw error; // Throw error to ensure we don’t proceed without a connection
  }
};

// Get all friends for a specific user
const getFriends = async (userId) => {
  try {
    const pool = await initPool();
    const query = `
      SELECT u.username
FROM Users u
JOIN Friends f ON u.id = f.friend_id
WHERE f.request_accepted = 1
  AND f.id = @userId
  AND EXISTS (
    SELECT 1
    FROM Friends f2
    WHERE f2.id = f.friend_id AND f2.friend_id = @userId AND f2.request_accepted = 1
  );

    `;
    const result = await pool.request().input('userId', sql.Int, userId).query(query);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching friends:", error);
    throw error;
  }
};

// Add a friend request
const addFriendRequest = async (userId, friendId) => {
  try {
    const pool = await initPool();

console.log("starting  "+userId+ friendId);

    const query = `
      INSERT INTO Friends (id, friend_id, request_accepted)
      VALUES (@userId, @friendId, 0);
      INSERT INTO Friends (id, friend_id, request_accepted)
      VALUES (@friendId, @userId, 1);
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);


    return { message: 'Friend request sent' };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

// Accept a friend request
const acceptFriendRequest = async (userId, friendId,  username, relatedUsername) => {
  try {


    
console.log("acceptFriendRequest ok ------------------------->>>>");
    const pool = await initPool();
    const query = `
      UPDATE Friends
      SET request_accepted = 1
      WHERE id = @userId AND friend_id = @friendId;
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);
    
    
    const checkQuery = `
      SELECT COUNT(*) AS matchCount
      FROM Friends
      WHERE 
        (id = @userId AND friend_id = @friendId AND request_accepted = 1)
        OR
        (id = @friendId AND friend_id = @userId AND request_accepted = 1);
    `;
    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .input("friendId", sql.Int, friendId)
      .query(checkQuery);

      console.log("matchCount ok ------------------------->>>>");

    // Check if both rows are updated to request_accepted = 1
    const matchCount = result.recordset[0].matchCount

console.log("chekcing relationships are bth ok ---->>>>"+matchCount);

if (matchCount === 2) {
  //res.json({ success: true, areFriends: true });
  const client1 = clients.get(username).ws;
  const client2 = clients.get(relatedUsername).ws;




  if (client1) {

      console.log("---------->>>>> we found client 1"+ username);

      client1.send(JSON.stringify({notification : { type: 'relationship_update', username: relatedUsername }}));
  }

  if (client2) {

    console.log("---------->>>>> we found client 2"+ relatedUsername);

      client2.send(JSON.stringify({notification : { type: 'relationship_update', username: username }}));
  }
}
    
    
    return { message: 'Friend request accepted' };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// Remove a friend
const removeFriend = async (userId, friendId) => {
  try {
    const pool = await initPool();
    const query = `
      DELETE FROM Friends
      WHERE (id = @userId AND friend_id = @friendId)
         OR (id = @friendId AND friend_id = @userId);
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);
    return { message: 'Friend removed' };
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

// Check the relationship status and direction between two users
const getFriendRelationship = async (userId, otherUserId) => {
  try {
    const pool = await poolPromise;

    const query = `
    SELECT
  CASE
    WHEN (
      EXISTS (
        SELECT 1
        FROM Friends f1
        WHERE f1.id = @userId AND f1.friend_id = @otherUserId AND f1.request_accepted = 1
      )
      AND EXISTS (
        SELECT 1
        FROM Friends f2
        WHERE f2.id = @otherUserId AND f2.friend_id = @userId AND f2.request_accepted = 1
      )
    ) THEN 'friends'

    -- Case when the user has sent a request
    WHEN (
      EXISTS (
        SELECT 1
        FROM Friends f1
        WHERE f1.id = @userId AND f1.friend_id = @otherUserId AND f1.request_accepted = 0
      )
    ) THEN 'received'

    -- Case when the user has received a request
    WHEN (
      EXISTS (
        SELECT 1
        FROM Friends f1
        WHERE f1.id = @otherUserId AND f1.friend_id = @userId AND f1.request_accepted = 0
      )
    ) THEN 'sent'

    -- Default case: no relationship
    ELSE 'none'
  END AS relationship
FROM Friends
WHERE (id = @userId AND friend_id = @otherUserId)
   OR (id = @otherUserId AND friend_id = @userId);  `;
/*`
      SELECT
        CASE
          WHEN request_accepted = 1 THEN 'friends'
          WHEN request_accepted = 0 AND id = @userId THEN 'sent'
          WHEN request_accepted = 0 AND friend_id = @userId THEN 'received'
          ELSE 'none'
        END AS relationship
      FROM Friends
      WHERE (id = @userId AND friend_id = @otherUserId)
         OR (id = @otherUserId AND friend_id = @userId);
    `;
*/
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('otherUserId', sql.Int, otherUserId)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0].relationship : 'none';
  } catch (error) {
    console.error('Error fetching friend relationship:', error);
    throw error;
  }
};

const deleteFriendRequest = async (userId, friendId) => {
  try {
    const pool = await initPool();
    const query = `
      DELETE FROM Friends
      WHERE id = @friendId AND friend_id = @userId;
      DELETE FROM Friends
      WHERE id = @userId AND friend_id = @friendId;
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);
    return { message: 'Friend request deleted' };
  } catch (error) {
    console.error('Error deleting friend request:', error);
    throw error;
  }
};



module.exports = {
  initPool, // Export if needed elsewhere
  getFriends,
  addFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  removeFriend,
  getFriendRelationship
};
