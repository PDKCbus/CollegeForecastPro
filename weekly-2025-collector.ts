#!/usr/bin/env tsx

/**
 * Weekly 2025 Season Collection System
 * 
 * This script collects games for the current or next week of the 2025 season.
 * Designed to run regularly (weekly) to keep upcoming games current.
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

async function collectWeeklyGames() {
  console.log('📅 Weekly 2025 Season Collection Starting...\n');
  
  const currentWeek = await getCurrentWeek();
  const weeksToCollect = await getWeeksToCollect(currentWeek);
  
  console.log(`Current week: ${currentWeek}`);
  console.log(`Weeks to collect: ${weeksToCollect.join(', ')}\n`);
  
  const collector = new RobustSeasonCollector();
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
      const newGames = await collector.collectWeek(2025, week);
      totalNewGames += newGames;
      
      console.log(`   ✅ Week ${week} collection complete: ${newGames} games processed`);
      
    } catch (error) {
      console.error(`   ❌ Error collecting week ${week}:`, error);
    }
    
    // Small delay between weeks
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Weekly collection complete!`);
  console.log(`   Total new games processed: ${totalNewGames}`);
  
  // Verify upcoming games count
  const upcomingCount = await sql`
    SELECT COUNT(*) as count
    FROM games 
    WHERE season = 2025 AND completed = false
  `;
  
  console.log(`   Total upcoming 2025 games: ${upcomingCount[0].count}`);
  
  return {
    currentWeek,
    weeksCollected: weeksToCollect,
    newGamesProcessed: totalNewGames,
    totalUpcoming: parseInt(upcomingCount[0].count)
  };
}

// Auto-run if called directly
if (require.main === module) {
  collectWeeklyGames().catch(console.error);
}

export { collectWeeklyGames, getCurrentWeek };