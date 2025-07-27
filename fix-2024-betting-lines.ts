#!/usr/bin/env tsx

/**
 * Fix 2024 Betting Lines
 * 
 * Updates existing 2024 games with missing betting lines from CFBD API
 */

import { neon } from '@neondatabase/serverless';

interface CFBDLine {
  id?: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  away_team: string;
  lines: Array<{
    provider: string;
    spread?: number;
    formatted_spread?: string;
    spread_open?: number;
    over_under?: number;
    over_under_open?: number;
  }>;
}

const sql = neon(process.env.DATABASE_URL!);

async function fixWeekBettingLines(week: number): Promise<void> {
  console.log(`\n🎯 Fixing betting lines for 2024 Week ${week}...`);
  
  try {
    // Get betting lines for the week
    const linesUrl = `https://api.collegefootballdata.com/lines?year=2024&week=${week}&seasonType=regular`;
    const linesResponse = await fetch(linesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!linesResponse.ok) {
      console.log(`❌ Failed to fetch betting lines for week ${week}`);
      return;
    }
    
    const bettingLines: CFBDLine[] = await linesResponse.json();
    console.log(`📊 Found ${bettingLines.length} betting line records`);
    
    // Process each betting line record
    let updated = 0;
    
    for (const lineRecord of bettingLines) {
      try {
        // Find the best betting line (prioritize DraftKings > Bovada > others)
        let bestLine = lineRecord.lines.find(l => l.provider === 'DraftKings') ||
                      lineRecord.lines.find(l => l.provider === 'Bovada') ||
                      lineRecord.lines[0];
        
        if (!bestLine || (bestLine.spread === undefined && bestLine.over_under === undefined)) {
          continue;
        }
        
        // Find matching game in database
        const matchingGames = await sql`
          SELECT g.id, g.spread, g.over_under, ht.name as home_team, at.name as away_team
          FROM games g
          JOIN teams ht ON g.home_team_id = ht.id
          JOIN teams at ON g.away_team_id = at.id
          WHERE g.season = 2024 
          AND g.week = ${week}
          AND ht.name = ${lineRecord.home_team}
          AND at.name = ${lineRecord.away_team}
          LIMIT 1
        `;
        
        if (matchingGames.length === 0) {
          continue; // No matching game found
        }
        
        const game = matchingGames[0];
        
        // Update if betting lines are missing or different
        const needsUpdate = (
          (bestLine.spread !== undefined && game.spread === null) ||
          (bestLine.over_under !== undefined && game.over_under === null)
        );
        
        if (needsUpdate) {
          await sql`
            UPDATE games 
            SET spread = ${bestLine.spread || null},
                over_under = ${bestLine.over_under || null}
            WHERE id = ${game.id}
          `;
          
          updated++;
          console.log(`✅ Updated ${lineRecord.away_team} @ ${lineRecord.home_team}: Spread ${bestLine.spread}, O/U ${bestLine.over_under}`);
        }
        
      } catch (error) {
        console.error(`Error updating betting lines for ${lineRecord.away_team} @ ${lineRecord.home_team}:`, error);
      }
    }
    
    console.log(`📈 Week ${week}: Updated ${updated} games with betting lines`);
    
  } catch (error) {
    console.error(`❌ Failed to fix Week ${week} betting lines:`, error);
  }
}

async function main() {
  console.log('🏈 Fixing 2024 Season Betting Lines...');
  console.log('This will update existing games with missing betting data\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Check current betting coverage
  console.log('📊 Current 2024 betting line coverage:');
  const currentStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           ROUND(COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as coverage_pct
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const stat of currentStats) {
    console.log(`   Week ${stat.week}: ${stat.with_betting}/${stat.total_games} games (${stat.coverage_pct}%)`);
  }
  
  // Fix betting lines for weeks 7-15 (and update earlier weeks if needed)
  const weeksToFix = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  
  for (const week of weeksToFix) {
    await fixWeekBettingLines(week);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n📈 Final 2024 betting line coverage:');
  const finalStats = await sql`
    SELECT week, COUNT(*) as total_games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           ROUND(COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 1) as coverage_pct
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  let totalGames = 0;
  let totalWithBetting = 0;
  
  for (const stat of finalStats) {
    console.log(`   Week ${stat.week}: ${stat.with_betting}/${stat.total_games} games (${stat.coverage_pct}%)`);
    totalGames += parseInt(stat.total_games);
    totalWithBetting += parseInt(stat.with_betting);
  }
  
  const overallCoverage = ((totalWithBetting / totalGames) * 100).toFixed(1);
  console.log(`\n🏆 2024 Season: ${totalWithBetting}/${totalGames} games with betting lines (${overallCoverage}%)`);
  console.log('✅ Betting lines update complete!');
}

main().catch(console.error);