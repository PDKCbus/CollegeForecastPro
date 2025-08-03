#!/usr/bin/env tsx

/**
 * Fixed 2024 Weeks Collection
 * 
 * Collects weeks 7-16 using correct CFBD API field names (camelCase)
 */

import { neon } from '@neondatabase/serverless';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;      // camelCase!
  neutralSite: boolean;
  conferenceGame: boolean;
  attendance?: number;
  venueId?: number;
  venue?: string;
  homeTeam: string;       // camelCase!
  homeConference?: string;
  homeClassification?: string;
  homePoints?: number;    // camelCase!
  awayTeam: string;       // camelCase!
  awayConference?: string;
  awayClassification?: string;
  awayPoints?: number;    // camelCase!
  completed: boolean;
}

interface CFBDLine {
  id?: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  homeTeam: string;       // camelCase!
  awayTeam: string;       // camelCase!
  lines: Array<{
    provider: string;
    spread?: number;
    formattedSpread?: string;
    spreadOpen?: number;
    overUnder?: number;
    overUnderOpen?: number;
  }>;
}

const sql = neon(process.env.DATABASE_URL!);
const teamIdCache = new Map<string, number>();

async function getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
  if (teamIdCache.has(teamName)) {
    return teamIdCache.get(teamName)!;
  }

  const existingTeam = await sql`
    SELECT id FROM teams WHERE name = ${teamName} LIMIT 1
  `;
  
  if (existingTeam.length > 0) {
    teamIdCache.set(teamName, existingTeam[0].id);
    return existingTeam[0].id;
  }
  
  const newTeam = await sql`
    INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
    VALUES (${teamName}, ${conference || 'Unknown'}, '', '#000000', null, 0, 0)
    RETURNING id
  `;
  
  teamIdCache.set(teamName, newTeam[0].id);
  console.log(`   ➕ Created team: ${teamName}`);
  return newTeam[0].id;
}

async function collectWeekGames(week: number): Promise<void> {
  console.log(`\n📅 Collecting 2024 Week ${week}...`);
  
  try {
    // Get games using correct field names
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=${week}&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API failed: ${gamesResponse.status}`);
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games`);
    
    // Get betting lines (field names might be different too)
    const linesUrl = `https://api.collegefootballdata.com/lines?year=2024&week=${week}&seasonType=regular`;
    const linesResponse = await fetch(linesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    let bettingLines: CFBDLine[] = [];
    if (linesResponse.ok) {
      bettingLines = await linesResponse.json();
    }
    
    // Create betting lines lookup using correct field names
    const linesMap = new Map<string, { spread?: number; overUnder?: number }>();
    
    for (const lineRecord of bettingLines) {
      const key = `${lineRecord.homeTeam}-${lineRecord.awayTeam}`;
      
      let bestLine = lineRecord.lines.find(l => l.provider === 'DraftKings') ||
                    lineRecord.lines.find(l => l.provider === 'Bovada') ||
                    lineRecord.lines[0];
      
      if (bestLine) {
        linesMap.set(key, {
          spread: bestLine.spread,
          overUnder: bestLine.overUnder  // Note: might be overUnder not over_under
        });
      }
    }
    
    console.log(`   💰 Found ${bettingLines.length} betting records, ${linesMap.size} mapped`);
    
    let inserted = 0;
    let withBetting = 0;
    let errors = 0;
    
    // Process each game using correct field names
    for (const game of games) {
      try {
        if (!game.homeTeam || !game.awayTeam) {
          errors++;
          continue;
        }
        
        const homeTeamId = await getOrCreateTeam(game.homeTeam, game.homeConference);
        const awayTeamId = await getOrCreateTeam(game.awayTeam, game.awayConference);
        
        if (homeTeamId === awayTeamId) {
          errors++;
          continue;
        }
        
        // Get betting lines using correct field names
        const lineKey = `${game.homeTeam}-${game.awayTeam}`;
        const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
        
        // Parse date using correct field name
        const gameDate = new Date(game.startDate);  // startDate not start_date
        if (isNaN(gameDate.getTime())) {
          errors++;
          continue;
        }
        
        // Check for duplicate
        const existing = await sql`
          SELECT id FROM games 
          WHERE season = ${game.season} 
          AND week = ${game.week}
          AND home_team_id = ${homeTeamId} 
          AND away_team_id = ${awayTeamId}
          LIMIT 1
        `;
        
        if (existing.length > 0) {
          errors++;
          continue;
        }
        
        // Insert using correct field names
        await sql`
          INSERT INTO games (
            season, week, start_date, stadium, location,
            home_team_id, away_team_id, home_team_score, away_team_score,
            completed, spread, over_under, is_conference_game, is_rivalry_game
          ) VALUES (
            ${game.season}, ${game.week}, ${gameDate.toISOString()},
            ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
            ${homeTeamId}, ${awayTeamId}, 
            ${game.homePoints || null}, ${game.awayPoints || null},  // homePoints/awayPoints not home_points/away_points
            ${game.completed}, ${betting.spread || null}, ${betting.overUnder || null},
            ${game.conferenceGame || false}, ${false}  // conferenceGame not conference_game
          )
        `;
        
        inserted++;
        if (betting.spread !== null || betting.overUnder !== null) {
          withBetting++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error inserting ${game.awayTeam} @ ${game.homeTeam}:`, error);
        errors++;
      }
    }
    
    console.log(`   ✅ Week ${week}: ${inserted} inserted, ${withBetting} with betting, ${errors} errors`);
    
  } catch (error) {
    console.error(`❌ Failed to collect Week ${week}:`, error);
  }
}

async function main() {
  console.log('🏈 Fixed 2024 Weeks Collection (7-16)...');
  console.log('Using correct camelCase field names from CFBD API\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Current database status
  const existingWeeks = await sql`
    SELECT DISTINCT week FROM games WHERE season = 2024 ORDER BY week
  `;
  
  const existingWeekNums = existingWeeks.map(w => w.week);
  console.log(`📊 Current weeks: ${existingWeekNums.join(', ')}`);
  
  const missingWeeks = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16].filter(w => !existingWeekNums.includes(w));
  console.log(`🎯 Missing weeks: ${missingWeeks.join(', ')}\n`);
  
  // Collect missing weeks
  for (const week of missingWeeks) {
    await collectWeekGames(week);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Rate limiting
  }
  
  // Final summary
  console.log('\n📈 Complete 2024 Season Summary:');
  const finalStats = await sql`
    SELECT week, COUNT(*) as games, 
           COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  let totalGames = 0;
  let totalCompleted = 0;
  let totalWithBetting = 0;
  
  for (const stat of finalStats) {
    console.log(`   Week ${stat.week}: ${stat.games} games, ${stat.completed_games} completed, ${stat.with_betting} with betting`);
    totalGames += parseInt(stat.games);
    totalCompleted += parseInt(stat.completed_games);
    totalWithBetting += parseInt(stat.with_betting);
  }
  
  const completionRate = ((totalCompleted / totalGames) * 100).toFixed(1);
  const bettingRate = ((totalWithBetting / totalGames) * 100).toFixed(1);
  
  console.log(`\n🏆 2024 Season Complete:`);
  console.log(`   📊 Total games: ${totalGames}`);
  console.log(`   ✅ Completed: ${totalCompleted} (${completionRate}%)`);
  console.log(`   💰 With betting: ${totalWithBetting} (${bettingRate}%)`);
  console.log('\n✅ 2024 season collection complete!');
}

main().catch(console.error);