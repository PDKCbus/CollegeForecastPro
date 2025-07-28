import { pgTable, text, varchar, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  mascot: text("mascot"),
  conference: text("conference"),
  division: text("division"),
  color: text("color"),
  altColor: text("alt_color"),
  logoUrl: text("logo_url"),
  rank: integer("rank"), // AP/Coaches Poll ranking (1-25)
  weeklyRank: integer("weekly_rank"), // Ranking for specific week
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  // ELO Rating System
  eloRating: real("elo_rating").default(1500), // Starting ELO rating
  eloChange: real("elo_change").default(0), // Recent ELO change
  currentEloRating: real("current_elo_rating"), // CFBD authentic ELO rating
  // Team Performance Analytics
  totalYardsPerGame: real("total_yards_per_game").default(0),
  passingYardsPerGame: real("passing_yards_per_game").default(0),
  rushingYardsPerGame: real("rushing_yards_per_game").default(0),
  pointsPerGame: real("points_per_game").default(0),
  pointsAllowedPerGame: real("points_allowed_per_game").default(0),
  turnoverDifferential: real("turnover_differential").default(0),
  thirdDownConversion: real("third_down_conversion").default(0), // Percentage
  redZoneEfficiency: real("red_zone_efficiency").default(0), // Percentage
  strengthOfSchedule: real("strength_of_schedule").default(0),
  // Momentum and Streak Analysis
  winStreak: integer("win_streak").default(0),
  lossStreak: integer("loss_streak").default(0),
  momentumScore: real("momentum_score").default(0), // Calculated momentum
  last5Games: text("last_5_games"), // W-L-W-W-L format
  // Injury Impact
  injuryCount: integer("injury_count").default(0),
  keyPlayersInjured: text("key_players_injured").array(),
  injuryImpactScore: real("injury_impact_score").default(0), // 0-10 scale
  // Recruiting Class Data
  recruitingClassRank: integer("recruiting_class_rank"),
  avgRecruitRating: real("avg_recruit_rating").default(0), // 247Sports composite
  recruitingScore: real("recruiting_score").default(0), // Overall recruiting impact
  // Advanced Metrics
  sagRating: real("sag_rating").default(0), // Sagarin rating
  srsRating: real("srs_rating").default(0), // Simple Rating System
  sosRating: real("sos_rating").default(0), // Strength of Schedule rating
  // Season tracking
  season: integer("season").default(2025),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  stadium: text("stadium"),
  location: text("location"),
  spread: real("spread"),
  overUnder: real("over_under"),
  homeTeamScore: integer("home_team_score"),
  awayTeamScore: integer("away_team_score"),
  completed: boolean("completed").default(false),
  season: integer("season").notNull(),
  week: integer("week").notNull(),
  isConferenceGame: boolean("is_conference_game").default(false),
  isRivalryGame: boolean("is_rivalry_game").default(false),
  isFeatured: boolean("is_featured").default(false),
  // Weather data
  temperature: real("temperature"), // Fahrenheit
  windSpeed: real("wind_speed"), // MPH
  windDirection: text("wind_direction"), // N, NE, E, SE, S, SW, W, NW
  humidity: real("humidity"), // Percentage
  precipitation: real("precipitation"), // Inches
  weatherCondition: text("weather_condition"), // Clear, Cloudy, Rain, Snow, etc.
  isDome: boolean("is_dome").default(false),
  weatherImpactScore: real("weather_impact_score"), // Calculated impact on game
  // CFBD ELO Integration
  homePregameElo: real("home_pregame_elo"), // Home team ELO before game
  awayPregameElo: real("away_pregame_elo"), // Away team ELO before game
  homePostgameElo: real("home_postgame_elo"), // Home team ELO after game
  awayPostgameElo: real("away_postgame_elo"), // Away team ELO after game
  homeWinProbability: real("home_win_probability"), // CFBD calculated win probability
  awayWinProbability: real("away_win_probability"), // CFBD calculated win probability
  // Team Rankings for the week
  homeTeamRank: integer("home_team_rank"), // Home team AP ranking (1-25, null if unranked)
  awayTeamRank: integer("away_team_rank"), // Away team AP ranking (1-25, null if unranked)
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  predictedWinnerId: integer("predicted_winner_id").notNull(),
  confidence: real("confidence"),
  predictedSpread: real("predicted_spread"),
  predictedTotal: real("predicted_total"),
  notes: text("notes"),
});

export const sentimentAnalysis = pgTable("sentiment_analysis", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id),
  teamId: integer("team_id").references(() => teams.id),
  sentimentScore: real("sentiment_score").notNull(), // -1 to 1
  positiveCount: integer("positive_count").default(0).notNull(),
  negativeCount: integer("negative_count").default(0).notNull(),
  neutralCount: integer("neutral_count").default(0).notNull(),
  totalTweets: integer("total_tweets").default(0).notNull(),
  keywords: text("keywords").array(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
  analysisType: text("analysis_type").notNull() // 'team' or 'game'
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTeamSchema = createInsertSchema(teams);

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
});

export const insertSentimentAnalysisSchema = createInsertSchema(sentimentAnalysis).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

