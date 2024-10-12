const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');

router.get('/', userController.getUsers);

//router.post('/find', userController.findUserByUsername);  // Route to handle POST requests


router.post('/find', (req, res, next) => {
    console.log('Received POST request on /user/find'); // Debugging log

    console.log("Username from body: " + req.body.username)

    userController.findUserByUsername(req, res, next);
});



// Sign Up Route
//router.post('/signup', userController.signup);
router.post('/signup', (req, res, next) => {
  //  console.log('Received POST request on /signup'); // Debugging log
    userController.signup(req, res, next);
});

// Sign In Route
//router.post('/signin', verifyToken, userController.signin);

// This route should NOT have verifyToken
router.post('/signin', (req, res, next) => {
    console.log('Received POST request on /signin'); // Debugging log
    userController.signin(req, res, next); // Call signin controller directly
});


/*
// Protected route example
router.get('/profile', verifyToken, userController.getProfile); // Only accessible if the token is valid

*/

module.exports = router;
