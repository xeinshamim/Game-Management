const FriendRequest = require('../models/Friend');
const Friendship = require('../models/Friend');
const LeaderboardEntry = require('../models/Leaderboard');
const Notification = require('../models/Notification');
const logger = require('../config/logger');

// Friend Request Management
const sendFriendRequest = async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    // Check if already friends
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1: fromUserId, user2: toUserId },
        { user1: toUserId, user2: fromUserId }
      ],
      status: 'active'
    });

    if (existingFriendship) {
      return res.status(400).json({ message: 'Users are already friends' });
    }

    const friendRequest = new FriendRequest({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'pending'
    });

    await friendRequest.save();

    // Create notification for recipient
    const notification = new Notification({
      userId: toUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'You have received a new friend request',
      data: { fromUserId, requestId: friendRequest._id },
      status: 'unread'
    });

    await notification.save();

    logger.info(`Friend request sent from ${fromUserId} to ${toUserId}`);
    res.status(201).json({ message: 'Friend request sent successfully', requestId: friendRequest._id });
  } catch (error) {
    logger.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, userId } = req.body; // action: 'accept' or 'reject'

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to respond to this request' });
    }

    if (action === 'accept') {
      friendRequest.status = 'accepted';
      await friendRequest.save();

      // Create friendship
      const friendship = new Friendship({
        user1: friendRequest.fromUser,
        user2: friendRequest.toUser,
        status: 'active',
        createdAt: new Date()
      });

      await friendship.save();

      // Create notification for sender
      const notification = new Notification({
        userId: friendRequest.fromUser,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: 'Your friend request has been accepted',
        data: { toUserId: friendRequest.toUser },
        status: 'unread'
      });

      await notification.save();

      logger.info(`Friend request accepted: ${requestId}`);
      res.json({ message: 'Friend request accepted', friendshipId: friendship._id });
    } else if (action === 'reject') {
      friendRequest.status = 'rejected';
      await friendRequest.save();

      // Create notification for sender
      const notification = new Notification({
        userId: friendRequest.fromUser,
        type: 'friend_request_rejected',
        title: 'Friend Request Rejected',
        message: 'Your friend request has been rejected',
        data: { toUserId: friendRequest.toUser },
        status: 'unread'
      });

      await notification.save();

      logger.info(`Friend request rejected: ${requestId}`);
      res.json({ message: 'Friend request rejected' });
    } else {
      res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    logger.error('Error responding to friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status = 'pending' } = req.query;

    const requests = await FriendRequest.find({
      toUser: userId,
      status: status
    }).populate('fromUser', 'username displayName profile.avatar');

    res.json(requests);
  } catch (error) {
    logger.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFriendsList = async (req, res) => {
  try {
    const { userId } = req.params;

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: 'active'
    }).populate('user1', 'username displayName profile.avatar stats')
      .populate('user2', 'username displayName profile.avatar stats');

    const friends = friendships.map(friendship => {
      const friend = friendship.user1._id.toString() === userId ? friendship.user2 : friendship.user1;
      return {
        userId: friend._id,
        username: friend.username,
        displayName: friend.displayName,
        avatar: friend.profile?.avatar,
        stats: friend.stats,
        friendshipId: friendship._id,
        friendsSince: friendship.createdAt
      };
    });

    res.json(friends);
  } catch (error) {
    logger.error('Error fetching friends list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const { userId } = req.body;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({ message: 'Friendship not found' });
    }

    if (![friendship.user1.toString(), friendship.user2.toString()].includes(userId)) {
      return res.status(403).json({ message: 'Unauthorized to remove this friendship' });
    }

    const otherUserId = friendship.user1.toString() === userId ? friendship.user2 : friendship.user1;

    // Update friend request status
    await FriendRequest.updateMany(
      {
        $or: [
          { fromUser: userId, toUser: otherUserId },
          { fromUser: otherUserId, toUser: userId }
        ]
      },
      { status: 'removed' }
    );

    // Remove friendship
    await Friendship.findByIdAndDelete(friendshipId);

    // Create notification for other user
    const notification = new Notification({
      userId: otherUserId,
      type: 'friend_removed',
      title: 'Friend Removed',
      message: 'A user has removed you from their friends list',
      data: { removedByUserId: userId },
      status: 'unread'
    });

    await notification.save();

    logger.info(`Friendship removed: ${friendshipId}`);
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    logger.error('Error removing friend:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Leaderboard Management
const getLeaderboard = async (req, res) => {
  try {
    const { gameType, timeFrame = 'all', limit = 100 } = req.query;

    let query = {};
    if (gameType) {
      query.gameType = gameType;
    }

    if (timeFrame !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeFrame) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'seasonal':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
      }
      
      if (startDate) {
        query.updatedAt = { $gte: startDate };
      }
    }

    const leaderboard = await LeaderboardEntry.find(query)
      .sort({ rank: 1 })
      .limit(parseInt(limit))
      .populate('userId', 'username displayName profile.avatar');

    res.json(leaderboard);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updatePlayerStats = async (req, res) => {
  try {
    const { userId, gameType, stats } = req.body;

    let leaderboardEntry = await LeaderboardEntry.findOne({
      userId,
      gameType
    });

    if (!leaderboardEntry) {
      leaderboardEntry = new LeaderboardEntry({
        userId,
        gameType,
        stats: { ...stats, totalMatches: 0, wins: 0, winRate: 0, totalPrizeMoney: 0 }
      });
    }

    // Update stats
    Object.assign(leaderboardEntry.stats, stats);
    
    // Calculate win rate
    if (leaderboardEntry.stats.totalMatches > 0) {
      leaderboardEntry.stats.winRate = (leaderboardEntry.stats.wins / leaderboardEntry.stats.totalMatches) * 100;
    }

    await leaderboardEntry.save();

    // Recalculate rankings for this game type
    await recalculateRankings(gameType);

    logger.info(`Player stats updated for user ${userId} in ${gameType}`);
    res.json({ message: 'Stats updated successfully' });
  } catch (error) {
    logger.error('Error updating player stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const recalculateRankings = async (gameType) => {
  try {
    const entries = await LeaderboardEntry.find({ gameType })
      .sort({ 'stats.totalPrizeMoney': -1, 'stats.winRate': -1, 'stats.totalMatches': -1 });

    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
      await entries[i].save();
    }

    logger.info(`Rankings recalculated for ${gameType}`);
  } catch (error) {
    logger.error('Error recalculating rankings:', error);
  }
};

// Notification Management
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status = 'all', limit = 50 } = req.query;

    let query = { userId };
    if (status !== 'all') {
      query.status = status;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(notifications);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to update this notification' });
    }

    notification.status = 'read';
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    await Notification.updateMany(
      { userId, status: 'unread' },
      { status: 'read' }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this notification' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  // Friend Management
  sendFriendRequest,
  respondToFriendRequest,
  getFriendRequests,
  getFriendsList,
  removeFriend,
  
  // Leaderboard Management
  getLeaderboard,
  updatePlayerStats,
  
  // Notification Management
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
};
