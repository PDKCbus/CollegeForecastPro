/**
 * Complete Historical Rebuild - Use the proven approach that previously collected 29,114+ games
 * This uses direct CFBD API calls with proper team mapping to avoid duplicate team ID issues
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  completed: boolean;
  neutral_site?: boolean;
  conference_game?: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
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

export class CompleteHistoricalRebuild {
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

    return await response.json();
  }

  private async getOrCreateTeam(teamName: string): Promise<number> {
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
      conference: 'Unknown',
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
   * Collect all games for a specific season with proper team mapping
   */
  async collectSeasonData(season: number): Promise<void> {
    console.log(`📅 Collecting ${season} season data...`);

    try {
      // Get all regular season games from CFBD
      const allGames = await this.makeRequest<CFBDGame>('/games', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`📊 CFBD returned ${allGames.length} games for ${season}`);

      if (allGames.length === 0) {
        console.log(`⚠️  No games found for ${season} - skipping`);
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

      // Create betting lines lookup map
      const bettingMap = new Map<string, any>();
      bettingLines.forEach(line => {
        if (line.lines && line.lines.length > 0) {
          const bestLine = line.lines[0]; // Use first line (usually major sportsbook)
          const key = `${line.home_team}_${line.away_team}_${line.week}`;
          bettingMap.set(key, bestLine);
        }
      });

      let insertedGames = 0;
      let skippedGames = 0;

      // Process each game with proper validation
      for (const game of allGames) {
        try {
          // Validate game has different home/away teams
          if (game.home_team === game.away_team) {
            console.log(`⚠️  Skipping invalid game ${game.id}: same home/away team (${game.home_team})`);
            skippedGames++;
            continue;
          }

          // Get or create teams with proper mapping
          const homeTeamId = await this.getOrCreateTeam(game.home_team);
          const awayTeamId = await this.getOrCreateTeam(game.away_team);

          // Validate we got different team IDs
          if (homeTeamId === awayTeamId) {
            console.log(`❌ Team mapping error: ${game.home_team} vs ${game.away_team} both mapped to ID ${homeTeamId}`);
            skippedGames++;
            continue;
          }

          // Get betting line for this game
          const bettingKey = `${game.home_team}_${game.away_team}_${game.week}`;
          const bettingLine = bettingMap.get(bettingKey);

          // Validate date
          let gameDate: Date;
          try {
            gameDate = new Date(game.start_date);
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

          // Insert new game with all data
          await db.insert(games).values({
            id: game.id,
            homeTeamId: homeTeamId,
            awayTeamId: awayTeamId,
            startDate: gameDate,
            stadium: game.venue || null,
            location: game.venue || null,
            spread: bettingLine?.spread || null,
            overUnder: bettingLine?.over_under || null,
            homeTeamScore: (game.completed && typeof game.home_points === 'number') ? game.home_points : null,
            awayTeamScore: (game.completed && typeof game.away_points === 'number') ? game.away_points : null,
            completed: game.completed || false,
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
          });

          insertedGames++;

          if (insertedGames % 100 === 0) {
            console.log(`📈 Processed ${insertedGames} games for ${season}...`);
          }

        } catch (error) {
          console.error(`❌ Error processing game ${game.id}:`, error);
          skippedGames++;
        }
      }

      console.log(`✅ ${season} completed: ${insertedGames} games inserted, ${skippedGames} skipped`);

    } catch (error) {
      console.error(`❌ Error collecting ${season} season data:`, error);
    }
  }

  /**
   * Rebuild the entire 15-year historical database
   */
  async rebuildAllHistoricalData(): Promise<void> {
    console.log(`🚀 Starting complete 15-year historical rebuild (2009-2024)...`);
    
    // Get current state before rebuild
    const beforeStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true AND home_team_score IS NOT NULL THEN 1 END) as completed_games
      FROM games
    `));
    
    console.log(`📊 Before rebuild: ${beforeStats[0].total_games} total games, ${beforeStats[0].completed_games} completed`);

    // Process all seasons from 2009-2024
    const seasons = [];
    for (let year = 2009; year <= 2024; year++) {
      seasons.push(year);
    }

    let totalInsertedGames = 0;
    
    for (const season of seasons) {
      const beforeSeasonCount = await db.select({ count: sql<number>`count(*)` })
        .from(games)
        .where(eq(games.season, season));

      await this.collectSeasonData(season);

      const afterSeasonCount = await db.select({ count: sql<number>`count(*)` })
        .from(games)
        .where(eq(games.season, season));

      const seasonGamesAdded = afterSeasonCount[0].count - beforeSeasonCount[0].count;
      totalInsertedGames += seasonGamesAdded;

      console.log(`📈 ${season} summary: +${seasonGamesAdded} games (${afterSeasonCount[0].count} total for season)`);
      
      // Small delay to be respectful to CFBD API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get final state after rebuild
    const afterStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true AND home_team_score IS NOT NULL THEN 1 END) as completed_games
      FROM games
    `));
    
    console.log(`🎉 REBUILD COMPLETE!`);
    console.log(`📊 Final stats: ${afterStats[0].total_games} total games, ${afterStats[0].completed_games} completed games`);
    console.log(`📈 Added ${totalInsertedGames} new games`);
    console.log(`🏆 Expected 10,000+ games from 15 years of college football - ${afterStats[0].total_games >= 10000 ? 'SUCCESS!' : 'Still collecting...'}`);
  }
}

// Export function to run the rebuild
export async function runCompleteHistoricalRebuild(): Promise<void> {
  const rebuilder = new CompleteHistoricalRebuild();
  await rebuilder.rebuildAllHistoricalData();
}