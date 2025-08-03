#!/usr/bin/env tsx

/**
 * Extended Week 1 Game Collection Script
 * Collects games from August 23rd through Labor Day weekend (September 2nd)
 * This covers the extended Week 1 period including early season games
 */

import { db } from './server/db';
import { games, teams } from './shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const CFBD_API_KEY = process.env.CFBD_API_KEY;

if (!CFBD_API_KEY) {
  console.error('❌ CFBD_API_KEY environment variable is required');
  process.exit(1);
}

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance: number | null;
  venue_id: number | null;
  venue: string | null;
  home_team: string;
  home_conference: string | null;
  home_division: string | null;
  home_points: number | null;
  home_line_scores: number[] | null;
  home_post_win_prob: number | null;
  home_pregame_elo: number | null;
  home_postgame_elo: number | null;
  away_team: string;
  away_conference: string | null;
  away_division: string | null;
  away_points: number | null;
  away_line_scores: number[] | null;
  away_post_win_prob: number | null;
  away_pregame_elo: number | null;
  away_postgame_elo: number | null;
  excitement_index: number | null;
  highlights: string | null;
  notes: string | null;
}

interface CFBDLine {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  away_team: string;
  lines: Array<{
    provider: string;
    spread: string | null;
    formatted_spread: string | null;
    spread_open: string | null;
    over_under: string | null;
    over_under_open: string | null;
    home_moneyline: string | null;
    away_moneyline: string | null;
  }>;
}

