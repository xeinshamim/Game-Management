const mongoose = require('mongoose');

const leaderboardEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  // Overall statistics
  totalMatches: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  totalLosses: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  // Tournament statistics
  tournamentsJoined: {
    type: Number,
    default: 0
  },
  tournamentsWon: {
    type: Number,
    default: 0
  },
  totalPrizeMoney: {
    type: Number,
    default: 0
  },
  // Match statistics
  totalKills: {
    type: Number,
    default: 0
  },
  totalDeaths: {
    type: Number,
    default: 0
  },
  totalAssists: {
    type: Number,
    default: 0
  },
  killDeathRatio: {
    type: Number,
    default: 0
  },
  // Game mode specific statistics
  brMatches: {
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    top3: { type: Number, default: 0 },
    avgPlace: { type: Number, default: 0 }
  },
  clashSquadMatches: {
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    top3: { type: Number, default: 0 },
    avgPlace: { type: Number, default: 0 }
  },
  loneWolfMatches: {
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    top3: { type: Number, default: 0 },
    avgPlace: { type: Number, default: 0 }
  },
  cs2v2Matches: {
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    top3: { type: Number, default: 0 },
    avgPlace: { type: Number, default: 0 }
  },
  // Ranking and points
  totalPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER'],
    default: 'BRONZE'
  },
  rankPoints: {
    type: Number,
    default: 0
  },
  // Streaks
  currentWinStreak: {
    type: Number,
    default: 0
  },
  bestWinStreak: {
    type: Number,
    default: 0
  },
  currentLoseStreak: {
    type: Number,
    default: 0
  },
  // Activity and engagement
  lastMatchAt: {
    type: Date
  },
  lastTournamentAt: {
    type: Date
  },
  daysActive: {
    type: Number,
    default: 0
  },
  // Social statistics
  friendsCount: {
    type: Number,
    default: 0
  },
  followersCount: {
    type: Number,
    default: 0
  },
  // Achievement badges
  badges: [{
    name: String,
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  // Seasonal statistics
  currentSeason: {
    seasonNumber: { type: Number, default: 1 },
    seasonPoints: { type: Number, default: 0 },
    seasonRank: { type: String, default: 'BRONZE' },
    seasonMatches: { type: Number, default: 0 },
    seasonWins: { type: Number, default: 0 }
  },
  // Historical data
  seasonHistory: [{
    seasonNumber: Number,
    seasonPoints: Number,
    seasonRank: String,
    seasonMatches: Number,
    seasonWins: Number,
    seasonEndDate: Date
  }]
}, {
  timestamps: true
});

// Indexes for performance
leaderboardEntrySchema.index({ totalPoints: -1 });
leaderboardEntrySchema.index({ winRate: -1 });
leaderboardEntrySchema.index({ killDeathRatio: -1 });
leaderboardEntrySchema.index({ rank: 1, rankPoints: -1 });
leaderboardEntrySchema.index({ 'currentSeason.seasonPoints': -1 });

// Pre-save hook to calculate derived statistics
leaderboardEntrySchema.pre('save', function(next) {
  // Calculate win rate
  if (this.totalMatches > 0) {
    this.winRate = (this.totalWins / this.totalMatches) * 100;
  }
  
  // Calculate kill-death ratio
  if (this.totalDeaths > 0) {
    this.killDeathRatio = this.totalKills / this.totalDeaths;
  }
  
  // Calculate average placement for each game mode
  if (this.brMatches.played > 0) {
    this.brMatches.avgPlace = this.calculateAveragePlacement(this.brMatches);
  }
  if (this.clashSquadMatches.played > 0) {
    this.clashSquadMatches.avgPlace = this.calculateAveragePlacement(this.clashSquadMatches);
  }
  if (this.loneWolfMatches.played > 0) {
    this.loneWolfMatches.avgPlace = this.calculateAveragePlacement(this.loneWolfMatches);
  }
  if (this.cs2v2Matches.played > 0) {
    this.cs2v2Matches.avgPlace = this.calculateAveragePlacement(this.cs2v2Matches);
  }
  
  // Update rank based on total points
  this.updateRank();
  
  next();
});

// Method to calculate average placement
leaderboardEntrySchema.methods.calculateAveragePlacement = function(gameModeStats) {
  // This is a simplified calculation - in production, you'd store actual placement data
  if (gameModeStats.played === 0) return 0;
  
  const totalPlacement = (gameModeStats.won * 1) + 
                        ((gameModeStats.top3 - gameModeStats.won) * 3) + 
                        ((gameModeStats.played - gameModeStats.top3) * 8);
  
  return totalPlacement / gameModeStats.played;
};

// Method to update rank based on total points
leaderboardEntrySchema.methods.updateRank = function() {
  if (this.totalPoints >= 10000) {
    this.rank = 'GRANDMASTER';
  } else if (this.totalPoints >= 8000) {
    this.rank = 'MASTER';
  } else if (this.totalPoints >= 6000) {
    this.rank = 'DIAMOND';
  } else if (this.totalPoints >= 4000) {
    this.rank = 'PLATINUM';
  } else if (this.totalPoints >= 2000) {
    this.rank = 'GOLD';
  } else if (this.totalPoints >= 1000) {
    this.rank = 'SILVER';
  } else {
    this.rank = 'BRONZE';
  }
};

