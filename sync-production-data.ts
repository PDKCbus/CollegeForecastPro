#!/usr/bin/env npx tsx

import { Pool } from 'pg';

const devPool = new Pool({
  connectionString: process.env.DATABASE_URL, // Development DB
});

const prodPool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL, // You need to set this
});

async function syncGamesToProduction() {
  try {
    console.log('🔄 Starting production data sync...');
    
    // Get upcoming games from development
    const devGames = await devPool.query(`
      SELECT * FROM games 
      WHERE start_date >= NOW() 
      AND completed = false 
      ORDER BY start_date ASC
    `);
    
    console.log(`📊 Found ${devGames.rows.length} upcoming games in development`);
    
    // Get current production games count
    const prodCount = await prodPool.query(`
      SELECT COUNT(*) FROM games 
      WHERE start_date >= NOW() 
      AND completed = false
    `);
    
    console.log(`📊 Production currently has ${prodCount.rows[0].count} upcoming games`);
    
    // Insert missing games into production
    let inserted = 0;
    for (const game of devGames.rows) {
      try {
        await prodPool.query(`
          INSERT INTO games (id, home_team_id, away_team_id, start_date, week, season, spread, over_under, completed, venue, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          game.id, game.home_team_id, game.away_team_id, game.start_date,
          game.week, game.season, game.spread, game.over_under, game.completed,
          game.venue, game.notes
        ]);
        inserted++;
      } catch (err) {
        console.warn(`⚠️  Skipped game ${game.id}: ${err}`);
      }
    }
    
    console.log(`✅ Successfully synced ${inserted} games to production`);
    
    // Verify final count
    const finalCount = await prodPool.query(`
      SELECT COUNT(*) FROM games 
      WHERE start_date >= NOW() 
      AND completed = false
    `);
    
    console.log(`🎯 Production now has ${finalCount.rows[0].count} upcoming games`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

syncGamesToProduction();