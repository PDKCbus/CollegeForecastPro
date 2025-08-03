/**
 * Working Historical Sync - Fix the broken team mapping and get REAL historical data
 * This will use the proven approach but with correct CFBD API parsing
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  completed: boolean;
  homeTeam: string;
  homeConference?: string;
  homePoints?: number;
  awayTeam: string;
  awayConference?: string;
  awayPoints?: number;
  venue?: string;
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

export class WorkingHistoricalSync {
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
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🌐 CFBD API: ${endpoint} (${Object.keys(params).join(', ')})`);
    
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
    return Array.isArray(data) ? data : [data];
  }

  private async getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
    if (!teamName || teamName === 'undefined') {
      throw new Error(`Invalid team name: ${teamName}`);
    }

    // Use cache to avoid duplicate database calls
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    // Check if team exists by name (case-insensitive)
    const existingTeam = await db.select()
      .from(teams)
      .where(sql`LOWER(${teams.name}) = LOWER(${teamName})`)
      .limit(1);

    if (existingTeam.length > 0) {
      this.teamCache.set(teamName, existingTeam[0].id);
      return existingTeam[0].id;
    }

    // Create new team with proper defaults
    const newTeam = await db.insert(teams).values({
      name: teamName,
      abbreviation: teamName.substring(0, 4).toUpperCase(),
      mascot: teamName,
      conference: conference || 'Unknown',
      division: null,
      color: '#000000',
      altColor: '#FFFFFF',
      logoUrl: `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`,
      rank: null,
      wins: 0,
      losses: 0
    }).returning();

    console.log(`➕ Created team: ${teamName} (ID: ${newTeam[0].id})`);
    this.teamCache.set(teamName, newTeam[0].id);
    return newTeam[0].id;
  }

  /**
   * Collect data for specific seasons with completed games ONLY
   */
  async collectHistoricalSeasons(seasons: number[]): Promise<void> {
    console.log(`🚀 Starting working historical sync for seasons: ${seasons.join(', ')}`);
    
    let totalInserted = 0;

    for (const season of seasons) {
      try {
        console.log(`📅 Processing ${season} season...`);

        // Get completed games from CFBD
        const allGames = await this.makeRequest<CFBDGame>('/games', {
          year: season,
          seasonType: 'regular'
        });

        console.log(`📊 CFBD returned ${allGames.length} games for ${season}`);

        // Debug: Check actual API response structure
        if (allGames.length > 0) {
          console.log(`🔍 Sample game structure:`, JSON.stringify(allGames[0], null, 2));
        }

        // Filter to ONLY completed games with valid team names and scores
        const completedGames = allGames.filter(game => 
          game.completed === true &&
          game.homeTeam && game.homeTeam !== 'undefined' &&
          game.awayTeam && game.awayTeam !== 'undefined' &&
          game.homeTeam !== game.awayTeam &&
          typeof game.homePoints === 'number' &&
          typeof game.awayPoints === 'number'
        );

        console.log(`✅ Found ${completedGames.length} valid completed games for ${season}`);

        if (completedGames.length === 0) {
          console.log(`⚠️  No valid completed games for ${season} - skipping`);
          continue;
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

        // Create betting lines lookup map
        const bettingMap = new Map<string, any>();
        bettingLines.forEach(line => {
          if (line.lines && line.lines.length > 0) {
            const bestLine = line.lines[0];
            const key = `${line.home_team}_${line.away_team}_${line.week}`;
            bettingMap.set(key, bestLine);
          }
        });

        let seasonInserted = 0;

        // Process each completed game
        for (const game of completedGames) {
          try {
            // Get or create teams
            const homeTeamId = await this.getOrCreateTeam(game.homeTeam, game.homeConference);
            const awayTeamId = await this.getOrCreateTeam(game.awayTeam, game.awayConference);

            // Validate different teams
            if (homeTeamId === awayTeamId) {
              console.log(`❌ Same team IDs: ${game.home_team} vs ${game.away_team} both mapped to ${homeTeamId}`);
              continue;
            }

            // Get betting line for this game
            const bettingKey = `${game.homeTeam}_${game.awayTeam}_${game.week}`;
            const bettingLine = bettingMap.get(bettingKey);

            // Parse date
            let gameDate: Date;
            try {
              gameDate = new Date(game.startDate);
              if (isNaN(gameDate.getTime())) {
                gameDate = new Date(`${season}-09-01T12:00:00.000Z`);
              }
            } catch {
              gameDate = new Date(`${season}-09-01T12:00:00.000Z`);
            }

            // Check if game already exists
            const existingGame = await db.select()
              .from(games)
              .where(eq(games.id, game.id))
              .limit(1);

            if (existingGame.length > 0) {
              console.log(`📝 Game ${game.id} already exists - skipping`);
              continue;
            }

            // Insert new completed game with scores
            await db.insert(games).values({
              id: game.id,
              homeTeamId: homeTeamId,
              awayTeamId: awayTeamId,
              startDate: gameDate,
              stadium: game.venue || null,
              location: game.venue || null,
              spread: bettingLine?.spread || null,
              overUnder: bettingLine?.over_under || null,
              homeTeamScore: game.homePoints,
              awayTeamScore: game.awayPoints,
              completed: true,
              season: game.season,
              week: game.week,
              isConferenceGame: false,
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
            });

            seasonInserted++;
            totalInserted++;

            if (seasonInserted % 50 === 0) {
              console.log(`📈 ${season}: Inserted ${seasonInserted} games so far...`);
            }

          } catch (error) {
            console.error(`❌ Error processing game ${game.id}:`, error);
          }
        }

        console.log(`✅ ${season} completed: ${seasonInserted} games inserted`);
        
        // Small delay to be respectful to API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error collecting ${season} season data:`, error);
      }
    }

    console.log(`🎉 WORKING SYNC COMPLETE!`);
    console.log(`📊 Total games inserted: ${totalInserted}`);
    
    // Get final stats
    const finalStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true AND home_team_score IS NOT NULL THEN 1 END) as completed_games
      FROM games
    `));
    
    console.log(`🏆 Final database: ${finalStats[0].total_games} total games, ${finalStats[0].completed_games} with scores`);
  }
}

// Export function to run the working sync
export async function runWorkingHistoricalSync(): Promise<void> {
  const syncer = new WorkingHistoricalSync();
  
  // Focus on recent seasons with the most complete data
  const seasonsToSync = [2020, 2021, 2022, 2023, 2024];
  
  await syncer.collectHistoricalSeasons(seasonsToSync);
}