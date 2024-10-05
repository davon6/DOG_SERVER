const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getUsers);

//router.post('/find', userController.findUserByUsername);  // Route to handle POST requests


router.post('/find', (req, res, next) => {
    console.log('Received POST request on /user/find'); // Debugging log

    console.log("Username from body: " + req.body.username)

    userController.findUserByUsername(req, res, next);
});

module.exports = router;
