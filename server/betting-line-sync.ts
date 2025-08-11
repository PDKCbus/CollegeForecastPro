import { db } from "./db";
import { games, teams } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

interface BettingLine {
  gameId: number;
  spread: number | null;
  overUnder: number | null;
  homeMoneyLine: number | null;
  awayMoneyLine: number | null;
  provider: string;
}

export class BettingLinesSync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable is required for betting lines sync');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`💰 Fetching betting lines: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD Betting API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async syncCurrentWeekBettingLines(season: number = 2025, week: number = 1): Promise<void> {
    try {
      console.log(`💰 Syncing betting lines for ${season} season, week ${week}...`);

      // Fetch betting lines from CFBD
      const bettingData = await this.makeRequest('/lines', {
        year: season,
        week: week,
        seasonType: 'regular'
      });

      console.log(`📊 Received ${bettingData.length} games with betting lines`);

      let updated = 0;
      let errors = 0;

      for (const gameData of bettingData as any[]) {
        try {
          const gameId = gameData.id;

          // Get consensus lines (average from multiple books)
          let spread: number | null = null;
          let overUnder: number | null = null;

          if (gameData.lines && gameData.lines.length > 0) {
            const validSpreads = gameData.lines
              .filter((line: any) => line.spread !== null && line.spread !== undefined)
              .map((line: any) => parseFloat(line.spread));

            const validTotals = gameData.lines
              .filter((line: any) => line.overUnder !== null && line.overUnder !== undefined)
              .map((line: any) => parseFloat(line.overUnder));

            if (validSpreads.length > 0) {
              spread = validSpreads.reduce((sum, val) => sum + val, 0) / validSpreads.length;
              spread = Math.round(spread * 2) / 2; // Round to nearest 0.5
            }

            if (validTotals.length > 0) {
              overUnder = validTotals.reduce((sum, val) => sum + val, 0) / validTotals.length;
              overUnder = Math.round(overUnder * 2) / 2; // Round to nearest 0.5
            }
          }

          // Update the game in database
          if (spread !== null || overUnder !== null) {
            await db.update(games)
              .set({
                spread: spread,
                overUnder: overUnder,
                lastUpdated: new Date()
              })
              .where(eq(games.id, gameId));

            console.log(`✅ Updated betting lines for game ${gameId}: spread ${spread}, O/U ${overUnder}`);
            updated++;
          }

        } catch (error) {
          console.error(`❌ Error updating betting lines for game:`, error);
          errors++;
        }
      }

      console.log(`💰 Betting lines sync completed: ${updated} updated, ${errors} errors`);

    } catch (error) {
      console.error('❌ Betting lines sync failed:', error);
      throw error;
    }
  }

  async syncUpcomingGamesBettingLines(): Promise<void> {
    try {
      console.log('💰 Syncing betting lines for upcoming games...');

      // Get upcoming games that need betting lines
      const upcomingGames = await db.select({
        id: games.id,
        season: games.season,
        week: games.week
      })
      .from(games)
      .where(and(
        gte(games.startDate, new Date()),
        eq(games.completed, false)
      ))
      .limit(50);

      console.log(`📊 Found ${upcomingGames.length} upcoming games`);

      // Group by season and week for efficient API calls
      const gamesByWeek = new Map<string, typeof upcomingGames>();

      for (const game of upcomingGames) {
        const key = `${game.season}-${game.week}`;
        if (!gamesByWeek.has(key)) {
          gamesByWeek.set(key, []);
        }
        gamesByWeek.get(key)!.push(game);
      }

      // Sync betting lines for each week
      for (const [weekKey, weekGames] of gamesByWeek) {
        const [season, week] = weekKey.split('-').map(Number);

        try {
          await this.syncCurrentWeekBettingLines(season, week);
          console.log(`✅ Synced betting lines for ${season} week ${week} (${weekGames.length} games)`);
        } catch (error) {
          console.error(`❌ Failed to sync betting lines for ${season} week ${week}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Upcoming games betting lines sync failed:', error);
      throw error;
    }
  }

  // Monday sync: Light refresh for opening lines
  async mondayBettingLinesRefresh(): Promise<void> {
    console.log('📅 Monday betting lines refresh - opening lines');
    await this.syncUpcomingGamesBettingLines();
  }

  // Thursday sync: Mid-week adjustments
  async thursdayBettingLinesRefresh(): Promise<void> {
    console.log('📅 Thursday betting lines refresh - mid-week adjustments');
    await this.syncUpcomingGamesBettingLines();
  }

  // Friday sync: Final lines before games
  async fridayBettingLinesRefresh(): Promise<void> {
    console.log('📅 Friday betting lines refresh - final lines');
    await this.syncUpcomingGamesBettingLines();
  }

  // Saturday sync: Game day updates
  async saturdayBettingLinesRefresh(): Promise<void> {
    console.log('📅 Saturday betting lines refresh - game day updates');
    await this.syncUpcomingGamesBettingLines();
  }
}

// Singleton instance
let bettingLinesSyncInstance: BettingLinesSync | null = null;

export function getBettingLinesSync(): BettingLinesSync {
  if (!bettingLinesSyncInstance) {
    bettingLinesSyncInstance = new BettingLinesSync();
  }
  return bettingLinesSyncInstance;
}

export async function syncBettingLines(): Promise<void> {
  const sync = getBettingLinesSync();
  await sync.syncUpcomingGamesBettingLines();
}