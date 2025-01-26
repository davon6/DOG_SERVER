const WebSocket = require('ws');
const UserModel = require('./models/userModel');
const { cleanupUserLocations, updateLocation, findNearbyUsers, userLocations } = require('./localCache');

const { clients } = require('./state');

function initializeWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', async (ws, request) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const username = url.searchParams.get('username');

        if (!username) {
            console.log('No username provided. Closing connection.');
            ws.close();
            return;
        }

        // Handle reconnection if the user is already connected
        if (clients.has(username)) {
            const existingClient = clients.get(username);
            if (existingClient.ws.readyState === WebSocket.OPEN) {
                console.log(`Existing connection found for ${username}. Closing old connection.`);
                existingClient.ws.close();
            }
        }

        const { id } = await UserModel.findUserByUsername(username);

        console.log("lets postgre get the dog")

        const dog = await UserModel.findDogByUserId(id);


        console.log("we got the dog the dog")

        clients.set(username, { ws, id, dog, isConnected: true, date: 'none' });
        console.log(`User ${username} connected`);

        ws.send(JSON.stringify({ status: 'success', message: 'Welcome to the WebSocket server!' }));

        ws.on('message', (message) => handleClientMessage(message, ws, username));
        ws.on('close', () => handleClientDisconnect(username));
        ws.on('error', (err) => console.error(`WebSocket error for ${username}:`, err.message));
    });

    setInterval(cleanupUserLocations, 60 * 60 * 1000);
}


function handleClientMessage(message, ws, username) {
    try {
        const data = JSON.parse(message);
        const { type, lat, long, radius } = data;

        switch (type) {
            case 'updateLocation':
                if (lat == null || long == null) {
                    ws.send(JSON.stringify({ status: 'error', message: 'Invalid location data' }));
                    return;
                }

                const client = clients.get(username);
                updateLocation(username, lat, long, client.id, client.dog);
                ws.send(JSON.stringify({ status: 'success', message: 'Location updated' }));

                const nearbyUsers = findNearbyUsers(username, lat, long, radius || 1, true);
                ws.send(JSON.stringify({ notification: { type: 'userGeoLocated', data: nearbyUsers } }));

                nearbyUsers.forEach((nearbyUser) => {
                    const nearbyUserClient = clients.get(nearbyUser.username);
                
                    if (nearbyUserClient && nearbyUserClient.ws.readyState === WebSocket.OPEN) {
                        // Notify the nearby user
                        nearbyUserClient.ws.send(
                            JSON.stringify({
                                notification: {
                                    type: 'userGeoLocated',
                                    data: [{username: username, lat:lat, long:long,  dog: client.dog, isConnected:true }],
                                },
                            })
                        );
                    }
                });
                break;

            case 'findNearby':
                if (lat == null || long == null || radius == null) {
                    ws.send(JSON.stringify({ status: 'error', message: 'Invalid location or radius data' }));
                    return;
                }

                const usersNearby = findNearbyUsers(username, lat, long, radius, true);
                ws.send(JSON.stringify({ status: 'success', message: 'Nearby users found', data: usersNearby }));
                break;

            case 'heartbeat':
                // Optional: Handle heartbeat
                break;

            default:
                ws.send(JSON.stringify({ status: 'error', message: 'Unknown command' }));
                break;
        }
    } catch (err) {
        console.error(`Error processing message from ${username}:`, err.message);
        ws.send(JSON.stringify({ status: 'error', message: 'Invalid message format' }));
    }
}


function handleClientDisconnect(username) {
    console.log(`Client ${username} disconnected`);
    const existingData = clients.get(username);
    const existingDataLoc = userLocations.get(username);
    const date =  new Date();

    userLocations.set(username, {
        ...existingDataLoc,
        isConnected: false,
        date: date,
    });

    clients.set(username, {
        ...existingData,
        isConnected: false,
        date: date,
    });

    const { lat, long } = userLocations.get(username);
    UserModel.saveupUserLastLocation(username, lat, long);


    const nearbyUsers = findNearbyUsers(username, lat, long, 1, true);

                nearbyUsers.forEach((nearbyUser) => {
                    const nearbyUserClient = clients.get(nearbyUser.username);
                
                    if (nearbyUserClient && nearbyUserClient.ws.readyState === WebSocket.OPEN) {
                        // Notify the nearby user
                        nearbyUserClient.ws.send(
                            JSON.stringify({
                                notification: {
                                    type: 'userGeoLocated',
                                    data: [{username: username, lat:lat, long:long,  dog: existingData.dog, isConnected:false, date : date }],
                                },
                            })
                        );
                    }
                });

    console.log(`Saved ${username}'s last location`);
}

module.exports = { initializeWebSocketServer, clients };
