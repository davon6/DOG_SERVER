const friendsModel = require('../models/Friends');

// Get all friends for a specific user
const getFriends = async (req, res) => {
  const { userId } = req.params;
  try {
    const friends = await friendsModel.getFriends(userId);
    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
  const { userId, friendId } = req.body;
  try {
    const result = await friendsModel.addFriendRequest(userId, friendId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
  const { userId, friendId } = req.body;
  try {
    const result = await friendsModel.acceptFriendRequest(userId, friendId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove a friend
const removeFriend = async (req, res) => {
  const { userId, friendId } = req.body;
  try {
    const result = await friendsModel.removeFriend(userId, friendId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
};
