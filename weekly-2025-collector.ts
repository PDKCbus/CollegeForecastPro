#!/usr/bin/env tsx

/**
 * Weekly 2025 Season Collection System
 * 
 * This script collects games for the current or next week of the 2025 season
 * and updates completed game status. Designed to run Tuesday mornings to catch
 * Monday holiday games and update completion status from previous week.
 */

import { RobustSeasonCollector } from './robust-season-collector';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function getCurrentWeek(): Promise<number> {
  const today = new Date();
  const seasonStart = new Date('2025-08-23'); // Typical college football season start
  
  if (today < seasonStart) {
    return 1; // Pre-season, prepare for week 1
  }
  
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceStart = Math.floor((today.getTime() - seasonStart.getTime()) / msPerWeek);
  
  // College football typically runs weeks 1-17 (including postseason)
  return Math.min(Math.max(weeksSinceStart + 1, 1), 17);
}

async function getWeeksToCollect(currentWeek: number): Promise<number[]> {
  // Always collect current week and next 2 weeks to stay ahead
  const weeksToCollect = [currentWeek];
  
  if (currentWeek < 17) weeksToCollect.push(currentWeek + 1);
  if (currentWeek < 16) weeksToCollect.push(currentWeek + 2);
  
  return weeksToCollect;
}

async function checkExistingGames(week: number): Promise<number> {
  const existing = await sql`
    SELECT COUNT(*) as count
    FROM games 
    WHERE season = 2025 AND week = ${week}
  `;
  
  return parseInt(existing[0].count);
}

async function updateCompletedGames(): Promise<number> {
  console.log('🏁 Updating completed game status...');
  
  // Mark games as completed if they have final scores and the game time has passed
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // 6 hours ago to be safe
  
  const updatedGames = await sql`
    UPDATE games 
    SET completed = true
    WHERE season = 2025 
      AND completed = false 
      AND start_date < ${cutoffTime}
      AND home_team_score IS NOT NULL
      AND away_team_score IS NOT NULL
      AND home_team_score > 0
      AND away_team_score > 0
    RETURNING id
  `;

  console.log(`   ✅ Marked ${updatedGames.length} games as completed\n`);
  return updatedGames.length;
}

async function collectWeeklyGames() {
  console.log('🎯 WEEKLY COLLECTION: Starting 2025 season data sync...');

  // CRITICAL: Clean up any existing duplicates before adding new data
  console.log('🧹 Pre-sync duplicate cleanup...');
  await cleanupDuplicatesForCurrentWeek();

  const currentWeek = await getCurrentWeek();
  const weeksToCollect = await getWeeksToCollect(currentWeek);

  console.log(`📅 Current week: ${currentWeek}`);
  console.log(`📋 Collecting weeks: ${weeksToCollect.join(', ')}`);

  const collector = new RobustSeasonCollector({
    year: 2025,
    maxGamesPerBatch: 25,
    delayBetweenBatches: 2000,
    maxTimeoutRetries: 3
  });

  for (const week of weeksToCollect) {
    const existingCount = await checkExistingGames(week);
    console.log(`\n🔍 Week ${week}: ${existingCount} existing games`);

    if (existingCount > 0) {
      console.log(`   ⚠️ Games already exist for week ${week}, skipping to prevent duplicates`);
      continue;
    }

    try {
      console.log(`   🏈 Collecting Week ${week} games...`);
      const { games, lines } = await collector.collectWeekData(week);
      console.log(`   📊 Collected ${games.length} games for week ${week}`);

      // Actually insert the games into the database
      const result = await collector.processGamesBatch(games, lines, week);
      console.log(`   💾 Inserted ${result.inserted} games, ${result.withBetting} with betting lines`);

      const newCount = await checkExistingGames(week);
      console.log(`   ✅ Week ${week} complete: ${newCount} games now in database`);

    } catch (error) {
      console.error(`   ❌ Week ${week} collection failed:`, error);
    }
  }

  // Update completion status for finished games
  const completedCount = await updateCompletedGames();

  console.log('\n🎯 WEEKLY COLLECTION SUMMARY:');
  console.log(`   ✓ Processed weeks: ${weeksToCollect.join(', ')}`);
  console.log(`   ✓ Games marked complete: ${completedCount}`);
  console.log('   ✓ No duplicates created (pre-existence checks passed)');
}

