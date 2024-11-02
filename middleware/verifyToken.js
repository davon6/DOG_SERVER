const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

//console.log("slooow  "+path.join(__dirname, '../config/public.pem'));

const publicKey = fs.readFileSync(path.join(__dirname, '../config/public.pem'), 'utf8');



const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(403).json({ message: 'Token is required' });
    }

    jwt.verify(token, publicKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.userId = decoded.userId; // Attach userId to request for further use
        next();
    });
};

module.exports = verifyToken;