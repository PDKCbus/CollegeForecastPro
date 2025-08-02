#!/usr/bin/env tsx

/**
 * Add Betting Lines for Weeks 12-16
 * 
 * The late season/championship weeks exist but don't have betting lines
 * This adds betting data to make them visible in our betting-only filter
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function addBettingLinesForWeek(year: number, week: number): Promise<void> {
  console.log(`\n💰 Adding betting lines for ${year} Week ${week}...`);
  
  try {
    // Get betting lines from CFBD API
    const linesUrl = `https://api.collegefootballdata.com/lines?year=${year}&week=${week}&seasonType=regular`;
    const linesResponse = await fetch(linesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!linesResponse.ok) {
      console.log(`   ❌ Failed to fetch betting lines: ${linesResponse.status}`);
      return;
    }
    
    const bettingLines = await linesResponse.json();
    console.log(`   📊 Found ${bettingLines.length} betting line records`);
    
    let updated = 0;
    
    for (const lineRecord of bettingLines) {
      try {
        // Get best betting line (DraftKings > Bovada > first available)
        const bestLine = lineRecord.lines?.find(l => l.provider === 'DraftKings') ||
                         lineRecord.lines?.find(l => l.provider === 'Bovada') ||
                         lineRecord.lines?.[0];
        
        if (!bestLine || (bestLine.spread === undefined && bestLine.overUnder === undefined)) {
          continue;
        }
        
        // Find matching game in database using team names
        const matchingGames = await sql`
          SELECT g.id, g.spread, g.over_under, ht.name as home_team, at.name as away_team
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = ${year} 
          AND g.week = ${week}
          AND ht.name = ${lineRecord.homeTeam}
          AND at.name = ${lineRecord.awayTeam}
          LIMIT 1
        `;
        
        if (matchingGames.length === 0) {
          continue; // No matching game found
        }
        
        const game = matchingGames[0];
        
        // Update if betting lines are missing
        const needsUpdate = (
          (bestLine.spread !== undefined && game.spread === null) ||
          (bestLine.overUnder !== undefined && game.over_under === null)
        );
        
        if (needsUpdate) {
          await sql`
            UPDATE games 
            SET spread = ${bestLine.spread || null},
                over_under = ${bestLine.overUnder || null}
            WHERE id = ${game.id}
          `;
          
          updated++;
          console.log(`   ✅ Updated ${lineRecord.awayTeam} @ ${lineRecord.homeTeam}: Spread ${bestLine.spread}, O/U ${bestLine.overUnder}`);
        }
        
      } catch (error) {
        continue; // Skip errors and continue
      }
    }
    
    console.log(`   📈 Week ${week}: Updated ${updated} games with betting lines`);
    
  } catch (error) {
    console.error(`❌ Failed to update Week ${week}:`, error.message);
  }
}

async function main() {
  console.log('🏈 Adding Betting Lines for Late Season Weeks (12-16)...');
  console.log('This will make championship weeks visible in betting filter\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Check current betting coverage for weeks 12-16
  console.log('📊 Current late season betting coverage:');
  const currentStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2024 AND week >= 12
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const stat of currentStats) {
    const coverage = stat.total_games > 0 ? ((stat.with_betting / stat.total_games) * 100).toFixed(1) : '0.0';
    console.log(`   Week ${stat.week}: ${stat.with_betting}/${stat.total_games} games (${coverage}%)`);
  }
  
  // Add betting lines for weeks 12-16
  const weeksToUpdate = [16, 15, 14, 13, 12];
  
  for (const week of weeksToUpdate) {
    await addBettingLinesForWeek(2024, week);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
  
  // Final summary
  console.log('\n📈 Updated late season betting coverage:');
  const finalStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2024 AND week >= 12
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const stat of finalStats) {
    const coverage = stat.total_games > 0 ? ((stat.with_betting / stat.total_games) * 100).toFixed(1) : '0.0';
    console.log(`   Week ${stat.week}: ${stat.with_betting}/${stat.total_games} games (${coverage}%)`);
  }
  
  // Check if we now have December games showing in historical
  const latestGamesWithBetting = await sql`
    SELECT g.week, g.start_date, ht.name as home_team, at.name as away_team, g.spread, g.over_under
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.season = 2024 AND (g.spread IS NOT NULL OR g.over_under IS NOT NULL)
    ORDER BY g.start_date DESC
    LIMIT 5
  `;
  
  console.log('\n📅 Most recent games with betting lines:');
  for (const game of latestGamesWithBetting) {
    const gameDate = new Date(game.start_date).toLocaleDateString();
    console.log(`   Week ${game.week}: ${game.away_team} @ ${game.home_team} (${gameDate}) - Spread: ${game.spread}, O/U: ${game.over_under}`);
  }
  
  console.log('\n✅ Betting lines update complete!');
}

main().catch(console.error);