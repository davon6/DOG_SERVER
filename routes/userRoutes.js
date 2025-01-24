const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/verifyToken');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const privateKey = fs.readFileSync(path.join(__dirname, '../config/private.pem'), 'utf8');


router.get('/', userController.getUsers);

//router.post('/find', userController.findUserByUsername);  // Route to handle POST requests


router.post('/find', verifyToken, (req, res, next) => {
    console.log('Received POST request on /user/find'); // Debugging log

    console.log("Username from body: " + req.body.username)

    userController.findUserByUsername(req, res, next);
});


/*

good comment to keep !

router.post('/update', verifyToken, (req, res, next) => {
    console.log('Received POST request on /user/update'); // Debugging log
    userController.updateUser(req, res, next);
});
*/

router.post('/update',verifyToken,  userController.updateUser);


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


// Refresh token endpoint
router.post('/token/refresh', (req, res) => {
    // Extract refreshToken directly from req.body
    const { refreshToken } = req.body;

    //console.log("the refresh token req.body.refreshToken: ", refreshToken);

    if (!refreshToken) {
        console.log("token refresh NOT detected properly");
        return res.sendStatus(401);  // No refresh token provided
    }

    console.log("token refresh detected properly");

    // Pass the refreshToken directly to jwt.verify
    jwt.verify(refreshToken, privateKey, { algorithm: 'RS256' }, (err, user) => {
        if (err) {
            console.log("Error verifying refresh token:", err);
            return res.sendStatus(403);  // Invalid refresh token
        }

        console.log("Refresh token verified, generating new access token");

        // If the token is valid, generate a new access token
        const accessToken = jwt.sign({ userId: user.userId }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });//15m

        // Send the new access token as JSON
        return res.json({ accessToken });
    });
});
/*
router.post('/dogs', async (req, res) => {
    try {
        console.log('Request Body:', req.body);
       // await userController.getUsersAndDogs(req, res); // Let the controller handle the response
    } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error' }); // Only send a response if none has been sent
        }
    }
});
*/


/*
router.get('/dogs', userController.getUsersAndDogs);
*/

router.post('/dogs', (req, res, next) => {

    console.log(`[${new Date().toISOString()}] Received POST request on /dogs`);
    console.log('Request Body:', req.body); // Log the request body for debugging
    userController.getUsersAndDogs(req, res, next); // Call the updated controller
});


router.post('/signOut', verifyToken, (req, res, next) => {

    console.log(`[${new Date().toISOString()}] Received POST request on /signOut`);
    //console.log('Request Body:', req.body); // Log the request body for debugging
    userController.signout(req, res, next); // Call the updated controller
});

/*
// Protected route example
router.get('/profile', verifyToken, userController.getProfile); // Only accessible if the token is valid

*/

module.exports = router;
