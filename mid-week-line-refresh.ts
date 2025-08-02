import { db } from "./server/db";
import { games, teams } from "./shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const CFBD_API_KEY = process.env.CFBD_API_KEY;

interface CFBDLine {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  homeTeam: string;
  homeConference: string;
  homeScore?: number;
  awayTeam: string;
  awayConference: string;
  awayScore?: number;
  lines: Array<{
    provider: string;
    spread?: number;
    overUnder?: number;
    spreadOpen?: number;
    overUnderOpen?: number;
  }>;
}

export async function refreshMidWeekBettingLines(): Promise<void> {
  console.log('🎯 Starting mid-week betting lines refresh...');
  
  if (!CFBD_API_KEY) {
    throw new Error('CFBD_API_KEY is required for betting lines collection');
  }

  try {
    // Get upcoming games in the next 7 days that need line updates
    const upcomingGames = await db.execute(sql`
      SELECT g.id, g.season, g.week, g.start_date, g.spread, g.over_under,
             ht.name as home_team_name, at.name as away_team_name
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.completed = false 
        AND g.start_date >= NOW()
        AND g.start_date <= NOW() + INTERVAL '7 days'
        AND g.season = 2025
      ORDER BY g.start_date ASC
    `);

    console.log(`📊 Found ${upcomingGames.length} upcoming games for line refresh`);

    if (upcomingGames.length === 0) {
      console.log('✅ No upcoming games found for line refresh');
      return;
    }

    // Get current week for API call
    const currentWeek = Math.max(...upcomingGames.map((g: any) => g.week));
    
    // Fetch fresh betting lines from CFBD
    const linesResponse = await fetch(
      `https://api.collegefootballdata.com/lines?year=2025&week=${currentWeek}&seasonType=regular`,
      {
        headers: {
          'Authorization': `Bearer ${CFBD_API_KEY}`,
          'accept': 'application/json'
        }
      }
    );

    if (!linesResponse.ok) {
      throw new Error(`CFBD API error: ${linesResponse.status} ${linesResponse.statusText}`);
    }

    const cfbdLines: CFBDLine[] = await linesResponse.json();
    console.log(`📈 Retrieved ${cfbdLines.length} games with betting lines from CFBD`);

    let updatedCount = 0;
    let significantChanges = 0;

    for (const cfbdGame of cfbdLines) {
      try {
        // Find matching game in our database
        const matchingGame = upcomingGames.find((g: any) => 
          g.home_team_name === cfbdGame.homeTeam && 
          g.away_team_name === cfbdGame.awayTeam &&
          g.week === cfbdGame.week
        );

        if (!matchingGame) {
          continue;
        }

        // Get best betting lines (prioritize DraftKings > Bovada > Average)
        let bestSpread: number | null = null;
        let bestTotal: number | null = null;

        const lineProviders = ['DraftKings', 'Bovada', 'consensus'];
        
        for (const provider of lineProviders) {
          const providerLine = cfbdGame.lines.find(line => line.provider === provider);
          if (providerLine) {
            if (providerLine.spread !== undefined && bestSpread === null) {
              bestSpread = providerLine.spread;
            }
            if (providerLine.overUnder !== undefined && bestTotal === null) {
              bestTotal = providerLine.overUnder;
            }
            if (bestSpread !== null && bestTotal !== null) break;
          }
        }

        // Check if lines have changed significantly (≥0.5 points)
        const currentSpread = matchingGame.spread;
        const currentTotal = matchingGame.over_under;
        
        const spreadChange = bestSpread !== null && currentSpread !== null ? 
          Math.abs(bestSpread - currentSpread) : 0;
        const totalChange = bestTotal !== null && currentTotal !== null ? 
          Math.abs(bestTotal - currentTotal) : 0;

        if (spreadChange >= 0.5 || totalChange >= 0.5) {
          significantChanges++;
          console.log(`📊 Significant line movement detected for ${cfbdGame.awayTeam} @ ${cfbdGame.homeTeam}:`);
          if (spreadChange >= 0.5) {
            console.log(`   Spread: ${currentSpread} → ${bestSpread} (${spreadChange >= 1 ? 'MAJOR' : 'moderate'} movement)`);
          }
          if (totalChange >= 0.5) {
            console.log(`   Total: ${currentTotal} → ${bestTotal} (${totalChange >= 1 ? 'MAJOR' : 'moderate'} movement)`);
          }
        }

        // Update database with fresh lines
        if (bestSpread !== null || bestTotal !== null) {
          await db
            .update(games)
            .set({
              spread: bestSpread,
              overUnder: bestTotal,
            })
            .where(eq(games.id, matchingGame.id));

          updatedCount++;
        }

        // Small delay to respect API limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error updating lines for ${cfbdGame.awayTeam} @ ${cfbdGame.homeTeam}:`, error);
      }
    }

    console.log(`✅ Mid-week line refresh completed:`);
    console.log(`   📊 ${updatedCount} games updated with fresh betting lines`);
    console.log(`   🚨 ${significantChanges} games had significant line movement (≥0.5 points)`);
    
    if (significantChanges > 0) {
      console.log(`   💡 Consider reviewing Rick's picks for games with major line movement`);
    }

  } catch (error) {
    console.error('❌ Mid-week betting lines refresh failed:', error);
    throw error;
  }
}

// CLI execution
if (import.meta.main) {
  refreshMidWeekBettingLines()
    .then(() => {
      console.log('🎯 Mid-week line refresh completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Mid-week line refresh failed:', error);
      process.exit(1);
    });
}