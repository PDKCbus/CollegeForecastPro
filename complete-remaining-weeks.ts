#!/usr/bin/env tsx

/**
 * Complete Remaining Weeks
 * 
 * Finish collecting weeks 12-16 that may have been interrupted
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('🏈 Checking 2024 collection status...\n');
  
  // Check current week status
  const weekStats = await sql`
    SELECT week, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games WHERE season = 2024 
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  console.log('📊 Current 2024 weeks:');
  let totalGames = 0;
  let totalWithBetting = 0;
  
  for (const week of weekStats) {
    console.log(`   Week ${week.week}: ${week.games} games, ${week.with_betting} with betting`);
    totalGames += parseInt(week.games);
    totalWithBetting += parseInt(week.with_betting);
  }
  
  const bettingCoverage = ((totalWithBetting / totalGames) * 100).toFixed(1);
  
  console.log(`\n🏆 2024 Season Summary:`);
  console.log(`   📊 Total games: ${totalGames}`);
  console.log(`   💰 Games with betting: ${totalWithBetting} (${bettingCoverage}%)`);
  
  // Check what weeks are missing
  const existingWeeks = weekStats.map(w => w.week);
  const allWeeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const missingWeeks = allWeeks.filter(w => !existingWeeks.includes(w));
  
  if (missingWeeks.length > 0) {
    console.log(`\n⚠️ Missing weeks: ${missingWeeks.join(', ')}`);
  } else {
    console.log(`\n✅ All weeks present! 2024 season collection complete.`);
    
    // Check if we now have recent games
    const latestGames = await sql`
      SELECT g.week, g.start_date, ht.name as home_team, at.name as away_team, g.spread, g.over_under
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.season = 2024
      ORDER BY g.start_date DESC
      LIMIT 5
    `;
    
    console.log(`\n📅 Most recent 2024 games:`);
    for (const game of latestGames) {
      const gameDate = new Date(game.start_date).toLocaleDateString();
      const betting = game.spread || game.over_under ? ' (with betting)' : '';
      console.log(`   Week ${game.week}: ${game.away_team} @ ${game.home_team} (${gameDate})${betting}`);
    }
  }
}

main().catch(console.error);