async function cleanupDuplicatesForCurrentWeek(): Promise<void> {
  try {
    const currentWeek = await getCurrentWeek();

    // Remove duplicates for current week, keeping the lowest ID for each matchup
    const cleanupResult = await sql`
      WITH duplicate_analysis AS (
        SELECT
          id,
          home_team_id,
          away_team_id,
          season,
          week,
          ROW_NUMBER() OVER (
            PARTITION BY home_team_id, away_team_id, season, week
            ORDER BY id
          ) as rn
        FROM games
        WHERE season = 2025 AND week = ${currentWeek}
      ),
      duplicates_to_remove AS (
        SELECT id FROM duplicate_analysis WHERE rn > 1
      )
      DELETE FROM games
      WHERE id IN (SELECT id FROM duplicates_to_remove)
      AND NOT EXISTS (
        SELECT 1 FROM ricks_picks WHERE game_id = games.id
      )
    `;

    if (cleanupResult.length > 0) {
      console.log(`   🧹 Cleaned up ${cleanupResult.length} duplicate games for week ${currentWeek}`);
    }

  } catch (error) {
    console.error('   ⚠️ Duplicate cleanup failed:', error);
  }
}

// Legacy function - kept for backwards compatibility
async function collectWeeklyGamesLegacy() {
  console.log('🗓️  Recommended schedule: Tuesday mornings to catch Monday holiday games\n');

  // Step 1: Update completed games from previous weeks
  const completedCount = await updateCompletedGames();

  // Step 2: Update preseason rankings for Week 1 predictions
  console.log('📊 Updating preseason rankings for authentic Week 1 predictions...');
  try {
    const { PreseasonRankingsCollector } = await import("./server/preseason-rankings-collector");
    await PreseasonRankingsCollector.updatePreseasonTeamRatings(2025);
    console.log('   ✅ Preseason rankings updated for accurate Week 1 analytics\n');
  } catch (error) {
    console.log('   ⚠️ Preseason collection failed (continuing with existing data):', (error as Error).message);
  }

  // Step 3: Enrich weather data for upcoming games (within 7 days)
  console.log('🌦️ Checking for games needing weather data...');
  try {
    const { enrichWeatherForUpcomingGames } = await import('./server/weather-enrichment');
    const weatherEnrichedCount = await enrichWeatherForUpcomingGames();
    console.log(`   Weather data updated for ${weatherEnrichedCount} games\n`);
  } catch (error) {
    console.log('   ⚠️ Weather enrichment skipped:', (error as Error).message);
  }

  // Step 4: Collect upcoming games
  const currentWeek = await getCurrentWeek();
  const weeksToCollect = await getWeeksToCollect(currentWeek);

  console.log(`Current week: ${currentWeek}`);
  console.log(`Weeks to collect: ${weeksToCollect.join(', ')}\n`);

  const collector = new RobustSeasonCollector({
    year: 2025,
    maxGamesPerBatch: 25,
    delayBetweenBatches: 2000,
    maxTimeoutRetries: 3
  });
  let totalNewGames = 0;

  for (const week of weeksToCollect) {
    console.log(`\n📅 Processing Week ${week}...`);

    const existingGames = await checkExistingGames(week);
    console.log(`   Existing games in week ${week}: ${existingGames}`);

    if (existingGames > 0) {
      console.log(`   Week ${week} already has games, checking for updates...`);
    }

    try {
      // Use the robust collector to get games for this specific week
      const { games, lines } = await collector.collectWeekData(week);
      const result = await collector.processGamesBatch(games, lines, week);
      totalNewGames += result.inserted;

      console.log(`   ✅ Week ${week} collection complete: ${newGames} games processed`);

    } catch (error) {
      console.error(`   ❌ Error collecting week ${week}:`, error);
    }

    // Small delay between weeks
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Weekly collection & update complete!`);
  console.log(`   Games marked as completed: ${completedCount}`);
  console.log(`   Total new games processed: ${totalNewGames}`);

  // Verify final counts
  const finalCounts = await sql`
    SELECT
      COUNT(CASE WHEN completed = false THEN 1 END) as upcoming_games,
      COUNT(CASE WHEN completed = true THEN 1 END) as completed_games
    FROM games
    WHERE season = 2025
  `;

  console.log(`   Total upcoming 2025 games: ${finalCounts[0].upcoming_games}`);
  console.log(`   Total completed 2025 games: ${finalCounts[0].completed_games}`);

  return {
    currentWeek,
    weeksCollected: weeksToCollect,
    gamesMarkedCompleted: completedCount,
    newGamesProcessed: totalNewGames,
    totalUpcoming: parseInt(finalCounts[0].upcoming_games),
    totalCompleted: parseInt(finalCounts[0].completed_games)
  };
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  collectWeeklyGames().catch(console.error);
}

export { collectWeeklyGames, getCurrentWeek, updateCompletedGames };