export type InsertSentimentAnalysis = z.infer<typeof insertSentimentAnalysisSchema>;
export type SentimentAnalysis = typeof sentimentAnalysis.$inferSelect;

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  position: text("position"),
  number: integer("number"),
  year: text("year"), // Freshman, Sophomore, Junior, Senior
  height: text("height"),
  weight: integer("weight"),
  hometown: text("hometown"),
  highSchool: text("high_school"),
  active: boolean("active").default(true),
});

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  gameId: integer("game_id").references(() => games.id),
  season: integer("season").notNull(),
  
  // Offensive Stats
  rushingYards: integer("rushing_yards").default(0),
  rushingAttempts: integer("rushing_attempts").default(0),
  rushingTouchdowns: integer("rushing_touchdowns").default(0),
  passingYards: integer("passing_yards").default(0),
  passingAttempts: integer("passing_attempts").default(0),
  passingCompletions: integer("passing_completions").default(0),
  passingTouchdowns: integer("passing_touchdowns").default(0),
  passingInterceptions: integer("passing_interceptions").default(0),
  receivingYards: integer("receiving_yards").default(0),
  receptions: integer("receptions").default(0),
  receivingTouchdowns: integer("receiving_touchdowns").default(0),
  
  // Defensive Stats
  tackles: integer("tackles").default(0),
  sacks: real("sacks").default(0),
  interceptions: integer("interceptions").default(0),
  passBreakups: integer("pass_breakups").default(0),
  fumblesRecovered: integer("fumbles_recovered").default(0),
  
  // Special Teams
  fieldGoalsMade: integer("field_goals_made").default(0),
  fieldGoalsAttempted: integer("field_goals_attempted").default(0),
  extraPointsMade: integer("extra_points_made").default(0),
  extraPointsAttempted: integer("extra_points_attempted").default(0),
  puntingYards: integer("punting_yards").default(0),
  puntingAttempts: integer("punting_attempts").default(0),
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const teamSeasonStats = pgTable("team_season_stats", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  season: integer("season").notNull(),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  conferenceWins: integer("conference_wins").default(0),
  conferenceLosses: integer("conference_losses").default(0),
  
  // Offensive Stats
  totalOffenseYards: integer("total_offense_yards").default(0),
  rushingYards: integer("rushing_yards").default(0),
  passingYards: integer("passing_yards").default(0),
  pointsScored: integer("points_scored").default(0),
  
  // Defensive Stats
  totalDefenseYards: integer("total_defense_yards").default(0),
  rushingYardsAllowed: integer("rushing_yards_allowed").default(0),
  passingYardsAllowed: integer("passing_yards_allowed").default(0),
  pointsAllowed: integer("points_allowed").default(0),
  
  // Advanced Metrics
  turnoverMargin: integer("turnover_margin").default(0),
  thirdDownConversion: real("third_down_conversion").default(0),
  redZoneConversion: real("red_zone_conversion").default(0),
  
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Insert schemas for new tables
export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  lastUpdated: true,
});

export const insertTeamSeasonStatsSchema = createInsertSchema(teamSeasonStats).omit({
  id: true,
  lastUpdated: true,
});

// Types for new tables
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;

export type InsertTeamSeasonStats = z.infer<typeof insertTeamSeasonStatsSchema>;
export type TeamSeasonStats = typeof teamSeasonStats.$inferSelect;

// Custom combined types for frontend use  
export type GameWithTeams = Game & {
  homeTeam: Team;
  awayTeam: Team;
  prediction?: Prediction;
  ricksPicks?: RicksPick[];
};

export type PlayerWithStats = Player & {
  stats?: PlayerStats[];
  team: Team;
};

export type TeamWithSeasonStats = Team & {
  seasonStats?: TeamSeasonStats;
};

// Rick's Manual Picks - Admin Override System
export const ricksPicks = pgTable("ricks_picks", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().references(() => games.id),
  week: integer("week").notNull(),
  season: integer("season").notNull(),
  
  // Rick's personal picks (overrides algorithm)
  spreadPick: varchar("spread_pick", { length: 50 }), // "HOME -3.5", "AWAY +7", "NO PLAY"
  spreadConfidence: integer("spread_confidence").notNull().default(50), // 1-100
  totalPick: varchar("total_pick", { length: 50 }), // "OVER 45.5", "UNDER 52", "NO PLAY"
  totalConfidence: integer("total_confidence").notNull().default(50), // 1-100
  
  // Rick's personal notes and reasoning
  personalNotes: text("personal_notes"),
  keyFactors: text("key_factors").array().default([]), // ["Weather advantage", "Revenge game", etc.]
  
  // Pick metadata
  isLocked: boolean("is_locked").default(false), // Can't edit after game starts
  expectedValue: real("expected_value").default(0), // Rick's expected betting value
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin users for Rick's access
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"), // "admin", "editor"
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for Rick's picks
export const insertRicksPickSchema = createInsertSchema(ricksPicks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

// Types for Rick's picks
export type RicksPick = typeof ricksPicks.$inferSelect;
export type InsertRicksPick = z.infer<typeof insertRicksPickSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
