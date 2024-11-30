const friendsModel = require('../models/Friends');
const userController = require('../controllers/userController');
const userModel = require('../models/userModel');

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
  const { username, friendUsername } = req.body;


  const ids = await  userModel.findUsersByUsername(username, friendUsername);



  try {
    const result = await friendsModel.addFriendRequest(ids[0], ids[1]);
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

// Controller to get friend statuses for all users relative to a specific user
const getFriendStatuses = async (req, res) => {
  //const { username } = req.params;


  //console.log("continuons   "+ JSON.stringify( req.body));

  const { username } = req.body;

  try {
    // Fetch all users and their dogs
    const [allUsers, userId ] = await userController.getUsersAndDogs(username);

    // Map each user to their friend relationship status
    const friendStatuses = await Promise.all(
      allUsers.map(async (user) => {
       /* if (user.id === parseInt(userId)) {
          return { ...user, relationship: 'self' }; // Exclude self in results
        }
        */

        const relationship = await friendsModel.getFriendRelationship(userId, user.id);

        const { id, ...userWithoutId } = user;  // Destructure and omit the 'id' field

    return { ...userWithoutId, relationship };

 
      })
    );

    res.status(200).json(friendStatuses);
  } catch (error) {
    console.error('Error fetching friend statuses:', error);
    res.status(500).json({ error: 'Error fetching friend statuses' });
  }
};

module.exports = {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  getFriendStatuses
};
