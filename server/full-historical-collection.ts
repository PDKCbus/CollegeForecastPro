/**
 * Full Historical Collection - Get ALL 15 years of completed games with scores and betting data
 * Expected: 15,000+ historical games from 2009-2024 with authentic CFBD data
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

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
  home_id: number;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  away_id: number;
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
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

export class FullHistoricalCollection {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamMapping = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🌐 Making CFBD request: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  private async ensureTeamExists(teamName: string, cfbdId?: number): Promise<number> {
    // Check cache first
    if (this.teamMapping.has(teamName)) {
      return this.teamMapping.get(teamName)!;
    }

    // Check if team already exists in database
    const existingTeam = await db.select()
      .from(teams)
      .where(eq(teams.name, teamName))
      .limit(1);

    if (existingTeam.length > 0) {
      this.teamMapping.set(teamName, existingTeam[0].id);
      return existingTeam[0].id;
    }

    // Create new team
    const newTeam = await db.insert(teams).values({
      name: teamName,
      abbreviation: teamName.substring(0, 4).toUpperCase(),
      mascot: teamName,
      conference: 'Unknown',
      division: null,
      color: '#000000',
      altColor: '#FFFFFF',
      logoUrl: `https://a.espncdn.com/i/teamlogos/ncaa/500/${cfbdId || 1}.png`,
      rank: null,
      wins: 0,
      losses: 0
    }).returning();

    this.teamMapping.set(teamName, newTeam[0].id);
    return newTeam[0].id;
  }

  /**
   * Collect ALL completed games for a single season with authentic scores and betting data
   */
  async collectSeasonGames(season: number): Promise<void> {
    console.log(`📅 Collecting ALL games for ${season} season...`);

    // Get all regular season games
    const allGames = await this.makeRequest<CFBDGame>('/games', {
      year: season,
      seasonType: 'regular'
    });

    console.log(`📊 Found ${allGames.length} total games for ${season}`);

    // Filter to completed games with actual scores
    const completedGames = allGames.filter(game => 
      game.completed === true && 
      typeof game.home_points === 'number' && 
      typeof game.away_points === 'number' &&
      game.home_points !== null && 
      game.away_points !== null
    );

    console.log(`🏈 Found ${completedGames.length} COMPLETED games with scores for ${season}`);

    if (completedGames.length === 0) {
      console.log(`⚠️  No completed games found for ${season}. Skipping...`);
      return;
    }

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

    // Create betting lines lookup
    const linesMap = new Map<string, any>();
    bettingLines.forEach(line => {
      if (line.lines && line.lines.length > 0) {
        // Use the first available line (usually from a major provider)
        const bestLine = line.lines[0];
        const key = `${line.home_team}-${line.away_team}-${line.week}`;
        linesMap.set(key, bestLine);
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;

    // Process each completed game
    for (const game of completedGames) {
      try {
        // Ensure teams exist
        const homeTeamId = await this.ensureTeamExists(game.home_team, game.home_id);
        const awayTeamId = await this.ensureTeamExists(game.away_team, game.away_id);

        // Get betting line for this game
        const lineKey = `${game.home_team}-${game.away_team}-${game.week}`;
        const bettingLine = linesMap.get(lineKey);

        // Check if game already exists
        const existingGame = await db.select()
          .from(games)
          .where(eq(games.id, game.id))
          .limit(1);

        const gameData = {
          homeTeamId: homeTeamId,
          awayTeamId: awayTeamId,
          startDate: new Date(game.start_date),
          stadium: game.venue || null,
          location: null,
          spread: bettingLine?.spread || null,
          overUnder: bettingLine?.over_under || null,
          homeTeamScore: game.home_points!,
          awayTeamScore: game.away_points!,
          completed: true,
          season: game.season,
          week: game.week,
          isConferenceGame: game.conference_game || false,
          isRivalryGame: false,
          isFeatured: false,
          temperature: null,
          windSpeed: null,
          windDirection: null,
          humidity: null,
          precipitation: null,
          weatherCondition: null,
          isDome: false,
          weatherImpactScore: null
        };

        if (existingGame.length > 0) {
          // Update existing game with scores and betting data
          await db.update(games)
            .set(gameData)
            .where(eq(games.id, game.id));
          updatedCount++;
        } else {
          // Insert new game
          await db.insert(games).values({
            id: game.id,
            ...gameData
          });
          insertedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing game ${game.id}:`, error);
      }
    }

    console.log(`✅ ${season} completed: ${insertedCount} new games, ${updatedCount} updated games`);
  }

  /**
   * Collect ALL 15 years of historical data
   */
  async collectAllHistoricalData(): Promise<void> {
    console.log(`🚀 Starting FULL 15-year historical data collection (2009-2024)...`);
    
    const seasons = [];
    for (let year = 2009; year <= 2024; year++) {
      seasons.push(year);
    }

    let totalGamesCollected = 0;
    
    for (const season of seasons) {
      try {
        const beforeCount = await db.select({ count: sql<number>`count(*)` })
          .from(games)
          .where(eq(games.season, season));
        
        await this.collectSeasonGames(season);
        
        const afterCount = await db.select({ count: sql<number>`count(*)` })
          .from(games)
          .where(eq(games.season, season));
        
        const seasonGamesAdded = afterCount[0].count - beforeCount[0].count;
        totalGamesCollected += seasonGamesAdded;
        
        console.log(`📈 Season ${season}: ${seasonGamesAdded} games added (${afterCount[0].count} total)`);
        
        // Small delay to be respectful to CFBD API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error collecting ${season} data:`, error);
      }
    }

    // Final summary
    const finalCount = await db.select({ count: sql<number>`count(*)` })
      .from(games)
      .where(eq(games.completed, true));

    console.log(`🎉 COMPLETE! Total historical games collected: ${totalGamesCollected}`);
    console.log(`📊 Total completed games in database: ${finalCount[0].count}`);
    console.log(`🏆 Expected 10,000+ games from 15 years of college football`);
  }
}

// Export function to run the collection
export async function runFullHistoricalCollection(): Promise<void> {
  const collector = new FullHistoricalCollection();
  await collector.collectAllHistoricalData();
}