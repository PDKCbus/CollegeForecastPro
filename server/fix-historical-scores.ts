/**
 * Fix Historical Data - Collect only completed games with actual scores
 * The issue: Current sync pulls in future games without scores
 * Solution: Re-sync only completed games from College Football Data API
 */

import { storage } from './storage';
import { InsertGame } from '../shared/schema';

interface CFBDCompletedGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  completed: boolean;
  home_team: string;
  home_points: number;
  home_line_scores: number[];
  away_team: string;
  away_points: number;
  away_line_scores: number[];
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue?: string;
  excitement_index?: number;
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
  }>;
}

export class HistoricalScoreFixer {
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

    const newTeam = await storage.createTeam({
      name: teamName,
      conference: 'Unknown',
      division: null,
      logo: '',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      wins: 0,
      losses: 0,
      ranking: null
    });

    this.teamCache.set(teamName, newTeam.id);
    return newTeam.id;
  }

  /**
   * Sync ONLY completed games with actual scores for a specific season
   */
  async syncCompletedGamesForSeason(season: number): Promise<void> {
    console.log(`🏈 Syncing completed games for ${season} season...`);

    // Get only completed games with scores
    const completedGames = await this.makeRequest<CFBDCompletedGame>('/games', {
      year: season,
      seasonType: 'regular'
    });

    // Filter to only games that are actually completed with scores
    const gamesWithScores = completedGames.filter(game => 
      game.completed && 
      game.home_points !== null && 
      game.away_points !== null &&
      game.home_points !== undefined && 
      game.away_points !== undefined
    );

    console.log(`📊 Found ${gamesWithScores.length} completed games with scores out of ${completedGames.length} total games`);

    // Get betting lines for this season
    const bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', {
      year: season,
      seasonType: 'regular'
    });

    const linesMap = new Map<string, CFBDBettingLine>();
    bettingLines.forEach(line => {
      const key = `${line.home_team}-${line.away_team}-${line.week}`;
      linesMap.set(key, line);
    });

    let processedGames = 0;
    let gamesWithBettingLines = 0;

    for (const game of gamesWithScores) {
      try {
        const homeTeamId = await this.ensureTeamExists(game.home_team);
        const awayTeamId = await this.ensureTeamExists(game.away_team);

        // Find betting lines for this game
        const lineKey = `${game.home_team}-${game.away_team}-${game.week}`;
        const bettingLine = linesMap.get(lineKey);
        
        let spread = null;
        let overUnder = null;

        if (bettingLine && bettingLine.lines.length > 0) {
          // Use consensus from multiple books or first available
          const line = bettingLine.lines[0];
          spread = line.spread || null;
          overUnder = line.over_under || null;
          gamesWithBettingLines++;
        }

        // Check if game already exists
        const existingGame = await storage.getGameWithTeams(game.id);
        if (existingGame && existingGame.homeTeamScore !== null) {
          continue; // Skip if already has scores
        }

        const gameData: InsertGame = {
          id: game.id,
          season: game.season,
          week: game.week,
          startDate: new Date(game.start_date),
          homeTeamId,
          awayTeamId,
          homeTeamScore: game.home_points,
          awayTeamScore: game.away_points,
          completed: true,
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

        if (existingGame) {
          await storage.updateGame(game.id, gameData);
        } else {
          await storage.createGame(gameData);
        }

        processedGames++;
        if (processedGames % 100 === 0) {
          console.log(`📈 Processed ${processedGames}/${gamesWithScores.length} completed games`);
        }

      } catch (error) {
        console.error(`Error processing game ${game.id}:`, error);
      }
    }

    console.log(`✅ ${season} season completed: ${processedGames} games processed, ${gamesWithBettingLines} with betting lines`);
  }

  /**
   * Fix all historical seasons with proper completed games
   */
  async fixAllHistoricalSeasons(): Promise<void> {
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    
    console.log(`🚀 Starting historical score fix for ${seasons.length} seasons...`);
    
    for (const season of seasons) {
      await this.syncCompletedGamesForSeason(season);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Historical score fix completed for all seasons!`);
  }
}

export const historicalScoreFixer = new HistoricalScoreFixer();