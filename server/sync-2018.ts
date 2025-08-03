/**
 * 2018 Season Data Sync
 * Comprehensive data collection for the missing 2018 season
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { InsertGame, InsertTeam } from "../shared/schema";
import { cleanGameData, cleanTeamData } from "./data-cleaner";

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
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  home_post_win_prob?: number;
  home_pregame_elo?: number;
  home_postgame_elo?: number;
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
  away_post_win_prob?: number;
  away_pregame_elo?: number;
  away_postgame_elo?: number;
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
  home_conference: string;
  home_score?: number;
  away_team: string;
  away_conference: string;
  away_score?: number;
  lines: Array<{
    provider: string;
    spread?: number;
    formatted_spread?: string;
    spread_open?: number;
    over_under?: number;
    over_under_open?: number;
    home_moneyline?: number;
    away_moneyline?: number;
  }>;
}

export class Season2018Sync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamCache = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async ensureTeamExists(teamName: string): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    // Try to find existing team
    const existingTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.name, teamName))
      .limit(1);

    if (existingTeam.length > 0) {
      this.teamCache.set(teamName, existingTeam[0].id);
      return existingTeam[0].id;
    }

    // Create new team
    const newTeam: InsertTeam = {
      name: teamName,
      abbreviation: teamName.substring(0, 4).toUpperCase(),
      mascot: '',
      conference: '',
      division: null,
      color: '#000000',
      altColor: '#FFFFFF',
      logoUrl: null,
      rank: null,
      wins: 0,
      losses: 0
    };

    const cleanedTeamData = cleanTeamData(newTeam);
    const insertedTeam = await db.insert(teams).values(cleanedTeamData).returning();
    this.teamCache.set(teamName, insertedTeam[0].id);
    return insertedTeam[0].id;
  }

  async sync2018Games(): Promise<void> {
    console.log('Starting 2018 games sync...');
    
    // Get games for 2018 season
    const cfbdGames = await this.makeRequest<CFBDGame>('/games', { 
      year: 2018,
      seasonType: 'regular'
    });

    console.log(`Found ${cfbdGames.length} games for 2018 season`);

    let processed = 0;
    let inserted = 0;
    let errors = 0;

    for (const cfbdGame of cfbdGames) {
      try {
        const homeTeamId = await this.ensureTeamExists(cfbdGame.home_team);
        const awayTeamId = await this.ensureTeamExists(cfbdGame.away_team);

        // Check if game already exists
        const existingGame = await db
          .select()
          .from(games)
          .where(and(
            eq(games.homeTeamId, homeTeamId),
            eq(games.awayTeamId, awayTeamId),
            eq(games.season, 2018),
            eq(games.week, cfbdGame.week)
          ))
          .limit(1);

        if (existingGame.length > 0) {
          // Update existing game with scores if available
          if (cfbdGame.home_points !== undefined && cfbdGame.away_points !== undefined) {
            await db
              .update(games)
              .set({
                homeTeamScore: cfbdGame.home_points,
                awayTeamScore: cfbdGame.away_points,
                completed: true
              })
              .where(eq(games.id, existingGame[0].id));
          }
          processed++;
          continue;
        }

        let startDate: Date;
        try {
          startDate = new Date(cfbdGame.start_date);
          if (isNaN(startDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (dateError) {
          console.warn(`Invalid date for game ${cfbdGame.id}: ${cfbdGame.start_date}`);
          startDate = new Date('2018-01-01T12:00:00Z');
        }

        const gameData: InsertGame = {
          homeTeamId,
          awayTeamId,
          startDate,
          stadium: cfbdGame.venue || null,
          location: null,
          spread: null, // Will be filled by betting lines sync
          overUnder: null,
          homeTeamScore: cfbdGame.home_points || null,
          awayTeamScore: cfbdGame.away_points || null,
          completed: cfbdGame.home_points !== undefined && cfbdGame.away_points !== undefined,
          season: 2018,
          week: cfbdGame.week,
          isConferenceGame: cfbdGame.conference_game || false,
          isRivalryGame: false,
          isFeatured: false,
          // Weather data will be added later if available
          temperature: null,
          windSpeed: null,
          windDirection: null,
          humidity: null,
          precipitation: null,
          weatherCondition: null,
          isDome: false,
          weatherImpactScore: null
        };

        const cleanedGameData = cleanGameData(gameData);
        await db.insert(games).values(cleanedGameData);
        inserted++;

      } catch (error) {
        console.error(`Error processing game ${cfbdGame.id}:`, error);
        errors++;
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`Processed ${processed}/${cfbdGames.length} games (${inserted} inserted, ${errors} errors)`);
      }
    }

    console.log(`2018 Games sync completed: ${processed} processed, ${inserted} inserted, ${errors} errors`);
  }

  async sync2018BettingLines(): Promise<void> {
    console.log('Starting 2018 betting lines sync...');
    
    // Get betting lines for 2018
    const bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', { 
      year: 2018,
      seasonType: 'regular'
    });

    console.log(`Found ${bettingLines.length} betting line records for 2018`);

    let processed = 0;
    let updated = 0;

    for (const line of bettingLines) {
      try {
        const homeTeamId = await this.ensureTeamExists(line.home_team);
        const awayTeamId = await this.ensureTeamExists(line.away_team);

        // Find the corresponding game
        const existingGame = await db
          .select()
          .from(games)
          .where(and(
            eq(games.homeTeamId, homeTeamId),
            eq(games.awayTeamId, awayTeamId),
            eq(games.season, 2018),
            eq(games.week, line.week)
          ))
          .limit(1);

        if (existingGame.length === 0) {
          processed++;
          continue;
        }

        // Get consensus betting line (prefer ESPN, then other major books)
        let bestSpread: number | null = null;
        let bestOverUnder: number | null = null;

        const preferredProviders = ['ESPN', 'Bovada', 'BetMGM', 'DraftKings', 'FanDuel'];
        
        for (const provider of preferredProviders) {
          const providerLine = line.lines.find(l => l.provider === provider);
          if (providerLine) {
            if (providerLine.spread !== undefined && bestSpread === null) {
              bestSpread = providerLine.spread;
            }
            if (providerLine.over_under !== undefined && bestOverUnder === null) {
              bestOverUnder = providerLine.over_under;
            }
            if (bestSpread !== null && bestOverUnder !== null) break;
          }
        }

        // Fallback to any available line
        if (bestSpread === null || bestOverUnder === null) {
          for (const gameLine of line.lines) {
            if (gameLine.spread !== undefined && bestSpread === null) {
              bestSpread = gameLine.spread;
            }
            if (gameLine.over_under !== undefined && bestOverUnder === null) {
              bestOverUnder = gameLine.over_under;
            }
          }
        }

        if (bestSpread !== null || bestOverUnder !== null) {
          await db
            .update(games)
            .set({
              spread: bestSpread,
              overUnder: bestOverUnder
            })
            .where(eq(games.id, existingGame[0].id));
          updated++;
        }

      } catch (error) {
        console.error(`Error processing betting line for ${line.home_team} vs ${line.away_team}:`, error);
      }

      processed++;
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${bettingLines.length} betting lines (${updated} games updated)`);
      }
    }

    console.log(`2018 Betting lines sync completed: ${processed} processed, ${updated} games updated`);
  }

  async syncComplete2018Season(): Promise<void> {
    console.log('Starting comprehensive 2018 season sync...');
    
    try {
      await this.sync2018Games();
      await this.sync2018BettingLines();
      
      // Get final count
      const finalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(games)
        .where(eq(games.season, 2018));

      console.log(`2018 season sync completed! Total games in database: ${finalCount[0].count}`);
      
    } catch (error) {
      console.error('Error during 2018 season sync:', error);
      throw error;
    }
  }
}

export const season2018Sync = new Season2018Sync();