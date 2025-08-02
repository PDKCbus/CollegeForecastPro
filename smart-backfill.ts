#!/usr/bin/env tsx
/**
 * SMART BACKFILL SCRIPT
 * 
 * Runs independently of server with rate limiting, progress tracking,
 * and resumable collection. Data persists regardless of interruptions.
 */

import { rawPGStorage } from './server/raw-pg-storage';

class SmartBackfill {
  private cfbdApiKey: string;
  private rateLimitDelay: number = 2000; // 2 seconds between requests

  constructor() {
    this.cfbdApiKey = process.env.CFBD_API_KEY || '';
    if (!this.cfbdApiKey) {
      console.error('❌ CFBD_API_KEY environment variable required');
      process.exit(1);
    }
  }

  async start(): Promise<void> {
    console.log('🏈 SMART BACKFILL STARTING...\n');

    // Step 1: Get current status
    await this.showCurrentStatus();

    // Step 2: Priority collection
    const missingYears = [2010, 2011, 2012, 2013, 2014];
    const incompleteYears = [2025]; // Need full season

    console.log('\n🎯 COLLECTING MISSING YEARS FIRST...');
    for (const year of missingYears) {
      await this.collectYear(year);
      console.log(`✅ ${year} complete. Waiting 3 seconds...`);
      await this.sleep(3000);
    }

    console.log('\n🎯 COMPLETING 2025 SEASON...');
    await this.collectYear(2025);

    // Step 3: Final status
    console.log('\n📊 FINAL STATUS:');
    await this.showCurrentStatus();

    console.log('\n🎉 Smart backfill complete!');
    await rawPGStorage.close();
  }

  private async collectYear(year: number): Promise<void> {
    try {
      console.log(`\n📅 Collecting ${year}...`);

      // Check what we already have
      const existing = await rawPGStorage.query(
        'SELECT COUNT(*) as count FROM games WHERE season = $1', 
        [year]
      );
      const existingCount = parseInt(existing.rows[0].count);

      console.log(`   Current: ${existingCount} games`);

      // Fetch from CFBD with retry logic
      const games = await this.fetchWithRetry(
        `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular`
      );

      if (!games || games.length === 0) {
        console.log(`   ⚠️  No games found for ${year}`);
        return;
      }

      console.log(`   📊 Found ${games.length} games from CFBD`);

      let newGames = 0;
      let processed = 0;

      for (const game of games) {
        try {
          // Get/create teams
          const homeTeam = await this.getOrCreateTeam(game.home_team, game.home_conference);
          const awayTeam = await this.getOrCreateTeam(game.away_team, game.away_conference);

          if (!homeTeam || !awayTeam) continue;

          // Check for existing game
          const existingGame = await rawPGStorage.query(`
            SELECT id FROM games 
            WHERE season = $1 AND week = $2 AND home_team_id = $3 AND away_team_id = $4
          `, [game.season, game.week, homeTeam.id, awayTeam.id]);

          if (existingGame.rows.length > 0) {
            processed++;
            continue; // Already exists
          }

          // Insert new game
          await rawPGStorage.query(`
            INSERT INTO games (
              home_team_id, away_team_id, start_date, stadium, location,
              season, week, is_conference_game, completed,
              home_team_score, away_team_score, is_rivalry_game, is_featured
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [
            homeTeam.id,
            awayTeam.id,
            new Date(game.start_date),
            game.venue || null,
            game.venue || null,
            game.season,
            game.week,
            game.conference_game || false,
            game.home_points !== undefined && game.away_points !== undefined,
            game.home_points || null,
            game.away_points || null,
            false,
            false
          ]);

          newGames++;
          processed++;

          if (processed % 50 === 0) {
            console.log(`   ⚡ Processed ${processed}/${games.length}...`);
          }

        } catch (error) {
          console.error(`   ❌ Error with game ${game.id}:`, error);
          continue;
        }
      }

      console.log(`   ✅ ${year}: Added ${newGames} new games`);

    } catch (error) {
      console.error(`❌ Failed to collect ${year}:`, error);
    }
  }

  private async getOrCreateTeam(name: string, conference?: string): Promise<{id: number} | null> {
    try {
      // Check if team exists
      const existing = await rawPGStorage.query(
        'SELECT id FROM teams WHERE name = $1',
        [name]
      );

      if (existing.rows.length > 0) {
        return { id: existing.rows[0].id };
      }

      // Create new team
      const newTeam = await rawPGStorage.query(`
        INSERT INTO teams (name, abbreviation, conference, logo_url)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [
        name,
        name.substring(0, 4).toUpperCase(),
        conference || 'Independent',
        `https://a.espncdn.com/i/teamlogos/ncaa/500/default.png`
      ]);

      return { id: newTeam.rows[0].id };

    } catch (error) {
      console.error(`Error creating team ${name}:`, error);
      return null;
    }
  }

  private async fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sleep(this.rateLimitDelay);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.cfbdApiKey}`,
            'Accept': 'application/json'
          }
        });

        if (response.status === 429) {
          console.log(`   ⏳ Rate limited, waiting ${this.rateLimitDelay * 2}ms...`);
          await this.sleep(this.rateLimitDelay * 2);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

      } catch (error) {
        console.log(`   ⚠️  Attempt ${attempt}/${maxRetries} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        await this.sleep(this.rateLimitDelay * attempt);
      }
    }
  }

  private async showCurrentStatus(): Promise<void> {
    const summary = await rawPGStorage.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
        COUNT(CASE WHEN completed = false THEN 1 END) as upcoming_games,
        COUNT(DISTINCT season) as seasons_covered,
        MIN(season) as earliest_year,
        MAX(season) as latest_year
      FROM games
    `);

    const stats = summary.rows[0];
    
    console.log(`📊 STATUS: ${stats.total_games} games, ${stats.seasons_covered} seasons (${stats.earliest_year}-${stats.latest_year})`);

    // Show missing years
    const missing = await rawPGStorage.query(`
      WITH all_seasons AS (SELECT generate_series(2009, 2025) as season)
      SELECT s.season as missing_season
      FROM all_seasons s
      LEFT JOIN (SELECT DISTINCT season FROM games) g ON s.season = g.season
      WHERE g.season IS NULL
      ORDER BY s.season
    `);

    if (missing.rows.length > 0) {
      const missingYears = missing.rows.map(r => r.missing_season).join(', ');
      console.log(`❌ Missing: ${missingYears}`);
    } else {
      console.log(`✅ All years present (2009-2025)`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-run
const backfill = new SmartBackfill();
backfill.start().catch(console.error);