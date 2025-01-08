const WebSocket = require('ws');

const clients = new Map();

const startWebSocketServer = (port) => {
    const wss = new WebSocket.Server({ port });

    wss.on('connection', (ws, req) => {
        const userId = req.url.split('?userId=')[1]; // Extract userId
        console.log(`Client connected: userId=${userId}`);

        // Store the client
        clients.set(userId, ws);

        ws.on('close', () => {
            console.log(`Client disconnected: userId=${userId}`);
            clients.delete(userId);
        });
    });

    return wss; // Return the server instance
};

module.exports = { startWebSocketServer, clients };
