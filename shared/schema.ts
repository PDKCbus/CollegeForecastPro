import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
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
  rank: integer("rank"),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
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

// Custom combined types for frontend use
export type GameWithTeams = Game & {
  homeTeam: Team;
  awayTeam: Team;
  prediction?: Prediction;
};
