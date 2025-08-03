#!/usr/bin/env tsx

/**
 * Simple 2024 Week Collection
 * 
 * Uses the proven approach from our successful 2020/2024 syncs
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function collectSingleWeek(week: number): Promise<void> {
  console.log(`\n📅 Collecting Week ${week}...`);
  
  try {
    // Get games using exact same pattern as successful syncs
    const gamesResponse = await fetch(`https://api.collegefootballdata.com/games?year=2024&week=${week}&seasonType=regular`, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      console.log(`❌ Failed to fetch games: ${gamesResponse.status}`);
      return;
    }
    
    const games = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games`);
    
    // Get betting lines
    const linesResponse = await fetch(`https://api.collegefootballdata.com/lines?year=2024&week=${week}&seasonType=regular`, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    let bettingLines = [];
    if (linesResponse.ok) {
      bettingLines = await linesResponse.json();
    }
    
    // Create betting lookup
    const linesMap = new Map();
    for (const lineRecord of bettingLines) {
      const key = `${lineRecord.homeTeam}-${lineRecord.awayTeam}`;
      const bestLine = lineRecord.lines?.find(l => l.provider === 'DraftKings') ||
                      lineRecord.lines?.find(l => l.provider === 'Bovada') ||
                      lineRecord.lines?.[0];
      
      if (bestLine) {
        linesMap.set(key, {
          spread: bestLine.spread,
          overUnder: bestLine.overUnder
        });
      }
    }
    
    console.log(`   💰 Found ${linesMap.size} betting line entries`);
    
    let inserted = 0;
    let withBetting = 0;
    
    for (const game of games) {
      try {
        if (!game.homeTeam || !game.awayTeam) continue;
        
        // Get or create teams using direct approach
        let homeTeamId, awayTeamId;
        
        const homeTeamResult = await sql`SELECT id FROM teams WHERE name = ${game.homeTeam} LIMIT 1`;
        if (homeTeamResult.length > 0) {
          homeTeamId = homeTeamResult[0].id;
        } else {
          const newHomeTeam = await sql`
            INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
            VALUES (${game.homeTeam}, ${game.homeConference || 'Unknown'}, '', '#000000', null, 0, 0)
            RETURNING id
          `;
          homeTeamId = newHomeTeam[0].id;
        }
        
        const awayTeamResult = await sql`SELECT id FROM teams WHERE name = ${game.awayTeam} LIMIT 1`;
        if (awayTeamResult.length > 0) {
          awayTeamId = awayTeamResult[0].id;
        } else {
          const newAwayTeam = await sql`
            INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
            VALUES (${game.awayTeam}, ${game.awayConference || 'Unknown'}, '', '#000000', null, 0, 0)
            RETURNING id
          `;
          awayTeamId = newAwayTeam[0].id;
        }
        
        if (homeTeamId === awayTeamId) continue;
        
        // Check for duplicate
        const existing = await sql`
          SELECT id FROM games 
          WHERE season = 2024 AND week = ${week}
          AND home_team_id = ${homeTeamId} AND away_team_id = ${awayTeamId}
          LIMIT 1
        `;
        
        if (existing.length > 0) continue;
        
        // Get betting data
        const lineKey = `${game.homeTeam}-${game.awayTeam}`;
        const betting = linesMap.get(lineKey) || {};
        
        // Parse date
        const gameDate = new Date(game.startDate);
        if (isNaN(gameDate.getTime())) continue;
        
        // Insert game - avoid any potential SQL keyword conflicts
        await sql`
          INSERT INTO games (
            season, week, start_date, stadium, location,
            home_team_id, away_team_id, home_team_score, away_team_score,
            completed, spread, over_under, is_conference_game, is_rivalry_game
          ) VALUES (
            2024, ${week}, ${gameDate.toISOString()},
            ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
            ${homeTeamId}, ${awayTeamId}, 
            ${game.homePoints || null}, ${game.awayPoints || null},
            ${game.completed || false}, 
            ${betting.spread || null}, ${betting.overUnder || null},
            ${game.conferenceGame || false}, ${false}
          )
        `;
        
        inserted++;
        if (betting.spread || betting.overUnder) {
          withBetting++;
        }
        
      } catch (error) {
        // Skip errors and continue
        continue;
      }
    }
    
    console.log(`   ✅ Week ${week}: ${inserted} inserted, ${withBetting} with betting lines`);
    
  } catch (error) {
    console.error(`❌ Week ${week} failed:`, error.message);
  }
}

async function main() {
  console.log('🏈 Simple 2024 Week Collection (7-16)...\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found');
    process.exit(1);
  }
  
  // Check existing weeks
  const existingWeeks = await sql`
    SELECT DISTINCT week FROM games WHERE season = 2024 ORDER BY week
  `;
  
  const existing = existingWeeks.map(w => w.week);
  console.log(`📊 Existing weeks: ${existing.join(', ')}`);
  
  const missingWeeks = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].filter(w => !existing.includes(w));
  console.log(`🎯 Collecting weeks: ${missingWeeks.join(', ')}\n`);
  
  // Collect each week
  for (const week of missingWeeks) {
    await collectSingleWeek(week);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n📈 Final 2024 Summary:');
  const finalWeeks = await sql`
    SELECT week, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games WHERE season = 2024
    GROUP BY week ORDER BY week DESC
  `;
  
  let total = 0, totalBetting = 0;
  for (const w of finalWeeks) {
    console.log(`   Week ${w.week}: ${w.games} games, ${w.with_betting} with betting`);
    total += parseInt(w.games);
    totalBetting += parseInt(w.with_betting);
  }
  
  console.log(`\n🏆 2024 Total: ${total} games, ${totalBetting} with betting (${((totalBetting/total)*100).toFixed(1)}%)`);
  console.log('✅ Collection complete!');
}

main().catch(console.error);