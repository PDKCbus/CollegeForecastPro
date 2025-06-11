import { eq, and, desc, asc, gte, lte, or, sql } from 'drizzle-orm';
import { db } from './db';
import { users, teams, games, predictions, sentimentAnalysis } from '../shared/schema';
import type {
  User, InsertUser,
  Team, InsertTeam,
  Game, InsertGame, GameWithTeams,
  Prediction, InsertPrediction,
  SentimentAnalysis, InsertSentimentAnalysis
} from '../shared/schema';
import type { IStorage } from './storage';
import { cleanTeamData, cleanGameData, cleanPredictionData, cleanSentimentData } from './data-cleaner';

export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.name, name)).limit(1);
    return result[0];
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.name));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const cleanTeam = cleanTeamData(team);
    const result = await db.insert(teams).values(cleanTeam).returning();
    return result[0];
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams)
      .set(teamUpdate)
      .where(eq(teams.id, id))
      .returning();
    return result[0];
  }

  // Game operations
  async getGame(id: number): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return result[0];
  }

  async getGameWithTeams(id: number): Promise<GameWithTeams | undefined> {
    const game = await this.getGame(id);
    if (!game) return undefined;

    const homeTeam = await this.getTeam(game.homeTeamId);
    const awayTeam = await this.getTeam(game.awayTeamId);
    const predictions = await this.getPredictionsByGame(game.id);

    if (!homeTeam || !awayTeam) return undefined;

    return {
      ...game,
      homeTeam,
      awayTeam,
      prediction: predictions[0] || undefined
    };
  }

  async getUpcomingGames(limit = 10, offset = 0): Promise<GameWithTeams[]> {
    const now = new Date();
    const gameResults = await db.select()
      .from(games)
      .where(gte(games.startDate, now))
      .orderBy(asc(games.startDate))
      .limit(limit)
      .offset(offset);

    const gamesWithTeams: GameWithTeams[] = [];
    for (const game of gameResults) {
      const homeTeam = await this.getTeam(game.homeTeamId);
      const awayTeam = await this.getTeam(game.awayTeamId);
      const predictions = await this.getPredictionsByGame(game.id);

      if (homeTeam && awayTeam) {
        gamesWithTeams.push({
          ...game,
          homeTeam,
          awayTeam,
          prediction: predictions[0] || undefined
        });
      }
    }

    return gamesWithTeams;
  }

  async getHistoricalGames(
    season?: number,
    week?: number,
    teamId?: number,
    conference?: string
  ): Promise<GameWithTeams[]> {
    const now = new Date();
    let queryConditions = [lte(games.startDate, now)];

    // Apply filters
    if (season) {
      queryConditions.push(eq(games.season, season));
    }
    if (week) {
      queryConditions.push(eq(games.week, week));
    }
    if (teamId) {
      queryConditions.push(or(eq(games.homeTeamId, teamId), eq(games.awayTeamId, teamId)));
    }

    const gameResults = await db.select()
      .from(games)
      .where(queryConditions.length > 0 ? and(...queryConditions) : sql`true`)
      .orderBy(desc(games.startDate));

    const gamesWithTeams: GameWithTeams[] = [];
    for (const game of gameResults) {
      const homeTeam = await this.getTeam(game.homeTeamId);
      const awayTeam = await this.getTeam(game.awayTeamId);
      const predictions = await this.getPredictionsByGame(game.id);

      if (homeTeam && awayTeam) {
        gamesWithTeams.push({
          ...game,
          homeTeam,
          awayTeam,
          prediction: predictions[0] || undefined
        });
      }
    }

    return gamesWithTeams;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const cleanGame = cleanGameData(game);
    const result = await db.insert(games).values(cleanGame).returning();
    return result[0];
  }

  async updateGame(id: number, gameUpdate: Partial<Game>): Promise<Game | undefined> {
    const result = await db.update(games)
      .set(gameUpdate)
      .where(eq(games.id, id))
      .returning();
    return result[0];
  }

  // Prediction operations
  async getPrediction(id: number): Promise<Prediction | undefined> {
    const result = await db.select().from(predictions).where(eq(predictions.id, id)).limit(1);
    return result[0];
  }

  async getPredictionsByGame(gameId: number): Promise<Prediction[]> {
    return await db.select().from(predictions).where(eq(predictions.gameId, gameId));
  }

  async createPrediction(prediction: InsertPrediction): Promise<Prediction> {
    // Ensure all optional fields are explicitly null instead of undefined
    const cleanPrediction = {
      ...prediction,
      confidence: prediction.confidence ?? null,
      predictedSpread: prediction.predictedSpread ?? null,
      predictedTotal: prediction.predictedTotal ?? null,
      notes: prediction.notes ?? null,
    };
    const result = await db.insert(predictions).values(cleanPrediction).returning();
    return result[0];
  }

  async updatePrediction(id: number, predictionUpdate: Partial<Prediction>): Promise<Prediction | undefined> {
    const result = await db.update(predictions)
      .set(predictionUpdate)
      .where(eq(predictions.id, id))
      .returning();
    return result[0];
  }

  // Sentiment Analysis operations
  async getSentimentAnalysis(id: number): Promise<SentimentAnalysis | undefined> {
    const result = await db.select().from(sentimentAnalysis).where(eq(sentimentAnalysis.id, id)).limit(1);
    return result[0];
  }

  async getSentimentByGame(gameId: number): Promise<SentimentAnalysis[]> {
    return await db.select()
      .from(sentimentAnalysis)
      .where(eq(sentimentAnalysis.gameId, gameId))
      .orderBy(desc(sentimentAnalysis.lastUpdated));
  }

  async getSentimentByTeam(teamId: number): Promise<SentimentAnalysis[]> {
    return await db.select()
      .from(sentimentAnalysis)
      .where(eq(sentimentAnalysis.teamId, teamId))
      .orderBy(desc(sentimentAnalysis.lastUpdated));
  }

  async createSentimentAnalysis(sentiment: InsertSentimentAnalysis): Promise<SentimentAnalysis> {
    // Ensure all optional fields are explicitly null instead of undefined
    const cleanSentiment = {
      ...sentiment,
      gameId: sentiment.gameId ?? null,
      teamId: sentiment.teamId ?? null,
      positiveCount: sentiment.positiveCount ?? 0,
      negativeCount: sentiment.negativeCount ?? 0,
      neutralCount: sentiment.neutralCount ?? 0,
      totalTweets: sentiment.totalTweets ?? 0,
      keywords: sentiment.keywords ?? null,
    };
    const result = await db.insert(sentimentAnalysis).values(cleanSentiment).returning();
    return result[0];
  }

  async updateSentimentAnalysis(id: number, sentimentUpdate: Partial<SentimentAnalysis>): Promise<SentimentAnalysis | undefined> {
    const result = await db.update(sentimentAnalysis)
      .set(sentimentUpdate)
      .where(eq(sentimentAnalysis.id, id))
      .returning();
    return result[0];
  }
}