#!/usr/bin/env tsx
/**
 * AUTHENTIC 2025 SEASON SYNC
 * 
 * Only use real CFBD API data - no mock or synthetic games
 */

import { rawPGStorage } from './server/raw-pg-storage';

class Authentic2025Sync {
  private cfbdApiKey: string;

  constructor() {
    this.cfbdApiKey = process.env.CFBD_API_KEY || '';
    if (!this.cfbdApiKey) {
      console.error('❌ CFBD_API_KEY required');
      process.exit(1);
    }
  }

  async sync(): Promise<void> {
    console.log('🏈 SYNCING AUTHENTIC 2025 SEASON DATA ONLY...\n');

    try {
      // Fetch real 2025 games from CFBD
      console.log('📡 Fetching authentic 2025 games from CFBD API...');
      
      const response = await fetch('https://api.collegefootballdata.com/games?year=2025&seasonType=regular', {
        headers: {
          'Authorization': `Bearer ${this.cfbdApiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status}`);
      }

      const games = await response.json();
      console.log(`📊 Found ${games.length} authentic 2025 games from CFBD`);

      if (games.length === 0) {
        console.log('⚠️  No 2025 games available from CFBD API yet');
        console.log('   This is normal - 2025 season schedules may not be released');
        return;
      }

      let added = 0;
      let skipped = 0;

      for (const game of games) {
        try {
          // Get or create teams
          const homeTeam = await this.getOrCreateTeam(game.home_team, game.home_conference);
          const awayTeam = await this.getOrCreateTeam(game.away_team, game.away_conference);

          if (!homeTeam || !awayTeam) {
            skipped++;
            continue;
          }

          // Check if already exists
          const existing = await rawPGStorage.query(`
            SELECT id FROM games 
            WHERE season = $1 AND week = $2 AND home_team_id = $3 AND away_team_id = $4
          `, [game.season, game.week, homeTeam.id, awayTeam.id]);

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          // Insert authentic game
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
            game.home_points !== null && game.away_points !== null,
            game.home_points || null,
            game.away_points || null,
            false,
            false
          ]);

          added++;

          if (added % 20 === 0) {
            console.log(`   ⚡ Added ${added} authentic games...`);
          }

        } catch (error) {
          console.error(`❌ Error processing game ${game.id}:`, error);
          skipped++;
          continue;
        }
      }

      console.log(`\n✅ Authentic 2025 sync complete:`);
      console.log(`   Added: ${added} games`);
      console.log(`   Skipped: ${skipped} games`);

      // Show final status
      const final = await rawPGStorage.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT week) as weeks,
          MIN(week) as min_week,
          MAX(week) as max_week
        FROM games WHERE season = 2025
      `);

      const stats = final.rows[0];
      console.log(`   Total 2025 games: ${stats.total}`);
      console.log(`   Weeks available: ${stats.min_week}-${stats.max_week} (${stats.weeks} weeks)`);

    } catch (error) {
      console.error('❌ Authentic sync failed:', error);
    } finally {
      await rawPGStorage.close();
    }
  }

  private async getOrCreateTeam(name: string, conference?: string): Promise<{id: number} | null> {
    try {
      const existing = await rawPGStorage.query(
        'SELECT id FROM teams WHERE name = $1',
        [name]
      );

      if (existing.rows.length > 0) {
        return { id: existing.rows[0].id };
      }

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
      console.error(`Error with team ${name}:`, error);
      return null;
    }
  }
}

// Auto-run
const sync = new Authentic2025Sync();
sync.sync().catch(console.error);