// Method to add match result
leaderboardEntrySchema.methods.addMatchResult = function(matchType, placement, kills, deaths, assists, prizeMoney = 0) {
  this.totalMatches += 1;
  
  if (placement === 1) {
    this.totalWins += 1;
    this.currentWinStreak += 1;
    this.currentLoseStreak = 0;
    
    if (this.currentWinStreak > this.bestWinStreak) {
      this.bestWinStreak = this.currentWinStreak;
    }
  } else {
    this.totalLosses += 1;
    this.currentWinStreak = 0;
    this.currentLoseStreak += 1;
  }
  
  // Update game mode specific stats
  const gameModeKey = this.getGameModeKey(matchType);
  if (gameModeKey) {
    this[gameModeKey].played += 1;
    if (placement === 1) {
      this[gameModeKey].won += 1;
    }
    if (placement <= 3) {
      this[gameModeKey].top3 += 1;
    }
  }
  
  // Update overall stats
  this.totalKills += kills || 0;
  this.totalDeaths += deaths || 0;
  this.totalAssists += assists || 0;
  this.totalPrizeMoney += prizeMoney || 0;
  
  // Calculate points based on placement and performance
  const matchPoints = this.calculateMatchPoints(placement, kills, deaths, assists);
  this.totalPoints += matchPoints;
  
  // Update current season stats
  this.currentSeason.seasonMatches += 1;
  this.currentSeason.seasonPoints += matchPoints;
  if (placement === 1) {
    this.currentSeason.seasonWins += 1;
  }
  
  this.lastMatchAt = new Date();
  this.updateRank();
  
  return this.save();
};

// Method to get game mode key
leaderboardEntrySchema.methods.getGameModeKey = function(matchType) {
  const gameModeMap = {
    'BR_MATCH': 'brMatches',
    'CLASH_SQUAD': 'clashSquadMatches',
    'LONE_WOLF': 'loneWolfMatches',
    'CS_2VS2': 'cs2v2Matches'
  };
  return gameModeMap[matchType];
};

// Method to calculate match points
leaderboardEntrySchema.methods.calculateMatchPoints = function(placement, kills, deaths, assists) {
  let points = 0;
  
  // Placement points
  switch (placement) {
    case 1: points += 100; break;
    case 2: points += 75; break;
    case 3: points += 50; break;
    case 4: points += 25; break;
    case 5: points += 15; break;
    case 6: points += 10; break;
    case 7: points += 5; break;
    case 8: points += 2; break;
    default: points += 1;
  }
  
  // Performance points
  points += (kills || 0) * 10;
  points += (assists || 0) * 5;
  
  // Survival bonus (negative points for deaths)
  if (deaths > 0) {
    points -= (deaths - 1) * 2; // First death is free
  }
  
  return Math.max(0, points);
};

// Method to add tournament result
leaderboardEntrySchema.methods.addTournamentResult = function(placement, prizeMoney) {
  this.tournamentsJoined += 1;
  this.totalPrizeMoney += prizeMoney || 0;
  
  if (placement === 1) {
    this.tournamentsWon += 1;
  }
  
  this.lastTournamentAt = new Date();
  return this.save();
};

// Method to add badge
leaderboardEntrySchema.methods.addBadge = function(name, description, icon) {
  this.badges.push({
    name,
    description,
    icon,
    earnedAt: new Date()
  });
  return this.save();
};

// Method to update season
leaderboardEntrySchema.methods.updateSeason = function(newSeasonNumber) {
  // Archive current season
  if (this.currentSeason.seasonNumber > 0) {
    this.seasonHistory.push({
      seasonNumber: this.currentSeason.seasonNumber,
      seasonPoints: this.currentSeason.seasonPoints,
      seasonRank: this.currentSeason.seasonRank,
      seasonMatches: this.currentSeason.seasonMatches,
      seasonWins: this.currentSeason.seasonWins,
      seasonEndDate: new Date()
    });
  }
  
  // Reset current season
  this.currentSeason = {
    seasonNumber: newSeasonNumber,
    seasonPoints: 0,
    seasonRank: 'BRONZE',
    seasonMatches: 0,
    seasonWins: 0
  };
  
  return this.save();
};

// Static method to get top players
leaderboardEntrySchema.statics.getTopPlayers = function(limit = 100, sortBy = 'totalPoints') {
  const sortOptions = {};
  sortOptions[sortBy] = -1;
  
  return this.find()
    .sort(sortOptions)
    .limit(limit)
    .select('username displayName avatar totalPoints rank winRate totalMatches');
};

// Static method to get players by rank
leaderboardEntrySchema.statics.getPlayersByRank = function(rank, limit = 100) {
  return this.find({ rank })
    .sort({ totalPoints: -1 })
    .limit(limit)
    .select('username displayName avatar totalPoints rank winRate totalMatches');
};

// Static method to get seasonal leaderboard
leaderboardEntrySchema.statics.getSeasonalLeaderboard = function(seasonNumber, limit = 100) {
  return this.find({ 'currentSeason.seasonNumber': seasonNumber })
    .sort({ 'currentSeason.seasonPoints': -1 })
    .limit(limit)
    .select('username displayName avatar currentSeason.seasonPoints currentSeason.seasonRank currentSeason.seasonMatches');
};

// Static method to search players
leaderboardEntrySchema.statics.searchPlayers = function(searchTerm, limit = 20) {
  return this.find({
    $or: [
      { username: { $regex: searchTerm, $options: 'i' } },
      { displayName: { $regex: searchTerm, $options: 'i' } }
    ]
  })
    .sort({ totalPoints: -1 })
    .limit(limit)
    .select('username displayName avatar totalPoints rank winRate totalMatches');
};

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
