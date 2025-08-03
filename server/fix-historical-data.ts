/**
 * Fix Historical Data - Update existing games with scores from CFBD API
 * We have 1,583 games but only 209 are marked completed with scores
 * This will fetch scores for ALL games and mark them properly completed
 */

import { db } from "./db";
import { games } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  completed: boolean;
  home_team: string;
  home_points?: number;
  away_team: string;
  away_points?: number;
}

export class HistoricalDataFixer {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🌐 CFBD Request: ${url.toString()}`);
    
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

  /**
   * Fix all games for a specific season by getting scores from CFBD
   */
  async fixSeasonGames(season: number): Promise<void> {
    console.log(`🔧 Fixing games for ${season} season...`);

    // Get all games from CFBD for this season 
    const cfbdGames = await this.makeRequest<CFBDGame>('/games', {
      year: season,
      seasonType: 'regular'
    });

    console.log(`📊 CFBD returned ${cfbdGames.length} games for ${season}`);

    // Filter to completed games with actual scores
    const completedGames = cfbdGames.filter(game => 
      game.completed === true && 
      typeof game.home_points === 'number' && 
      typeof game.away_points === 'number'
    );

    console.log(`🏈 Found ${completedGames.length} completed games with scores`);

    let updatedCount = 0;
    let insertedCount = 0;

    // Process each completed game
    for (const game of completedGames) {
      try {
        // Check if game exists in database
        const existingGame = await db.select()
          .from(games)
          .where(eq(games.id, game.id))
          .limit(1);

        if (existingGame.length > 0) {
          // Update existing game with scores
          await db.update(games)
            .set({
              homeTeamScore: game.home_points!,
              awayTeamScore: game.away_points!,
              completed: true
            })
            .where(eq(games.id, game.id));
          updatedCount++;
        } else {
          console.log(`ℹ️  Game ${game.id} not found in database - would need team creation for insert`);
        }

        // Progress indicator
        if ((updatedCount + insertedCount) % 50 === 0) {
          console.log(`📈 Processed ${updatedCount + insertedCount} games...`);
        }

      } catch (error) {
        console.error(`❌ Error processing game ${game.id}:`, error);
      }
    }

    console.log(`✅ ${season} completed: ${updatedCount} games updated, ${insertedCount} games inserted`);
  }

  /**
   * Fix all historical data by updating scores for all seasons
   */
  async fixAllHistoricalData(): Promise<void> {
    console.log(`🚀 Starting historical data fix for all seasons...`);
    
    // Check current state
    const beforeStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true AND home_team_score IS NOT NULL THEN 1 END) as completed_games
      FROM games
    `));
    
    console.log(`📊 Before fix: ${beforeStats[0].total_games} total games, ${beforeStats[0].completed_games} completed`);

    // Fix each season from 2009-2024
    const seasons = [];
    for (let year = 2009; year <= 2024; year++) {
      seasons.push(year);
    }

    for (const season of seasons) {
      try {
        await this.fixSeasonGames(season);
        
        // Small delay to be respectful to CFBD API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error fixing ${season} data:`, error);
      }
    }

    // Check final state
    const afterStats = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true AND home_team_score IS NOT NULL THEN 1 END) as completed_games
      FROM games
    `));
    
    console.log(`📊 After fix: ${afterStats[0].total_games} total games, ${afterStats[0].completed_games} completed`);
    console.log(`🎉 SUCCESS! Fixed ${afterStats[0].completed_games - beforeStats[0].completed_games} additional games!`);
  }
}

// Export function to run the fix
export async function runHistoricalDataFix(): Promise<void> {
  const fixer = new HistoricalDataFixer();
  await fixer.fixAllHistoricalData();
}