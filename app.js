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
const messagesRoutes = require('./routes/message');

const { setupRelationshipListener } = require('./services/friends');
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





const wss = new WebSocket.Server({ server/*, path: '/wsss' */});



wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Listen for messages from the client
  ws.on('message', (message) => {
    //console.log(`Received: ${message}`);
    const parsedMessage = JSON.parse(message);
    
    if (parsedMessage.type === 'heartbeat') {
      ws.send(JSON.stringify({ type: 'heartbeat', status: 'alive' })); // Respond to heartbeats
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});




// WebSocket connection handling
wss.on('connection', (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const username = url.searchParams.get('username'); // Safely extract 'username'

  if (username) {
    clients.set(username, ws);
    console.log(`User ${username} connected`);

  //  console.log("just checking", clients);
  } else {
    console.log('No username provided. Closing connection.');
    ws.close();
    return;
  }

  // Send a welcome message to the client
 // ws.send('Welcome to the WebSocket server!');

  // Listen for incoming messages
  ws.on('message', (message) => {
  //  console.log(`Received from ${username}:`, message.toString());
   // ws.send(`Server received: ${message}`);
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client ${username} disconnected`);
    clients.delete(username); // Remove the client from the Map
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${username}:`, err.message);
  });
  
});
   
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