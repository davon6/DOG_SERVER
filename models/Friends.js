const { sql, poolPromise } = require('../config/db');

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
      SELECT  u.username
      FROM Users u
      JOIN Friends f ON (f.id = u.id OR f.friend_id = u.id)
      WHERE (f.id = @userId OR f.friend_id = @userId)
      AND f.request_accepted = 1
      AND u.id != @userId;
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
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);


    return { message: 'Friend request sent' };
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw error;
  }
};

// Accept a friend request
const acceptFriendRequest = async (userId, friendId) => {
  try {
    const pool = await initPool();
    const query = `
      UPDATE Friends
      SET request_accepted = 1
      WHERE id = @userId AND friend_id = @friendId;
    `;
    await pool.request().input('userId', sql.Int, userId).input('friendId', sql.Int, friendId).query(query);
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
          WHEN request_accepted = 1 THEN 'friends'
          WHEN request_accepted = 0 AND id = @userId THEN 'sent'
          WHEN request_accepted = 0 AND friend_id = @userId THEN 'received'
          ELSE 'none'
        END AS relationship
      FROM Friends
      WHERE (id = @userId AND friend_id = @otherUserId)
         OR (id = @otherUserId AND friend_id = @userId);
    `;

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
