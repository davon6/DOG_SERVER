const { clients, userLocations } = require('./state');


// Haversine formula to calculate distance between two coordinates
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
};

// Store user location
const updateLocation = (username, lat, long, id, dog, isConnected=true, date='none') => {
  userLocations.set(username, { lat, long, id, dog, isConnected, date });
};


// Find users within a radius
const findNearbyUsers = (username, lat, long, radius, userConnected) => {
  const nearbyUsers = [];
  console.log("inside findNearbyUsers and userConnected ", userConnected);
  for (const [otherUserName, { lat: otherLat, long: otherLong, isConnected: otherIsConnected}] of userLocations.entries()) {
console.log("--------------------->>>>>> otherUserName ", otherUserName);

    if (username !== otherUserName) {

        console.log("-------------------->>>>>>username !== otherUserName",otherUserName, lat, long, otherLat, otherLong);

      const distance = haversineDistance(lat, long, otherLat, otherLong);


      console.log("-------------------->>>>>>", distance, " and radius ", radius);
      if (distance <= radius) {

        console.log("haaaa there is someone");

        console.log("his/her name ----->>>>",otherUserName);

        console.log("his/her name ----->>>>",clients.get(otherUserName));

/*
        const clientData = clients.get(username);
        console.log(clientData.ws);      // WebSocket instance
        console.log(clientData.userId);
*/

        nearbyUsers.push({ username: otherUserName, lat: otherLat, long: otherLong, dog : clients.get(otherUserName).dog, isConnected:otherIsConnected });

        
      }
    }
     console.log("------>>>>> no   other users found near by")
  }

  return nearbyUsers;
};

// Remove user location
const removeLocation = (userId) => {
   
    const { lat, long, radius} = userLocations.get(userId);
  userLocations.delete(userId);

  return { lat, long};
};

const cleanupUserLocations = () => {
    console.log("Running cleanup for userLocations...");
  
    const currentTime = new Date(); // Current time
  
    for (const [username, userData] of userLocations.entries()) {
      const { date } = userData;
  
      if (date !== "none" && date instanceof Date) {
        const timeDifference = currentTime - date; // Difference in milliseconds
  
        // Check if the time difference exceeds 2 hours (2 * 60 * 60 * 1000 ms)
        if (timeDifference > 2 * 60 * 60 * 1000) {
          console.log(`Removing user ${username} from userLocations due to inactivity.`);
          userLocations.delete(username); // Remove the user from the hashmap
          clients.delete(username); 
        }
      }
    }
  
    console.log("Cleanup completed.");
  };
  
  // Schedule the cleanup function to run every hour

// Export the functions
module.exports = {
    cleanupUserLocations,
  updateLocation,
  findNearbyUsers,
  removeLocation,
  userLocations
};
