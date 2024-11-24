const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends');

// Get all friends for a user
router.get('/:userId', friendsController.getFriends);

// Send a friend request
router.post('/request', friendsController.sendFriendRequest);

// Accept a friend request
router.post('/accept', friendsController.acceptFriendRequest);

// Remove a friend
router.delete('/remove', friendsController.removeFriend);

module.exports = router;
