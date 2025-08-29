// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('gaming_tournament');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('tournaments');
db.createCollection('matches');
db.createCollection('transactions');
db.createCollection('friendships');
db.createCollection('friend_requests');
db.createCollection('anti_cheat_flags');
db.createCollection('notifications');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { sparse: true });

db.tournaments.createIndex({ "startTime": 1 });
db.tournaments.createIndex({ "status": 1 });
db.tournaments.createIndex({ "gameType": 1 });
db.tournaments.createIndex({ "createdBy": 1 });

db.matches.createIndex({ "tournamentId": 1 });
db.matches.createIndex({ "status": 1 });
db.matches.createIndex({ "startTime": 1 });

db.transactions.createIndex({ "userId": 1 });
db.transactions.createIndex({ "status": 1 });
db.transactions.createIndex({ "type": 1 });
db.transactions.createIndex({ "createdAt": 1 });

db.friendships.createIndex({ "user1Id": 1, "user2Id": 1 }, { unique: true });
db.friend_requests.createIndex({ "fromUserId": 1, "toUserId": 1 }, { unique: true });

db.anti_cheat_flags.createIndex({ "matchId": 1 });
db.anti_cheat_flags.createIndex({ "userId": 1 });
db.anti_cheat_flags.createIndex({ "status": 1 });

db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "isRead": 1 });
db.notifications.createIndex({ "createdAt": 1 });

// Create initial admin user
const adminUser = {
  _id: ObjectId(),
  username: "admin",
  email: "admin@gamingtournament.com",
  role: "admin",
  profile: {
    displayName: "System Administrator",
    bio: "Platform Administrator"
  },
  wallet: {
    balance: 0,
    currency: "BDT",
    transactions: []
  },
  stats: {
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    totalEarnings: 0,
    winRate: 0,
    rank: 0
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  isBanned: false
};

// Hash the password (in production, use proper hashing)
adminUser.password = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8qQqK"; // "admin123"

// Insert admin user if it doesn't exist
const existingAdmin = db.users.findOne({ email: adminUser.email });
if (!existingAdmin) {
  db.users.insertOne(adminUser);
  print("Admin user created successfully");
} else {
  print("Admin user already exists");
}

// Create system user for automated tournaments
const systemUser = {
  _id: ObjectId(),
  username: "system",
  email: "system@gamingtournament.com",
  role: "admin",
  profile: {
    displayName: "System Bot",
    bio: "Automated tournament creation system"
  },
  wallet: {
    balance: 0,
    currency: "BDT",
    transactions: []
  },
  stats: {
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    totalEarnings: 0,
    winRate: 0,
    rank: 0
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  isBanned: false
};

systemUser.password = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8qQqK";

const existingSystem = db.users.findOne({ email: systemUser.email });
if (!existingSystem) {
  db.users.insertOne(systemUser);
  print("System user created successfully");
} else {
  print("System user already exists");
}

print("MongoDB initialization completed successfully!");
