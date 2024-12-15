const { poolPromise } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const Notification = require('../models/Notification');
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

        console.log("here is the issue ?" + JSON.stringify(dogInfo));


   // Return both tokens
   res.json({ token, refreshToken, dogInfo });
        //res.json({ token });
    } catch (err) {
        res.status(500).send({ message: 'Error signing in', error: err.message });
    }
};


const getUsersAndDogs = async (username/*req, res*/) => {
    console.log(`[${new Date().toISOString()}] Entering getUsersAndDogs controller`);

    try {

        const {id} =  await UserModel.findUserByUsername(username);

        // Call the model function and exclude the userId
        const data = await UserModel.getUsersWithDogsExcludingUser(id);

        return  [ data, id];

        //res.status(200).json(data);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching users and dogs:`, error);
        //res.status(500).json({ message: 'Internal Server Error' });
    }
};



async function getUserNotifications(username/*req, res*/) {
    try {


        

        const { id}= await UserModel.findUserIdByUsername(username);

        //const userId = req.user.id; // assuming you have middleware to attach the userId
        const notifications = await Notification.getUserNotifications(id);




/*
const notificationTemplates = JSON.parse(
    fs.readFileSync(path.resolve(__dirname+'\\config\\', 'notifications.json'), 'utf-8')
  );*/

        // res.status(200).json(notifications);
        console.log("my god we went a long way"+ JSON.stringify(notifications));
        return notifications
    } catch (error) {
        res.status(500).json({ error: 'Error fetching notifications' });
    }
}


const updateUser = async (req, res) => {
    //await initPool();


    const { username, ...updatedFields } = req.body;


    console.log("courage !!"+username, updatedFields);

    // Mapping from request body keys to database column names


    //console.log("gimme some dreams"+setClauses);
    const {id} = await  UserModel.findUserByUsername(username);

  const result = await UserModel.updateUser( id, updatedFields);



  res.status(200).json({ success: true, message: 'User updated successfully' });

   // return result.rowsAffected; // Return number of updated rows
};


module.exports = {
    getUsers,
    findUserByUsername,
    signup,
    signin,
    getUsersAndDogs,
    getUserNotifications,
    updateUser
};
