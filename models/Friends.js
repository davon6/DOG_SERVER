const  { pool } = require('../config/db'); // Ensure this connects to your PostgreSQL database
const { clients } = require('../wsServer');

// Get all friends for a specific user
const getFriends = async (userId) => {
  try {
    const query = `
      SELECT u."USERNAME"
      FROM users u
      JOIN  "public"."Friends" f ON u.id = f.friend_id
      WHERE f.request_accepted = true
        AND f.id = $1
        AND EXISTS (
          SELECT 1
          FROM "public"."Friends" f2
          WHERE f2.id = f.friend_id AND f2.friend_id = $1 AND f2.request_accepted = true
        );
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    console.error("Error fetching friends:", error);
    throw error;
  }
};

// Add a friend request
const addFriendRequest = async (userId, friend_id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start a transaction

    const query1 = `
      INSERT INTO "public"."Friends" (id, friend_id, request_accepted, created_at)
      VALUES ($1, $2, true, NOW());
    `;
    const query2 = `
      INSERT INTO "public"."Friends" (id, friend_id, request_accepted, created_at)
      VALUES ($2, $1, false, NOW());
    `;

    // Execute the first INSERT
    await client.query(query1, [userId, friend_id]);
    // Execute the second INSERT
    await client.query(query2, [userId, friend_id]);

    await client.query('COMMIT'); // Commit the transaction
    return { message: 'Friend request sent' };
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback the transaction on error
    console.error("Error sending friend request:", error);
    throw error;
  } finally {
    client.release(); // Release the database connection
  }
};

// Accept a friend request
const acceptFriendRequest = async (userId, friend_id, username, relatedUsername) => {


console.log("acceptFriendRequest",userId, friend_id, username, relatedUsername);

  try {
    const query = `
      UPDATE "public"."Friends"
      SET request_accepted = true
      WHERE id = $1 AND friend_id = $2;
    `;
    await pool.query(query, [friend_id , userId]);

    const checkQuery = `
      SELECT COUNT(*) AS match_count
      FROM "public"."Friends"
      WHERE 
        (id = $1 AND friend_id = $2 AND request_accepted = true)
        OR
        (id = $2 AND friend_id = $1 AND request_accepted = true);
    `;
    const { rows } = await pool.query(checkQuery, [userId, friend_id]);

    const matchCount = parseInt(rows[0].match_count, 10);

    if (matchCount === 2) {
      const client1 = clients.get(username);
      const client2 = clients.get(relatedUsername);

      if (client1) {
        client1.ws.send(JSON.stringify({ notification: { type: 'relationship_update', username: relatedUsername } }));
      }
      if (client2) {
        client2.ws.send(JSON.stringify({ notification: { type: 'relationship_update', username } }));
      }
    }

    return { message: 'Friend request accepted' };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

// Remove a friend
const removeFriend = async (userId, friend_id) => {
  try {
    const query = `
      DELETE FROM "public"."Friends"
      WHERE (id = $1 AND friend_id = $2)
         OR (id = $2 AND friend_id = $1);
    `;
    await pool.query(query, [userId, friend_id]);
    return { message: 'Friend removed' };
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

// Check the relationship status and direction between two users
const getFriendRelationship = async (userId, otherUserId) => {
  try {
    const query = `
      SELECT
        CASE
          WHEN (
            EXISTS (
              SELECT 1
              FROM "public"."Friends" f1
              WHERE f1.id = $1 AND f1.friend_id = $2 AND f1.request_accepted = true
            )
            AND EXISTS (
              SELECT 1
              FROM "public"."Friends" f2
              WHERE f2.id = $2 AND f2.friend_id = $1 AND f2.request_accepted = true
            )
          ) THEN 'friends'
          WHEN (
            EXISTS (
              SELECT 1
              FROM "public"."Friends" f1
              WHERE f1.id = $1 AND f1.friend_id = $2 AND f1.request_accepted = false
            )
          ) THEN 'sent'
          WHEN (
            EXISTS (
              SELECT 1
              FROM "public"."Friends" f1
              WHERE f1.id = $2 AND f1.friend_id = $1 AND f1.request_accepted = false
            )
          ) THEN 'received'
          ELSE 'none'
        END AS relationship
      FROM "public"."Friends"
      WHERE (id = $1 AND friend_id = $2)
         OR (id = $2 AND friend_id = $1);
    `;
    const { rows } = await pool.query(query, [userId, otherUserId]);
    return rows.length > 0 ? rows[0].relationship : 'none';
  } catch (error) {
    console.error('Error fetching friend relationship:', error);
    throw error;
  }
};

// Delete a friend request
const deleteFriendRequest = async (userId, friend_id) => {
  try {
    // First query: delete the friend request in one direction
    const query1 = `
      DELETE FROM "public"."Friends"
      WHERE id = $1 AND friend_id = $2;
    `;
    await pool.query(query1, [userId, friend_id]);

    // Second query: delete the friend request in the reverse direction
    const query2 = `
      DELETE FROM "public"."Friends"
      WHERE id = $2 AND friend_id = $1;
    `;
    await pool.query(query2, [userId, friend_id]);

    return { message: 'Friend request deleted' };
  } catch (error) {
    console.error('Error deleting friend request:', error);
    throw error;
  }
};


module.exports = {
  getFriends,
  addFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  removeFriend,
  getFriendRelationship,
};
