const express = require('express');
const { body, param, query } = require('express-validator');
const socialController = require('../controllers/socialController');
const { cache } = require('../config/db');

const router = express.Router();

// Friend Management Routes
router.post('/friends/request', [
  body('fromUserId').isMongoId().withMessage('Invalid fromUserId'),
  body('toUserId').isMongoId().withMessage('Invalid toUserId')
], socialController.sendFriendRequest);

router.put('/friends/request/:requestId/respond', [
  param('requestId').isMongoId().withMessage('Invalid requestId'),
  body('action').isIn(['accept', 'reject']).withMessage('Invalid action'),
  body('userId').isMongoId().withMessage('Invalid userId')
], socialController.respondToFriendRequest);

router.get('/friends/requests/:userId', [
  param('userId').isMongoId().withMessage('Invalid userId'),
  query('status').optional().isIn(['pending', 'accepted', 'rejected', 'removed']).withMessage('Invalid status')
], cache(300), socialController.getFriendRequests);

router.get('/friends/list/:userId', [
  param('userId').isMongoId().withMessage('Invalid userId')
], cache(300), socialController.getFriendsList);

router.delete('/friends/:friendshipId', [
  param('friendshipId').isMongoId().withMessage('Invalid friendshipId'),
  body('userId').isMongoId().withMessage('Invalid userId')
], socialController.removeFriend);

// Leaderboard Routes
router.get('/leaderboard', [
  query('gameType').optional().isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2']).withMessage('Invalid gameType'),
  query('timeFrame').optional().isIn(['all', 'daily', 'weekly', 'monthly', 'seasonal']).withMessage('Invalid timeFrame'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
], cache(60), socialController.getLeaderboard);

router.post('/leaderboard/stats', [
  body('userId').isMongoId().withMessage('Invalid userId'),
  body('gameType').isIn(['BR_MATCH', 'CLASH_SQUAD', 'LONE_WOLF', 'CS_2_VS_2']).withMessage('Invalid gameType'),
  body('stats').isObject().withMessage('Stats must be an object'),
  body('stats.totalMatches').optional().isInt({ min: 0 }).withMessage('Total matches must be a positive integer'),
  body('stats.wins').optional().isInt({ min: 0 }).withMessage('Wins must be a positive integer'),
  body('stats.totalPrizeMoney').optional().isFloat({ min: 0 }).withMessage('Total prize money must be a positive number')
], socialController.updatePlayerStats);

// Notification Routes
router.get('/notifications/:userId', [
  param('userId').isMongoId().withMessage('Invalid userId'),
  query('status').optional().isIn(['all', 'unread', 'read']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], cache(60), socialController.getNotifications);

router.put('/notifications/:notificationId/read', [
  param('notificationId').isMongoId().withMessage('Invalid notificationId'),
  body('userId').isMongoId().withMessage('Invalid userId')
], socialController.markNotificationRead);

router.put('/notifications/:userId/read-all', [
  param('userId').isMongoId().withMessage('Invalid userId')
], socialController.markAllNotificationsRead);

router.delete('/notifications/:notificationId', [
  param('notificationId').isMongoId().withMessage('Invalid notificationId'),
  body('userId').isMongoId().withMessage('Invalid userId')
], socialController.deleteNotification);

module.exports = router;
