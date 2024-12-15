const friendsModel = require('../models/Friends');
const userController = require('../controllers/userController');
const userModel = require('../models/userModel');
const notificationsModel = require('../models/Notification');

// Get all friends for a specific user
const getFriends = async (req, res) => {
  const { username } = req.body;

  const { id } =  await userModel.findUserByUsername(username);


console.log("soooo what now ?"+JSON.stringify(id));

  try {
    const friends = await friendsModel.getFriends(id);


    console.log("soooo what now friends ?"+JSON.stringify(friends));

    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
  const { username, friendUsername } = req.body;

  console.log("sooooooooo sendfreindrequest ",username, friendUsername);

  const ids = await  userModel.findUsersByUsername(username, friendUsername);



  try {
    const result = await friendsModel.addFriendRequest(ids[0], ids[1]);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const acceptFriendRequest = async (req, res) => {
  const { username, relatedUsername, notificationId } = req.body; // Include notificationId in the request


console.log("processing acceptance friend request",  username, relatedUsername, notificationId);


  const ids =  await  userModel.findUsersByUsername( username, relatedUsername);

  try {
    // Accept the friend request
    const result = await friendsModel.acceptFriendRequest(ids[0], ids[1]);

    // Mark the notification as read
    await notificationsModel.updateNotificationResponse(notificationId, 'accept');

    res.status(200).json({ message: 'Friend request accepted and notification marked as read', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const deleteFriendRequest = async (req, res) => {
  const { username, relatedUsername, notificationId } = req.body; // Include notificationId in the request
  try {

    console.log("back to bqsics "+ JSON.stringify(req.body));

    const ids =  await  userModel.findUsersByUsername( username, relatedUsername);
    // Delete the friend request
    const result = await friendsModel.deleteFriendRequest(ids[1], ids[0]);

    // Mark the notification as read
    await notificationsModel.updateNotificationResponse(notificationId, 'decline');

    res.status(200).json({ message: 'Friend request declined and notification marked as read', result });
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
// Controller to get friend statuses for all users relative to a specific user
const getFriendStatuses = async (req, res) => {
  const { username } = req.body;

  try {
    // Fetch all users and their dogs
    const [allUsers, userId] = await userController.getUsersAndDogs(username);

    // Map each user to their friend relationship status
    const friendStatuses = await Promise.all(
      allUsers.map(async (user) => {
        const relationship = await friendsModel.getFriendRelationship(userId, user.id);

        const { id, ...userWithoutId } = user; // Destructure and omit the 'id' field
        console.log("-->"+ JSON.stringify({ ...userWithoutId, relationship }));
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
  deleteFriendRequest,
  removeFriend,
  getFriendStatuses
};
