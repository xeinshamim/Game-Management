const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED'],
    default: 'PENDING'
  },
  message: {
    type: String,
    maxlength: 200
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  responseMessage: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Ensure unique friend requests
friendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

const friendshipSchema = new mongoose.Schema({
  user1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  user2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'BLOCKED'],
    default: 'ACTIVE'
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedAt: {
    type: Date
  },
  blockReason: {
    type: String,
    maxlength: 500
  },
  friendshipStartedAt: {
    type: Date,
    default: Date.now
  },
  lastInteractionAt: {
    type: Date,
    default: Date.now
  },
  interactionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure unique friendships
friendshipSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });

// Pre-save hook to ensure user1Id < user2Id for consistent ordering
friendshipSchema.pre('save', function(next) {
  if (this.user1Id.toString() > this.user2Id.toString()) {
    [this.user1Id, this.user2Id] = [this.user2Id, this.user1Id];
  }
  next();
});

// Method to check if users are friends
friendshipSchema.methods.areFriends = function() {
  return this.status === 'ACTIVE';
};

// Method to check if friendship is blocked
friendshipSchema.methods.isBlocked = function() {
  return this.status === 'BLOCKED';
};

// Method to block friendship
friendshipSchema.methods.block = function(blockedBy, reason) {
  this.status = 'BLOCKED';
  this.blockedBy = blockedBy;
  this.blockedAt = new Date();
  this.blockReason = reason;
  return this.save();
};

// Method to unblock friendship
friendshipSchema.methods.unblock = function() {
  this.status = 'ACTIVE';
  this.blockedBy = undefined;
  this.blockedAt = undefined;
  this.blockReason = undefined;
  return this.save();
};

// Method to update last interaction
friendshipSchema.methods.updateInteraction = function() {
  this.lastInteractionAt = new Date();
  this.interactionCount += 1;
  return this.save();
};

// Static method to get friends list for a user
friendshipSchema.statics.getFriendsList = function(userId) {
  return this.find({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: 'ACTIVE'
  }).populate('user1Id', 'username profile.displayName profile.avatar')
    .populate('user2Id', 'username profile.displayName profile.avatar');
};

// Static method to check if two users are friends
friendshipSchema.statics.areFriends = function(user1Id, user2Id) {
  return this.findOne({
    $or: [
      { user1Id: user1Id, user2Id: user2Id },
      { user1Id: user2Id, user2Id: user1Id }
    ],
    status: 'ACTIVE'
  });
};

// Static method to get blocked users for a user
friendshipSchema.statics.getBlockedUsers = function(userId) {
  return this.find({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    status: 'BLOCKED'
  }).populate('user1Id', 'username profile.displayName')
    .populate('user2Id', 'username profile.displayName');
};

// Static method to get mutual friends
friendshipSchema.statics.getMutualFriends = async function(user1Id, user2Id) {
  const user1Friends = await this.find({
    $or: [{ user1Id: user1Id }, { user2Id: user1Id }],
    status: 'ACTIVE'
  });
  
  const user2Friends = await this.find({
    $or: [{ user1Id: user2Id }, { user2Id: user2Id }],
    status: 'ACTIVE'
  });
  
  const user1FriendIds = user1Friends.map(f => 
    f.user1Id.toString() === user1Id.toString() ? f.user2Id : f.user1Id
  );
  
  const user2FriendIds = user2Friends.map(f => 
    f.user1Id.toString() === user2Id.toString() ? f.user2Id : f.user1Id
  );
  
  // Find common friend IDs
  const mutualFriendIds = user1FriendIds.filter(id => 
    user2FriendIds.some(friendId => friendId.toString() === id.toString())
  );
  
  return mutualFriendIds;
};

// Friend Request methods
friendRequestSchema.methods.accept = function(responseMessage = '') {
  this.status = 'ACCEPTED';
  this.respondedAt = new Date();
  this.responseMessage = responseMessage;
  return this.save();
};

friendRequestSchema.methods.reject = function(responseMessage = '') {
  this.status = 'REJECTED';
  this.respondedAt = new Date();
  this.responseMessage = responseMessage;
  return this.save();
};

friendRequestSchema.methods.block = function() {
  this.status = 'BLOCKED';
  this.respondedAt = new Date();
  return this.save();
};

// Static method to get pending friend requests for a user
friendRequestSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    toUserId: userId,
    status: 'PENDING'
  }).populate('fromUserId', 'username profile.displayName profile.avatar');
};

// Static method to get sent friend requests by a user
friendRequestSchema.statics.getSentRequests = function(userId) {
  return this.find({
    fromUserId: userId,
    status: 'PENDING'
  }).populate('toUserId', 'username profile.displayName profile.avatar');
};

// Static method to check if friend request exists
friendRequestSchema.statics.requestExists = function(fromUserId, toUserId) {
  return this.findOne({
    $or: [
      { fromUserId: fromUserId, toUserId: toUserId },
      { fromUserId: toUserId, toUserId: fromUserId }
    ]
  });
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);
const Friendship = mongoose.model('Friendship', friendshipSchema);

module.exports = {
  FriendRequest,
  Friendship
};
