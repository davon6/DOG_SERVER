const express = require('express');
const router = express.Router();
const friendsController = require('../controllers/friends');

// Get all friends for a user
router.get('/:userId', friendsController.getFriends);


router.post('/status', friendsController.getFriendStatuses);

//router.get('/status/:username', friendsController.getFriendStatuses);

// Send a friend request
router.post('/request', friendsController.sendFriendRequest);

// Accept a friend request
router.put('/accept', friendsController.acceptFriendRequest);

router.post('/delete', friendsController.deleteFriendRequest);

// Remove a friend
router.delete('/remove', friendsController.removeFriend);

module.exports = router;
