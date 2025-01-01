const { getUnreadNotifications } = require('../models/Notification');

const fetchUnreadNotifications = async (req, res) => {
    const userId = req.params.userId;

    try {
        const result = await getUnreadNotifications(userId);
        res.status(200).json({ notifications: result.recordset });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

module.exports = { fetchUnreadNotifications };
