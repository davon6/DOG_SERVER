const { poolPromise } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const fs = require('fs');
const path = require('path'); // Useful for resolving the path to the private key file

const privateKey = fs.readFileSync(path.join(__dirname, '../config/private.pem'), 'utf8');


const getUsers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM USER_DOG');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};


const findUserByUsername = async (req, res) => {
    try {
        console.log("findUserByUsername reached"); // For debugging

        // Access username from request body
        const username = req.body.username; // Get the username from the request body
        
        // Log the username to check if it's being received correctly
       // console.log("Username from body: " + username); 

        // Check if username is provided
        if (!username) {
            return res.status(400).send({ message: "Username is required." }); // Bad Request
        }

        const pool = await poolPromise;

        // Use a parameterized query to avoid SQL Injection
        const result = await pool.request()
            .input('username', username)  // Bind the username parameter
            .query('SELECT * FROM USER_DOG WHERE USER_NAME = @username');  // Use @username as a placeholder

        // Check if any user was found
        if (result.recordset.length === 0) {
            return res.status(404).send({ message: "User not found." }); // Not Found
        }

        res.json(result.recordset); // Send the result back
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};



// Sign Up Handler
const signup = async (req, res) => {
    const { username, email, password, dogName, dogColor, dogWeight, dogRace ,dogSize, dogAge, dogPersonality, dogHobbies } = req.body;

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user in the database
        const newUser = await UserModel.createUser(username, email, hashedPassword,  dogName, dogColor, dogWeight, dogRace ,dogSize, dogAge, dogPersonality, dogHobbies);
 
      //  console.log( 'User created successfully'+ newUser[0].userId  );

        const token = jwt.sign({userId: newUser[0].userId }, privateKey, { algorithm: 'RS256', expiresIn: '10s' });//1h

      //  console.log("here s your token")

         // Generate Refresh Token (longer expiration)
        const refreshToken = jwt.sign({ userId: newUser[0].userId }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });
       
        res.status(201).json({token, refreshToken});


//res.status(status).json(obj)
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};



// Sign In Handler
const signin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await UserModel.findUserByUsername(username);

        if (!user) return res.status(400).json({ message: 'Invalid username or password' });

        const isMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });
        // Generate JWT Token with RS256
        const token = jwt.sign({ userId: user.ID }, privateKey, { algorithm: 'RS256', expiresIn: '10s' });//1h

         // Generate Refresh Token (longer expiration)
        const refreshToken = jwt.sign({ userId: user.ID }, privateKey, { algorithm: 'RS256', expiresIn: '7d' });
        const dogInfo = await UserModel.findDogByUserId(user.id);

        delete dogInfo["USER_ID"];

   // Return both tokens
   res.json({ token, refreshToken, dogInfo });
        //res.json({ token });
    } catch (err) {
        res.status(500).send({ message: 'Error signing in', error: err.message });
    }
};


module.exports = {
    getUsers,
    findUserByUsername,
    signup,
    signin,
};
