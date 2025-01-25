const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const http = require('http');

// Import routes and services
const indexRouter = require('./routes/index');
const userRoutes = require('./routes/userRoutes');
const conversationsRoutes = require('./routes/conversations');
const friendsRoutes = require('./routes/friends');
const notificationRoutes = require('./routes/notification');
const messagesRoutes = require('./routes/message');

//const { setupNotificationListener } = require('./services/notifications');
//const { setupRelationshipListener } = require('./services/friends');
const { pool } = require('./config/db');
const { initializeWebSocketServer } = require('./wsServer');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messagesRoutes);

console.log('All routes registered');

// Initialize WebSocket server
initializeWebSocketServer(server);

// Start the relationship listener
//setupRelationshipListener();

// Database connection and startup
const PORT = process.env.PORT || 3000;
pool
    .connect()
    .then(client => {
        console.log('Connected to PostgreSQL');
        client.release(); // Release the client back to the pool
      //  setupNotificationListener(); // Setup any event listeners or logic after a successful connection
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
