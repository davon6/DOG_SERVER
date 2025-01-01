// routes/notificationRoutes.js
const express = require('express');
const { getUserNotifications } = require('../controllers/userController');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { fetchUnreadNotifications } = require('../controllers/notifications');

// Get notifications for the authenticated user
//router.get('/notifications', getUserNotifications);
/*
router.post('/', (req, res) => {
    // This will catch POST requests to `/api/notifications`
    console.log("Received request to fetch notifications");
  });

  */
router.post('/notifications',verifyToken, async (req, res, next)   =>  {
    try {
      // Log the incoming request
      console.log("Received request to fetch notifications");
      console.log("Request body:", req.body);
  
      // Ensure `username` is present in the body
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
  
      // Fetch notifications
      const  notifications = await getUserNotifications(username);
  
      // Send the fetched notifications as the response
      return res.json(notifications);
    } catch (error) {
      console.error("Error in fetching notifications:", error);
      // Pass the error to the default Express error handler
      next(error);
    }
  });


  // Route to fetch unread notifications
router.get('/notifications/:userId/unread', verifyToken, fetchUnreadNotifications);

  
  
module.exports = router;