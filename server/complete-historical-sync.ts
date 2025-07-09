/**
 * Complete Historical Sync - Collect ALL completed games with scores
 * The problem: We only have 251 games when we should have thousands from each season
 * The solution: Properly sync ALL completed games from each historical season
 */

import { storage } from './storage';
import { InsertGame, InsertTeam } from '../shared/schema';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  homeTeam: string;
  homeConference?: string;
  homeDivision?: string;
  homePoints?: number;
  homeLineScores?: number[];
  awayTeam: string;
  awayConference?: string;
  awayDivision?: string;
  awayPoints?: number;
  awayLineScores?: number[];
  completed?: boolean;
  neutral_site_game?: boolean;
  conference_game_flag?: boolean;
  excitement_index?: number;
  highlights?: string;
  notes?: string;
}

interface CFBDBettingLine {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  away_team: string;
  lines: Array<{
    provider: string;
    spread?: number;
    over_under?: number;
    home_moneyline?: number;
    away_moneyline?: number;
  }>;
}

export class CompleteHistoricalSync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamCache = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY is required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.append(key, value.toString());
    });

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async ensureTeamExists(teamName: string): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    const existingTeam = await storage.getTeamByName(teamName);
    if (existingTeam) {
      this.teamCache.set(teamName, existingTeam.id);
      return existingTeam.id;
    }

    const newTeam: InsertTeam = {
      name: teamName,
      conference: 'Unknown',
      division: null,
      logo: '',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      wins: 0,
      losses: 0,
      ranking: null
    };

    const createdTeam = await storage.createTeam(newTeam);
    this.teamCache.set(teamName, createdTeam.id);
    return createdTeam.id;
  }

  /**
   * Sync ALL completed games for a specific season
   * This should get hundreds/thousands of games per season, not just a few
   */
  async syncAllCompletedGamesForSeason(season: number): Promise<void> {
    console.log(`📅 Syncing ALL completed games for ${season} season...`);

    // Get ALL games for this season (regular season)
    const allGames = await this.makeRequest<CFBDGame>('/games', {
      year: season,
      seasonType: 'regular'
    });

    console.log(`📊 Found ${allGames.length} total games for ${season} season`);

    // Filter to only games with actual scores (these are completed)
    const completedGames = allGames.filter(game => 
      game.homePoints !== null && 
      game.awayPoints !== null &&
      game.homePoints !== undefined && 
      game.awayPoints !== undefined &&
      typeof game.homePoints === 'number' &&
      typeof game.awayPoints === 'number'
    );

    console.log(`🏈 Found ${completedGames.length} completed games with scores`);

    // Get betting lines for this season
    let bettingLines: CFBDBettingLine[] = [];
    try {
      bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', {
        year: season,
        seasonType: 'regular'
      });
      console.log(`💰 Found ${bettingLines.length} betting lines for ${season}`);
    } catch (error) {
      console.warn(`⚠️  Could not get betting lines for ${season}:`, error);
    }

    // Create lookup map for betting lines
    const linesMap = new Map<string, CFBDBettingLine>();
    bettingLines.forEach(line => {
      const key = `${line.home_team}-${line.away_team}-${line.week}`;
      linesMap.set(key, line);
    });

    let processedGames = 0;
    let gamesWithBettingLines = 0;
    let insertedGames = 0;
    let updatedGames = 0;

    for (const game of completedGames) {
      try {
        const homeTeamId = await this.ensureTeamExists(game.homeTeam);
        const awayTeamId = await this.ensureTeamExists(game.awayTeam);

        // Find betting lines for this game
        const lineKey = `${game.homeTeam}-${game.awayTeam}-${game.week}`;
        const bettingLine = linesMap.get(lineKey);
        
        let spread = null;
        let overUnder = null;

        if (bettingLine && bettingLine.lines.length > 0) {
          // Use first available line (could be improved to use consensus)
          const line = bettingLine.lines[0];
          spread = line.spread || null;
          overUnder = line.over_under || null;
          gamesWithBettingLines++;
        }

        // Skip games where home and away team are the same (invalid data)
        if (homeTeamId === awayTeamId) {
          console.log(`⚠️ Skipping invalid game: ${game.homeTeam} vs ${game.awayTeam} (same team ID)`);
          continue;
        }

        // Validate and fix start date
        let startDate: Date;
        try {
          startDate = new Date(game.start_date);
          if (isNaN(startDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (error) {
          console.log(`⚠️ Invalid date for game ${game.id}, using default`);
          startDate = new Date(`${game.season}-09-01T12:00:00Z`); // Default to season start
        }

        const gameData: InsertGame = {
          id: game.id,
          season: game.season,
          week: game.week,
          startDate,
          homeTeamId,
          awayTeamId,
          homeTeamScore: game.homePoints,
          awayTeamScore: game.awayPoints,
          completed: true, // Mark as completed since it has scores
          neutralSite: game.neutral_site || false,
          conferenceGame: game.conference_game || false,
          attendance: game.attendance || null,
          venue: game.venue || null,
          spread,
          overUnder,
          temperature: null,
          windSpeed: null,
          windDirection: null,
          humidity: null,
          precipitation: null,
          weatherCondition: null,
          weatherImpact: null
        };

        // Check if game already exists
        const existingGame = await storage.getGame(game.id);
        
        if (existingGame) {
          // Update existing game with scores if it doesn't have them
          if (existingGame.homeTeamScore === null || existingGame.awayTeamScore === null) {
            await storage.updateGame(game.id, gameData);
            updatedGames++;
          }
        } else {
          // Create new game
          await storage.createGame(gameData);
          insertedGames++;
        }

        processedGames++;
        if (processedGames % 100 === 0) {
          console.log(`📈 Processed ${processedGames}/${completedGames.length} games (${insertedGames} new, ${updatedGames} updated)`);
        }

      } catch (error) {
        console.error(`❌ Error processing game ${game.id}:`, error);
      }
    }

    console.log(`✅ ${season} season completed:`);
    console.log(`   📊 ${processedGames} games processed`);
    console.log(`   🆕 ${insertedGames} new games inserted`);
    console.log(`   🔄 ${updatedGames} games updated`);
    console.log(`   💰 ${gamesWithBettingLines} games with betting lines`);
  }

  /**
   * Sync all historical seasons (2009-2024) with complete game data
   */
  async syncAllHistoricalSeasons(): Promise<void> {
    // Start with recent seasons first since they're more likely to have complete data
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    
    console.log(`🚀 Starting complete historical sync for ${seasons.length} seasons...`);
    
    for (const season of seasons) {
      await this.syncAllCompletedGamesForSeason(season);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Complete historical sync finished!`);
    
    // Get final count
    const finalCount = await this.getFinalGameCount();
    console.log(`📊 Final database stats: ${finalCount.total} total games, ${finalCount.withScores} with scores`);
  }

  private async getFinalGameCount(): Promise<{total: number, withScores: number}> {
    // This would need to be implemented with raw SQL or storage method
    return { total: 0, withScores: 0 };
  }
}

export const completeHistoricalSync = new CompleteHistoricalSync();