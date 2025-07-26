#!/usr/bin/env tsx
/**
 * QUICK STATUS CHECK
 * 
 * Provides instant status of historical data collection without
 * needing to run the full server or navigate through APIs.
 */

import { rawPGStorage } from './server/raw-pg-storage';

async function checkDataStatus() {
  console.log('📊 HISTORICAL DATA STATUS CHECK\n');
  console.log('='.repeat(60));

  try {
    // Overall summary
    const summary = await rawPGStorage.query(`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
        COUNT(CASE WHEN completed = false THEN 1 END) as upcoming_games,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as games_with_spreads,
        ROUND(100.0 * COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) / COUNT(*), 1) as spread_coverage,
        COUNT(DISTINCT season) as seasons_covered,
        MIN(season) as earliest_year,
        MAX(season) as latest_year
      FROM games
    `);

    const stats = summary.rows[0];
    console.log(`📈 OVERALL SUMMARY:`);
    console.log(`   Total Games: ${stats.total_games}`);
    console.log(`   Completed: ${stats.completed_games}`);
    console.log(`   Upcoming: ${stats.upcoming_games}`);
    console.log(`   With Spreads: ${stats.games_with_spreads} (${stats.spread_coverage}%)`);
    console.log(`   Seasons: ${stats.seasons_covered} (${stats.earliest_year}-${stats.latest_year})`);

    // Season breakdown
    const seasonBreakdown = await rawPGStorage.query(`
      SELECT 
        season,
        COUNT(*) as total_games,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
        COUNT(CASE WHEN completed = false THEN 1 END) as upcoming_games,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as games_with_spreads,
        ROUND(100.0 * COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) / COUNT(*), 1) as spread_coverage,
        MAX(week) as max_week
      FROM games 
      GROUP BY season 
      ORDER BY season DESC
    `);

    console.log(`\n📅 SEASON BREAKDOWN:`);
    console.log('Year  | Games | Completed | Upcoming | Spreads | Coverage | Max Week');
    console.log('-'.repeat(70));
    
    for (const row of seasonBreakdown.rows) {
      const year = row.season.toString();
      const games = row.total_games.toString().padStart(5);
      const completed = row.completed_games.toString().padStart(9);
      const upcoming = row.upcoming_games.toString().padStart(8);
      const spreads = row.games_with_spreads.toString().padStart(7);
      const coverage = `${row.spread_coverage}%`.padStart(8);
      const maxWeek = row.max_week.toString().padStart(8);
      
      console.log(`${year} | ${games} | ${completed} | ${upcoming} | ${spreads} | ${coverage} | ${maxWeek}`);
    }

    // Missing years check
    const missingYears = await rawPGStorage.query(`
      WITH all_seasons AS (
        SELECT generate_series(2009, 2025) as season
      )
      SELECT s.season as missing_season
      FROM all_seasons s
      LEFT JOIN (SELECT DISTINCT season FROM games) g ON s.season = g.season
      WHERE g.season IS NULL
      ORDER BY s.season
    `);

    if (missingYears.rows.length > 0) {
      console.log(`\n❌ MISSING YEARS:`);
      const missing = missingYears.rows.map(row => row.missing_season).join(', ');
      console.log(`   ${missing}`);
    } else {
      console.log(`\n✅ ALL YEARS PRESENT (2009-2025)`);
    }

    // 2025 status (for filtering)
    const current2025 = await rawPGStorage.query(`
      SELECT 
        week,
        COUNT(*) as games_count,
        COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as with_spreads
      FROM games 
      WHERE season = 2025 AND completed = false
      GROUP BY week
      ORDER BY week
    `);

    console.log(`\n🏈 2025 SEASON STATUS (for filtering):`);
    if (current2025.rows.length > 0) {
      console.log('Week | Games | With Spreads');
      console.log('-'.repeat(25));
      for (const week of current2025.rows) {
        console.log(`${week.week.toString().padStart(4)} | ${week.games_count.toString().padStart(5)} | ${week.with_spreads.toString().padStart(11)}`);
      }
    } else {
      console.log('   No 2025 upcoming games found');
    }

  } catch (error) {
    console.error('❌ Status check failed:', error);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the status check
checkDataStatus().then(() => {
  console.log('✅ Status check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Status check failed:', error);
  process.exit(1);
});