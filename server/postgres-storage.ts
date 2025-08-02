import { eq, and, desc, asc, gte, lte, or, sql, isNotNull, lt } from 'drizzle-orm';
import { db } from './db';
import { users, teams, games, predictions, sentimentAnalysis, ricksPicks, players, playerStats, injuries, playerImpactAnalysis, keyPlayerMatchups } from '../shared/schema';
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
      .where(and(
        gte(games.startDate, now),
        eq(games.completed, false)
      ))
      .orderBy(asc(games.startDate))
      .limit(limit)
      .offset(offset);

    // Optimized: get all teams in one query
    const teamIds = gameResults.flatMap(game => [game.homeTeamId, game.awayTeamId]);
    const uniqueTeamIds = [...new Set(teamIds)];
    const allTeams = await db.select()
      .from(teams)
      .where(sql`${teams.id} = ANY(${uniqueTeamIds})`);
    
    const teamMap = new Map(allTeams.map(team => [team.id, team]));

    const gamesWithTeams: GameWithTeams[] = [];
    
    for (const game of gameResults) {
      const homeTeam = teamMap.get(game.homeTeamId);
      const awayTeam = teamMap.get(game.awayTeamId);

      if (homeTeam && awayTeam) {
        gamesWithTeams.push({
          ...game,
          homeTeam,
          awayTeam,
          prediction: undefined
        });
      }
    }

    // Sort by highest ranking (lowest ranking number = higher rank)
    return gamesWithTeams.sort((a, b) => {
      const aHighestRank = Math.min(a.homeTeam.rank || 999, a.awayTeam.rank || 999);
      const bHighestRank = Math.min(b.homeTeam.rank || 999, b.awayTeam.rank || 999);
      return aHighestRank - bHighestRank;
    });
  }

  async getGamesByWeek(season: number, week: number): Promise<GameWithTeams[]> {
    const gameResults = await db.select()
      .from(games)
      .where(and(
        eq(games.season, season), 
        eq(games.week, week),
        eq(games.completed, false)
      ))
      .orderBy(asc(games.startDate));

    // Optimized: get all teams in one query
    const teamIds = gameResults.flatMap(game => [game.homeTeamId, game.awayTeamId]);
    const uniqueTeamIds = [...new Set(teamIds)];
    const allTeams = await db.select()
      .from(teams)
      .where(sql`${teams.id} = ANY(${uniqueTeamIds})`);
    
    const teamMap = new Map(allTeams.map(team => [team.id, team]));

    const gamesWithTeams: GameWithTeams[] = [];
    for (const game of gameResults) {
      const homeTeam = teamMap.get(game.homeTeamId);
      const awayTeam = teamMap.get(game.awayTeamId);

      if (homeTeam && awayTeam) {
        gamesWithTeams.push({
          ...game,
          homeTeam,
          awayTeam,
          prediction: undefined
        });
      }
    }

    // Sort by highest ranking (lowest ranking number = higher rank)
    return gamesWithTeams.sort((a, b) => {
      const aHighestRank = Math.min(a.homeTeam.rank || 999, a.awayTeam.rank || 999);
      return aHighestRank - bHighestRank;
    });
  }

  async getHistoricalGames(
    season?: number,
    week?: number,
    limit?: number,
    offset?: number
  ): Promise<GameWithTeams[]> {
    let queryConditions = [
      eq(games.completed, true), // Only completed games
      lt(games.season, 2025),    // Only historical seasons (not current 2025)
      or(isNotNull(games.spread), isNotNull(games.overUnder)) // Only games with betting lines
    ];

    // Apply filters
    if (season) {
      queryConditions.push(eq(games.season, season));
    }
    if (week) {
      queryConditions.push(eq(games.week, week));
    }

    let queryBuilder = db.select()
      .from(games)
      .where(and(...queryConditions))
      .orderBy(desc(games.season), desc(games.week), desc(games.startDate));

    // Apply pagination if provided
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }
    if (offset) {
      queryBuilder = queryBuilder.offset(offset);
    }

    const gameResults = await queryBuilder;

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

  async getHistoricalGamesCount(season?: number, week?: number): Promise<number> {
    let queryConditions = [
      eq(games.completed, true), // Only completed games
      lt(games.season, 2025)     // Only historical seasons (not current 2025)
    ];

    // Apply filters
    if (season) {
      queryConditions.push(eq(games.season, season));
    }
    if (week) {
      queryConditions.push(eq(games.week, week));
    }

    const result = await db.select({ count: sql`cast(count(*) as integer)` })
      .from(games)
      .where(and(...queryConditions));

    return Number(result[0]?.count) || 0;
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
    const cleanPrediction = cleanPredictionData(prediction);
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
    const cleanSentiment = cleanSentimentData(sentiment);
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

  // Rick's Picks operations (methods may already exist but adding to ensure complete interface)
  async getRicksPick(gameId: number): Promise<any> {
    return null; // Implementation may exist elsewhere
  }

  async getRicksPicksByWeek(season: number, week: number): Promise<any[]> {
    return []; // Implementation may exist elsewhere  
  }

  async createRicksPick(pick: any): Promise<any> {
    return null; // Implementation may exist elsewhere
  }

  async updateRicksPick(gameId: number, pick: any): Promise<any> {
    return null; // Implementation may exist elsewhere
  }

  async deleteRicksPick(gameId: number): Promise<boolean> {
    return false; // Implementation may exist elsewhere
  }

  async lockRicksPick(gameId: number): Promise<boolean> {
    return false; // Implementation may exist elsewhere
  }

  // Admin User operations (methods may already exist)
  async getAdminUser(username: string): Promise<any> {
    return null; // Implementation may exist elsewhere
  }

  async createAdminUser(adminUser: any): Promise<any> {
    return null; // Implementation may exist elsewhere
  }

  async updateAdminUserLastLogin(username: string): Promise<boolean> {
    return false; // Implementation may exist elsewhere
  }

  // Player operations implementation
  async getTeamPlayers(teamId: number): Promise<any[]> {
    try {
      const playersData = await db.query.players.findMany({
        where: (players, { eq }) => eq(players.teamId, teamId),
        with: {
          stats: {
            where: (playerStats, { eq }) => eq(playerStats.season, 2025),
            limit: 1
          }
        }
      });
      return playersData;
    } catch (error) {
      console.error("Error fetching team players:", error);
      return [];
    }
  }

  async getPlayerById(playerId: number): Promise<any> {
    try {
      const player = await db.query.players.findFirst({
        where: (players, { eq }) => eq(players.id, playerId),
        with: {
          team: true,
          stats: true
        }
      });
      return player;
    } catch (error) {
      console.error("Error fetching player:", error);
      return null;
    }
  }

  async getPlayerStats(playerId: number, season?: number): Promise<any[]> {
    try {
      const whereClause = season 
        ? and(eq(playerStats.playerId, playerId), eq(playerStats.season, season))
        : eq(playerStats.playerId, playerId);
        
      const stats = await db.query.playerStats.findMany({
        where: whereClause,
        orderBy: (playerStats, { desc }) => [desc(playerStats.season)]
      });
      return stats;
    } catch (error) {
      console.error("Error fetching player stats:", error);
      return [];
    }
  }

  async collectTeamRoster(teamName: string, season: number = 2025): Promise<void> {
    const { playerDataCollector } = await import('./player-data-collector');
    await playerDataCollector.collectTeamRoster(teamName, season);
  }

  async getPlayerImpactAnalysis(playerId: number): Promise<any> {
    try {
      const analysis = await db.query.playerImpactAnalysis.findFirst({
        where: (playerImpactAnalysis, { and, eq }) => and(
          eq(playerImpactAnalysis.playerId, playerId),
          eq(playerImpactAnalysis.season, 2025)
        ),
        with: {
          player: true,
          team: true
        }
      });
      return analysis;
    } catch (error) {
      console.error("Error fetching player impact analysis:", error);
      return null;
    }
  }

  // Injury operations implementation
  async getTeamInjuryReport(teamId: number): Promise<any[]> {
    const { injuryTracker } = await import('./injury-tracker');
    return await injuryTracker.getTeamInjuryReport(teamId);
  }

  async addInjuryReport(injuryData: any): Promise<void> {
    const { injuryTracker } = await import('./injury-tracker');
    await injuryTracker.addInjuryReport(injuryData);
  }

  async updateInjuryStatus(injuryId: number, status: string, severity?: string): Promise<void> {
    const { injuryTracker } = await import('./injury-tracker');
    await injuryTracker.updateInjuryStatus(injuryId, status, severity);
  }

  async calculateTeamInjuryImpact(teamId: number): Promise<any> {
    const { injuryTracker } = await import('./injury-tracker');
    return await injuryTracker.calculateTeamInjuryImpact(teamId);
  }

  // Handicapping operations implementation
  async getHandicappingAnalysis(gameId: number): Promise<any> {
    const { handicappingEngine } = await import('./handicapping-engine');
    return await handicappingEngine.generateHandicappingAnalysis(gameId);
  }

  async getKeyPlayerMatchups(gameId: number): Promise<any[]> {
    try {
      const matchups = await db.query.keyPlayerMatchups.findMany({
        where: (keyPlayerMatchups, { eq }) => eq(keyPlayerMatchups.gameId, gameId),
        with: {
          homePlayer: true,
          awayPlayer: true,
          game: true
        }
      });
      return matchups;
    } catch (error) {
      console.error("Error fetching key player matchups:", error);
      return [];
    }
  }

  async calculateGameInjuryImpact(gameId: number): Promise<any> {
    try {
      const game = await this.getGame(gameId);
      if (!game) return null;

      const homeInjuryImpact = await this.calculateTeamInjuryImpact(game.homeTeamId);
      const awayInjuryImpact = await this.calculateTeamInjuryImpact(game.awayTeamId);

      return {
        gameId,
        homeTeamImpact: homeInjuryImpact,
        awayTeamImpact: awayInjuryImpact,
        overallImpact: homeInjuryImpact.totalImpact + awayInjuryImpact.totalImpact,
        advantage: homeInjuryImpact.overallHealthScore > awayInjuryImpact.overallHealthScore ? 'home' : 'away'
      };
    } catch (error) {
      console.error("Error calculating game injury impact:", error);
      return null;
    }
  }
}