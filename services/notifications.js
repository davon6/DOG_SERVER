const sql = require('mssql');
const { clients } = require('../wsServer');


const setupNotificationListener = () => {
    const request = new sql.Request();
/* SELECT id, userId
        FROM Notifications
        WHERE isRead = 0*/
    request.query(`
          SELECT 
    n.createdAt,
    n.id,
    n.type,
    n.isRead,
    u1.username AS username,
    u2.username AS relatedUsername
FROM 
    Notifications n
JOIN 
    Users u1 ON u1.id = n.userId
JOIN 
    Users u2 ON u2.id = n.relatedUserId
WHERE 
    n.wsSent IS NULL OR n.wsSent = 0;

    `
  //JOIN Users u2 ON u2.id = n.relatedUserId  
    //WHERE  n.isRead = 0
    , (err, result) => {
        if (err) {
            console.error('Error setting up query notification:', err);
            return;
        }
        //console.log('Query Notification triggered:', result.recordset);
        // console.log('Query Notification set up successfully');

        result.recordset.forEach(notification => {
            const { id,username } = notification;

         /*   console.log("so the servcie", username);

              console.log("and the client ",clients);*/
  
           const client = clients.get(username);

            if (client) {

//console.log("we got something !!! notif pulled");

                // Send notification to the WebSocket client
                client.send(JSON.stringify({ notification }));
                const updateRequest = new sql.Request();
                // Optionally mark notification as read
                updateRequest.query(`
                    UPDATE Notifications
                    SET wsSent = 1
                    WHERE id = ${id};
                `, (updateErr) => {
                    if (updateErr) {
                        console.error(`Failed to mark notification ${id} as read:`, updateErr);
                    } else {
                        console.log(`Notification ${id} marked as read.`);
                    }
                });
            }
        });

        // Re-subscribe after notification is triggered
        setupNotificationListener();
    });
};

module.exports = { setupNotificationListener };
