const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
//const sql = require('mssql');

// Import routes and services
const indexRouter = require('./routes/index');
const userRoutes = require('./routes/userRoutes');
const conversationsRoutes = require('./routes/conversations');
const friendsRoutes = require('./routes/friends');
const notificationRoutes = require('./routes/notification');
const { startWebSocketServer, clients } = require('./wsServer');
const { setupNotificationListener } = require('./services/notifications');
//const { setupMessageListener } = require('./services/message');
const messagesRoutes = require('./routes/message');
const UserModel = require('./models/userModel');
const { setupRelationshipListener } = require('./services/friends');

// FOR LATER const { addUserLocation, findUsersWithinRadius, removeUserLocation , initializeRedis} = require('./redis');
const { updateLocation, findNearbyUsers, removeLocation } = require('./localCache');


// Load environment variables
dotenv.config();

const app = express();

const cors = require('cors');
app.use(cors());


const http = require('http');
const WebSocket = require('ws')

const server = http.createServer(app);

//const clients = new Map();












/*

var service = express();

service.use(service.router);

service.get('/', function (req, res) {
  res.send('Hello World!')
});

var server = http.createServer(service);

*/

 

//initializeRedis();

const wss = new WebSocket.Server({ server/*, path: '/wsss' */});


// WebSocket connection handling
wss.on('connection', async (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const username = url.searchParams.get('username'); // Safely extract 'username'

  if (!username) {
    console.log('No username provided. Closing connection.');
    ws.close();
    return;
  }


  const {id} = await UserModel.findUserByUsername(username);

  const dog = await UserModel.findDogByUserId(id);



  // Store WebSocket client in the clients map
  clients.set(username, {ws, id, dog});
  console.log(`User ${username} connected`);

  // Send welcome message
  ws.send(JSON.stringify({ status: 'success', message: 'Welcome to the WebSocket server!' }));

  // Set up heartbeat handling
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      //ws.send(JSON.stringify({ type: 'heartbeat', status: 'alive' }));
    } else {
      clearInterval(heartbeatInterval); // Stop heartbeat when the connection is closed
    }
  }, 15000);

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
   //   console.log(`Message from ${username}: ${message}`);
      const data = JSON.parse(message);
/*
console.log("statin slow ----->");
console.log("statin slow ----->"+clients.get(username));
console.log("statin slow ----->"+clients.get(username).id);
console.log("statin slow ----->"+clients.get(username).dog);
console.log("statin slow ----->"+JSON.stringify(clients.get(username).dog));
*/
      let clientForLocalCache = clients.get(username)
      handleClientMessage(data, ws, username, clientForLocalCache.id, clientForLocalCache.dog);
    } catch (err) {
      console.error(`Error processing message from ${username}:`, err.message);
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid message format' }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client ${username} disconnected`);
    removeLocation(username); // Remove user location from cache
    clients.delete(username); // Remove client from the map
    clearInterval(heartbeatInterval); // Clear heartbeat interval
  });

  // Handle WebSocket errors
  ws.on('error', (err) => {
    console.error(`WebSocket error for ${username}:`, err.message);
  });
});

/**
 * Handle messages from the client
 * @param {Object} data - The parsed message data
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} username - The username of the client
 */
function handleClientMessage(data, ws, username, id, dog) {
  const { type, lat, long, radius } = data;

  switch (type) {
    case 'updateLocation': {
      // Update user location in the local cache
      if (lat == null || long == null) {
        ws.send(JSON.stringify({ status: 'error', message: 'Invalid location data' }));
        return;
      }

      updateLocation(username, lat, long, id, dog); // Add or update location in cache
      ws.send(JSON.stringify({ status: 'success', message: 'Location updated' }));

      // Optionally, find nearby users after updating location
      const nearbyUsers = findNearbyUsers(username, lat, long, radius|| 1);
      ws.send(JSON.stringify({notification : { type: 'userGeoLocated',  data: nearbyUsers }}));
      break;
    }

    case 'findNearby': {
      // Find users nearby
      if (lat == null || long == null || radius == null) {
        ws.send(JSON.stringify({ status: 'error', message: 'Invalid location or radius data' }));
        return;
      }

      const nearbyUsers = findNearbyUsers(username, lat, long, radius);
      ws.send(JSON.stringify({ status: 'success', message: 'Nearby users found', data: nearbyUsers }));
      break;
    }

    case 'heartbeat': {
      // Respond to heartbeat messages (optional, if needed)
      //ws.send(JSON.stringify({ status: 'success', message: 'Heartbeat received' }));
      break;
    }

    default: {
      ws.send(JSON.stringify({ status: 'error', message: 'Unknown command' }));
      break;
    }
  }
};

   
const { sql, config } = require('./config/db');
// Database configuration
// const dbConfig = {
//     user: process.env.DB_USER || 'yourUsername',
//     password: process.env.DB_PASSWORD || 'yourPassword',
//     server: process.env.DB_SERVER || 'yourServer',
//     database: process.env.DB_NAME || 'yourDatabase',
//     options: {
//         encrypt: true, // Use encryption for Azure or secure connections
//         enableArithAbort: true, // Resolve arithmetic abort issues in MSSQL
//     },
// };

// Middleware setup
app.use(logger('dev'));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Log incoming requests for debugging
app.use((req, res, next) => {
    console.log(`Request method: ${req.method}, URL: ${req.url}`);
    next();
});

// Routes setup
app.use('/', indexRouter);
app.use('/users', userRoutes);
app.use('/user', userRoutes); // Alternate route for user-related endpoints
app.use('/api/users', userRoutes); // Consistent API route for users
app.use('/api/conversations', conversationsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagesRoutes)
console.log('All routes registered');

// Start the server and connect to the database
const PORT = process.env.PORT || 3000;


// Start the relationship listener
setupRelationshipListener();
//setupMessageListener();


sql.connect(config)
    .then(() => {
        console.log('Connected to MSSQL');

        // Start WebSocket server
        const wsServer = startWebSocketServer(3001); // Using port 3001 for WebSocket server
        console.log('WebSocket server running on port 3001');

        // Set up Query Notifications for database
        setupNotificationListener();
        console.log('Database Query Notifications set up');
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Start Express server
/*
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT} and accessible from any network interface`);
});
*/ 
server.listen(3000, '172.20.10.2',() => {
  console.log('Server is running on http://localhost:3000');
  console.log('WebSocket endpoint available at ws://localhost:3000/wsss');
});

module.exports = app;
// '0.0.0.0'   172.20.10.2  127.0.0.1