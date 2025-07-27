#!/usr/bin/env tsx

/**
 * Direct Missing Weeks Insert
 * 
 * Directly inserts weeks 7-16 that are completely missing from the database
 */

import { neon } from '@neondatabase/serverless';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
  completed: boolean;
}

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

// Map to cache team IDs
const teamIdCache = new Map<string, number>();

async function getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
  if (teamIdCache.has(teamName)) {
    return teamIdCache.get(teamName)!;
  }

  // Check if team exists
  const existingTeam = await sql`
    SELECT id FROM teams WHERE name = ${teamName} LIMIT 1
  `;
  
  if (existingTeam.length > 0) {
    teamIdCache.set(teamName, existingTeam[0].id);
    return existingTeam[0].id;
  }
  
  // Create new team
  const newTeam = await sql`
    INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
    VALUES (${teamName}, ${conference || 'Unknown'}, '', '#000000', null, 0, 0)
    RETURNING id
  `;
  
  teamIdCache.set(teamName, newTeam[0].id);
  console.log(`   ➕ Created team: ${teamName}`);
  return newTeam[0].id;
}

async function insertWeekGames(week: number): Promise<void> {
  console.log(`\n📅 Inserting 2024 Week ${week}...`);
  
  try {
    // Get games from CFBD
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=${week}&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API failed: ${gamesResponse.status}`);
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games`);
    
    // Get betting lines
    const linesUrl = `https://api.collegefootballdata.com/lines?year=2024&week=${week}&seasonType=regular`;
    const linesResponse = await fetch(linesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    let bettingLines: CFBDLine[] = [];
    if (linesResponse.ok) {
      bettingLines = await linesResponse.json();
    }
    
    // Create betting lines lookup
    const linesMap = new Map<string, { spread?: number; overUnder?: number }>();
    
    for (const lineRecord of bettingLines) {
      const key = `${lineRecord.home_team}-${lineRecord.away_team}`;
      
      let bestLine = lineRecord.lines.find(l => l.provider === 'DraftKings') ||
                    lineRecord.lines.find(l => l.provider === 'Bovada') ||
                    lineRecord.lines[0];
      
      if (bestLine) {
        linesMap.set(key, {
          spread: bestLine.spread,
          overUnder: bestLine.over_under
        });
      }
    }
    
    console.log(`   💰 Found ${bettingLines.length} betting records, ${linesMap.size} mapped`);
    
    let inserted = 0;
    let withBetting = 0;
    let errors = 0;
    
    // Insert each game
    for (const game of games) {
      try {
        if (!game.home_team || !game.away_team) {
          errors++;
          continue;
        }
        
        const homeTeamId = await getOrCreateTeam(game.home_team, game.home_conference);
        const awayTeamId = await getOrCreateTeam(game.away_team, game.away_conference);
        
        if (homeTeamId === awayTeamId) {
          errors++;
          continue;
        }
        
        // Get betting lines
        const lineKey = `${game.home_team}-${game.away_team}`;
        const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
        
        // Parse date
        const gameDate = new Date(game.start_date);
        if (isNaN(gameDate.getTime())) {
          errors++;
          continue;
        }
        
        // Insert directly without duplicate check since week is missing
        await sql`
          INSERT INTO games (
            season, week, start_date, stadium, location,
            home_team_id, away_team_id, home_team_score, away_team_score,
            completed, spread, over_under, is_conference_game, is_rivalry_game
          ) VALUES (
            ${game.season}, ${game.week}, ${gameDate.toISOString()},
            ${game.venue || 'TBD'}, ${game.venue || 'TBD'},
            ${homeTeamId}, ${awayTeamId}, 
            ${game.home_points || null}, ${game.away_points || null},
            ${game.completed}, ${betting.spread || null}, ${betting.overUnder || null},
            ${game.conference_game || false}, ${false}
          )
        `;
        
        inserted++;
        if (betting.spread !== null || betting.overUnder !== null) {
          withBetting++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error inserting ${game.away_team} @ ${game.home_team}:`, error);
        errors++;
      }
    }
    
    console.log(`   ✅ Week ${week}: ${inserted} inserted, ${withBetting} with betting, ${errors} errors`);
    
  } catch (error) {
    console.error(`❌ Failed to insert Week ${week}:`, error);
  }
}

async function main() {
  console.log('🏈 Direct Missing Weeks Insert for 2024...');
  console.log('This will insert weeks 7-16 that are missing from the database\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Check which weeks we currently have
  const existingWeeks = await sql`
    SELECT DISTINCT week FROM games WHERE season = 2024 ORDER BY week
  `;
  
  const existingWeekNums = existingWeeks.map(w => w.week);
  console.log(`📊 Current weeks in database: ${existingWeekNums.join(', ')}`);
  
  // Determine missing weeks (typically 7-16 for full season)
  const allWeeks = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const missingWeeks = allWeeks.filter(w => !existingWeekNums.includes(w));
  
  console.log(`🎯 Missing weeks to insert: ${missingWeeks.join(', ')}\n`);
  
  if (missingWeeks.length === 0) {
    console.log('✅ No missing weeks found!');
    return;
  }
  
  // Insert each missing week
  for (const week of missingWeeks) {
    await insertWeekGames(week);
    
    // Rate limiting - be nice to CFBD API
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Final summary
  console.log('\n📈 Final 2024 Season Summary:');
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
  
  console.log(`\n🏆 Complete 2024 Season:`);
  console.log(`   📊 Total games: ${totalGames}`);
  console.log(`   ✅ Completed: ${totalCompleted} (${completionRate}%)`);
  console.log(`   💰 With betting: ${totalWithBetting} (${bettingRate}%)`);
  console.log('\n✅ 2024 season now complete!');
}

main().catch(console.error);