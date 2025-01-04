//const sql = require('mssql');
const { clients } = require('../wsServer');

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
  }};

const setupRelationshipListener = async () => {
    const pool = await initPool();//await sql.connect(/* your DB config */);

    // Query the Service Broker queue
    const query = `
        WAITFOR (
            RECEIVE TOP(1)
            CONVERT(NVARCHAR(MAX), message_body) AS MessageBody
            FROM RelationshipQueue
        ), TIMEOUT 5000; -- Wait for 5 seconds if no messages
    `;

    console.log("service running");

    try {
        const result = await pool.request().query(query);

        if (result.recordset.length > 0) {
            // Extract message from the queue
            const message = JSON.parse(result.recordset[0].MessageBody);
            const { userId1, userId2 } = message;

            console.log("the new firends , ",userId1, userId2)

            // Notify both users via WebSocket
            const client1 = clients.get(userId1);
            const client2 = clients.get(userId2);

            if (client1) {
                client1.send(JSON.stringify({ type: 'relationship_update', userId: userId2 }));
            }

            if (client2) {
                client2.send(JSON.stringify({ type: 'relationship_update', userId: userId1 }));
            }

            console.log(`Notified users ${userId1} and ${userId2} about the new relationship.`);
        }

        // Re-call the listener to handle the next message
        setupRelationshipListener();
    } catch (err) {
        console.error('Error in Relationship Listener:', err);
        setupRelationshipListener();
    }
};

module.exports = { setupRelationshipListener };
