#!/usr/bin/env tsx
/**
 * STANDALONE HISTORICAL DATA BACKFILL SCRIPT
 *
 * This script runs independently of the main server to collect historical data
 * without being interrupted by server restarts or development workflows.
 *
 * Usage: tsx historical-backfill-script.ts
 */

import { rawPGStorage } from './server/raw-pg-storage';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_points?: number;
  away_team: string;
  away_conference?: string;
  away_points?: number;
}

class HistoricalBackfillManager {
  private cfbdApiKey: string;

  constructor() {
    this.cfbdApiKey = process.env.CFBD_API_KEY || '';
    if (!this.cfbdApiKey) {
      console.error('❌ CFBD_API_KEY environment variable is required');
      process.exit(1);
    }
  }

  async backfillMissingYears(): Promise<void> {
    console.log('🏈 Starting Historical Data Backfill...\n');

    // Priority order: Missing years first, then enhance existing data
    const missingYears = [2010, 2011, 2012, 2013, 2014];
    const enhanceYears = [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023];
    const currentYears = [2025]; // Full season collection

    // Phase 1: Collect missing years (critical gaps)
    console.log('📅 Phase 1: Collecting Missing Years (2010-2014)');
    for (const year of missingYears) {
      await this.collectSeasonData(year, true);
      await this.sleep(2000); // Rate limiting
    }

    // Phase 2: Enhance existing partial years
    console.log('\n📅 Phase 2: Enhancing Partial Years (2015-2023)');
    for (const year of enhanceYears) {
      await this.collectSeasonData(year, false);
      await this.sleep(2000);
    }

    // Phase 3: Complete 2025 season (all weeks)
    console.log('\n📅 Phase 3: Complete 2025 Season Collection');
    await this.collectSeasonData(2025, false);

    console.log('\n✅ Historical Backfill Complete!');
    await this.generateSummaryReport();
  }