class ExtendedWeek1Collector {
  private async fetchWithRetry<T>(url: string, maxRetries = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Fetching: ${url} (attempt ${attempt})`);
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${CFBD_API_KEY}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Successfully fetched ${Array.isArray(data) ? data.length : 1} items`);
        return data;
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('All retry attempts failed');
  }

  private async getTeamId(teamName: string): Promise<number | null> {
    try {
      const team = await db.select()
        .from(teams)
        .where(eq(teams.school, teamName))
        .limit(1);
      
      return team[0]?.id || null;
    } catch (error) {
      console.error(`Error finding team ${teamName}:`, error);
      return null;
    }
  }

  private parseSpread(spread: string | null): number | null {
    if (!spread) return null;
    const num = parseFloat(spread);
    return isNaN(num) ? null : num;
  }

  private parseOverUnder(overUnder: string | null): number | null {
    if (!overUnder) return null;
    const num = parseFloat(overUnder);
    return isNaN(num) ? null : num;
  }

  private async collectGamesForWeek(season: number, week: number): Promise<void> {
    console.log(`\n📅 Collecting games for ${season} Week ${week}...`);
    
    try {
      // Fetch games
      const gamesUrl = `https://api.collegefootballdata.com/games?year=${season}&week=${week}&seasonType=regular`;
      const cfbdGames: CFBDGame[] = await this.fetchWithRetry(gamesUrl);
      
      if (!cfbdGames.length) {
        console.log(`📭 No games found for Week ${week}`);
        return;
      }

      console.log(`🏈 Found ${cfbdGames.length} games for Week ${week}`);

      // Fetch betting lines
      const linesUrl = `https://api.collegefootballdata.com/lines?year=${season}&week=${week}&seasonType=regular`;
      const cfbdLines: CFBDLine[] = await this.fetchWithRetry(linesUrl);
      
      console.log(`💰 Found ${cfbdLines.length} games with betting lines`);

      // Create a map of betting lines by game
      const linesMap = new Map<string, CFBDLine>();
      cfbdLines.forEach(line => {
        const key = `${line.home_team}-${line.away_team}`;
        linesMap.set(key, line);
      });

      let gamesProcessed = 0;
      let gamesSkipped = 0;

      for (const cfbdGame of cfbdGames) {
        try {
          // Get team IDs
          const homeTeamId = await this.getTeamId(cfbdGame.home_team);
          const awayTeamId = await this.getTeamId(cfbdGame.away_team);

          if (!homeTeamId || !awayTeamId) {
            console.log(`⚠️ Skipping game: Could not find team IDs for ${cfbdGame.away_team} @ ${cfbdGame.home_team}`);
            gamesSkipped++;
            continue;
          }

          // Check if game already exists
          const existingGame = await db.select()
            .from(games)
            .where(eq(games.cfbdId, cfbdGame.id))
            .limit(1);

          if (existingGame.length > 0) {
            console.log(`🔄 Updating existing game: ${cfbdGame.away_team} @ ${cfbdGame.home_team}`);
            
            // Update the existing game
            await db.update(games)
              .set({
                homeTeamScore: cfbdGame.home_points,
                awayTeamScore: cfbdGame.away_points,
                completed: cfbdGame.home_points !== null && cfbdGame.away_points !== null,
                attendance: cfbdGame.attendance,
                excitementIndex: cfbdGame.excitement_index,
                highlights: cfbdGame.highlights,
                notes: cfbdGame.notes,
                homePostgameElo: cfbdGame.home_postgame_elo,
                awayPostgameElo: cfbdGame.away_postgame_elo,
                homeWinProbability: cfbdGame.home_post_win_prob
              })
              .where(eq(games.cfbdId, cfbdGame.id));
          } else {
            // Get betting lines for this game
            const gameKey = `${cfbdGame.home_team}-${cfbdGame.away_team}`;
            const gameLine = linesMap.get(gameKey);
            
            let spread = null;
            let overUnder = null;
            
            if (gameLine && gameLine.lines.length > 0) {
              // Use the first available line (usually consensus)
              const line = gameLine.lines[0];
              spread = this.parseSpread(line.spread);
              overUnder = this.parseOverUnder(line.over_under);
            }

            console.log(`➕ Creating new game: ${cfbdGame.away_team} @ ${cfbdGame.home_team}`);
            
            // Insert new game
            const insertedGame = await db.insert(games).values({
              cfbdId: cfbdGame.id,
              season: cfbdGame.season,
              week: cfbdGame.week,
              seasonType: cfbdGame.season_type,
              startDate: new Date(cfbdGame.start_date),
              homeTeamId,
              awayTeamId,
              neutralSite: cfbdGame.neutral_site,
              conferenceGame: cfbdGame.conference_game,
              homeTeamScore: cfbdGame.home_points,
              awayTeamScore: cfbdGame.away_points,
              completed: cfbdGame.home_points !== null && cfbdGame.away_points !== null,
              attendance: cfbdGame.attendance,
              venueId: cfbdGame.venue_id,
              stadium: cfbdGame.venue,
              location: cfbdGame.venue, // Use venue as location fallback
              excitementIndex: cfbdGame.excitement_index,
              highlights: cfbdGame.highlights,
              notes: cfbdGame.notes,
              homePregameElo: cfbdGame.home_pregame_elo,
              awayPregameElo: cfbdGame.away_pregame_elo,
              homePostgameElo: cfbdGame.home_postgame_elo,
              awayPostgameElo: cfbdGame.away_postgame_elo,
              homeWinProbability: cfbdGame.home_post_win_prob,
              spread,
              overUnder
            }).returning();

            // Betting lines are already included in the main game insert above
          }

          gamesProcessed++;

        } catch (error) {
          console.error(`❌ Error processing game ${cfbdGame.away_team} @ ${cfbdGame.home_team}:`, error);
        }
      }

      console.log(`✅ Week ${week} complete: ${gamesProcessed} games processed, ${gamesSkipped} skipped`);

    } catch (error) {
      console.error(`❌ Error collecting Week ${week}:`, error);
    }
  }

  async collectExtendedWeek1(): Promise<void> {
    console.log('🏈 Starting Extended Week 1 Collection (Aug 23 - Sept 2)');
    console.log('📅 This includes Week 0 and Week 1 games');
    
    try {
      // Week 0 typically covers games from late August
      await this.collectGamesForWeek(2025, 0);
      
      // Week 1 covers Labor Day weekend and first week of September
      await this.collectGamesForWeek(2025, 1);
      
      console.log('\n🎉 Extended Week 1 collection completed successfully!');
      
      // Show summary
      const weekStats = await db.select({
        week: games.week,
        count: games.id
      })
      .from(games)
      .where(and(
        eq(games.season, 2025),
        gte(games.week, 0),
        lte(games.week, 1)
      ));

      console.log('\n📊 Collection Summary:');
      weekStats.forEach(stat => {
        console.log(`   Week ${stat.week}: ${stat.count} games`);
      });

    } catch (error) {
      console.error('❌ Extended Week 1 collection failed:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    const collector = new ExtendedWeek1Collector();
    await collector.collectExtendedWeek1();
    process.exit(0);
  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
main();