  private async collectSeasonData(year: number, isNewYear: boolean): Promise<void> {
    try {
      console.log(`\n🔄 ${isNewYear ? 'Collecting' : 'Enhancing'} ${year} season...`);

      // Fetch games from CFBD API
      const gamesUrl = `https://api.collegefootballdata.com/games?` +
        `year=${year}&seasonType=regular`;

      const response = await fetch(gamesUrl, {
        headers: {
          'Authorization': `Bearer ${this.cfbdApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch ${year} games: ${response.status}`);
        return;
      }

      const games: CFBDGame[] = await response.json();
      console.log(`📊 Found ${games.length} games for ${year}`);

      let processedCount = 0;
      let newGamesCount = 0;

      for (const game of games) {
        try {
          // Get or create teams first
          let homeTeam = await rawPGStorage.query('SELECT * FROM teams WHERE name = $1 LIMIT 1', [game.home_team]);
          if (homeTeam.rows.length === 0) {
            const newHomeTeam = await rawPGStorage.query(`
              INSERT INTO teams (name, abbreviation, conference, logo_url)
              VALUES ($1, $2, $3, $4) RETURNING *
            `, [
              game.home_team,
              game.home_team.substring(0, 4).toUpperCase(),
              game.home_conference || 'Independent',
              `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`
            ]);
            homeTeam = newHomeTeam;
          }

          let awayTeam = await rawPGStorage.query('SELECT * FROM teams WHERE name = $1 LIMIT 1', [game.away_team]);
          if (awayTeam.rows.length === 0) {
            const newAwayTeam = await rawPGStorage.query(`
              INSERT INTO teams (name, abbreviation, conference, logo_url)
              VALUES ($1, $2, $3, $4) RETURNING *
            `, [
              game.away_team,
              game.away_team.substring(0, 4).toUpperCase(),
              game.away_conference || 'Independent',
              `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`
            ]);
            awayTeam = newAwayTeam;
          }

          const homeTeamData = homeTeam.rows[0];
          const awayTeamData = awayTeam.rows[0];

          // Check if game already exists (simple duplicate prevention)
          const existingCheck = await rawPGStorage.query(
            'SELECT id FROM games WHERE season = $1 AND week = $2 AND home_team_id = $3 AND away_team_id = $4 LIMIT 1',
            [game.season, game.week, homeTeamData.id, awayTeamData.id]
          );

          if (existingCheck.rows.length > 0 && isNewYear) {
            continue; // Skip if already exists and we're doing new collection
          }

          if (!homeTeamData || !awayTeamData) continue;

          // Create game record
          await rawPGStorage.query(`
            INSERT INTO games (
              home_team_id, away_team_id, start_date, stadium, location,
              season, week, is_conference_game, completed,
              home_team_score, away_team_score, is_rivalry_game, is_featured
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            homeTeamData.id,
            awayTeamData.id,
            new Date(game.start_date),
            game.venue || null,
            game.venue || null,
            game.season,
            game.week,
            game.conference_game || false,
            game.home_points !== undefined && game.away_points !== undefined,
            game.home_points || null,
            game.away_points || null,
            false, // isRivalryGame
            false  // isFeatured
          ]);
          newGamesCount++;
          processedCount++;

          if (processedCount % 100 === 0) {
            console.log(`  ⚡ Processed ${processedCount}/${games.length} games...`);
          }

        } catch (error) {
          console.error(`❌ Error processing game ${game.id}:`, error);
          continue;
        }
      }

      console.log(`✅ ${year}: Added ${newGamesCount} new games (${processedCount} processed)`);

    } catch (error) {
      console.error(`❌ Failed to collect ${year} season:`, error);
    }
  }

  private async collectBettingLines(): Promise<void> {
    console.log('\n💰 Collecting Betting Lines for Historical Games...');

    try {
      const linesUrl = 'https://api.collegefootballdata.com/lines';

      for (let year = 2009; year <= 2024; year++) {
        console.log(`📈 Fetching betting lines for ${year}...`);

        const response = await fetch(`${linesUrl}?year=${year}`, {
          headers: {
            'Authorization': `Bearer ${this.cfbdApiKey}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.log(`⚠️ No betting lines available for ${year}`);
          continue;
        }

        const lines = await response.json();
        console.log(`💎 Found ${lines.length} betting lines for ${year}`);

        for (const line of lines) {
          try {
            await rawPGStorage.updateGameBettingLines(line.id, {
              spread: line.lines?.[0]?.spread,
              overUnder: line.lines?.[0]?.overUnder
            });
          } catch (error) {
            // Continue on individual line errors
            continue;
          }
        }

        await this.sleep(1000); // Rate limiting
      }

    } catch (error) {
      console.error('❌ Betting lines collection failed:', error);
    }
  }

  private async generateSummaryReport(): Promise<void> {
    console.log('\n📊 HISTORICAL DATA SUMMARY REPORT');
    console.log('='.repeat(50));

    try {
      const summary = await rawPGStorage.getDataSummary();

      console.log(`Total Games: ${summary.totalGames}`);
      console.log(`Completed Games: ${summary.completedGames}`);
      console.log(`Upcoming Games: ${summary.upcomingGames}`);
      console.log(`Games with Spreads: ${summary.gamesWithSpreads}`);
      console.log(`Coverage: ${summary.spreadCoverage}%`);
      console.log(`Seasons Covered: ${summary.seasonsCovered}`);
      console.log(`Year Range: ${summary.earliestYear}-${summary.latestYear}`);

    } catch (error) {
      console.error('❌ Could not generate summary report:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the backfill if called directly
async function main() {
  const backfillManager = new HistoricalBackfillManager();

  try {
    await backfillManager.backfillMissingYears();
    console.log('\n🎉 Backfill process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Backfill process failed:', error);
    process.exit(1);
  }
}

// Auto-run if called directly
main();

export { HistoricalBackfillManager };