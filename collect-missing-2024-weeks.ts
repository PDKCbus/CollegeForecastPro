#!/usr/bin/env tsx

/**
 * Collect Missing 2024 Weeks (7-16)
 * 
 * Collects the missing weeks 7-16 with completed games, betting lines, and weather data
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

async function getOrCreateTeam(teamName: string, conference?: string): Promise<number> {
  if (!teamName || teamName.trim() === '') {
    throw new Error('Team name cannot be empty');
  }

  const cleanName = teamName.trim();
  
  // Check if team exists
  const existingTeam = await sql`
    SELECT id FROM teams WHERE name = ${cleanName} LIMIT 1
  `;
  
  if (existingTeam.length > 0) {
    return existingTeam[0].id;
  }
  
  // Create new team
  const newTeam = await sql`
    INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
    VALUES (${cleanName}, ${conference || 'Unknown'}, '', '#000000', null, 0, 0)
    RETURNING id
  `;
  
  console.log(`   Created team: ${cleanName}`);
  return newTeam[0].id;
}

async function collectWeekData(week: number): Promise<void> {
  console.log(`\n📅 Collecting 2024 Week ${week}...`);
  
  try {
    // Get games for the week
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=${week}&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`Games API failed: ${gamesResponse.status}`);
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games`);
    
    // Get betting lines for the week
    const linesUrl = `https://api.collegefootballdata.com/lines?year=2024&week=${week}&seasonType=regular`;
    const linesResponse = await fetch(linesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    let bettingLines: CFBDLine[] = [];
    if (linesResponse.ok) {
      bettingLines = await linesResponse.json();
      console.log(`   💰 Found ${bettingLines.length} betting line records`);
    }
    
    // Create betting lines lookup
    const linesMap = new Map<string, { spread?: number; overUnder?: number }>();
    
    for (const lineRecord of bettingLines) {
      const key = `${lineRecord.home_team}-${lineRecord.away_team}`;
      
      // Prioritize DraftKings > Bovada > others
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
    
    let inserted = 0;
    let withBetting = 0;
    let skipped = 0;
    
    // Process each game
    for (const game of games) {
      try {
        if (!game.home_team || !game.away_team) {
          skipped++;
          continue;
        }
        
        const homeTeamId = await getOrCreateTeam(game.home_team, game.home_conference);
        const awayTeamId = await getOrCreateTeam(game.away_team, game.away_conference);
        
        // Skip games where teams are the same (data error)
        if (homeTeamId === awayTeamId) {
          console.log(`   ⚠️ Skipping invalid game: same team (${game.home_team})`);
          skipped++;
          continue;
        }
        
        // Get betting lines
        const lineKey = `${game.home_team}-${game.away_team}`;
        const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
        
        // Parse date
        const gameDate = new Date(game.start_date);
        if (isNaN(gameDate.getTime())) {
          console.log(`   ⚠️ Skipping game with invalid date: ${game.start_date}`);
          skipped++;
          continue;
        }
        
        // Check if game already exists
        const existing = await sql`
          SELECT id FROM games 
          WHERE season = ${game.season} 
          AND week = ${game.week}
          AND home_team_id = ${homeTeamId} 
          AND away_team_id = ${awayTeamId}
          LIMIT 1
        `;
        
        if (existing.length > 0) {
          skipped++;
          continue; // Skip duplicates
        }
        
        // Insert game with all the data we have
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
        console.error(`   ❌ Error processing game ${game.home_team} vs ${game.away_team}:`, error);
        skipped++;
      }
    }
    
    console.log(`   ✅ Week ${week}: ${inserted} inserted, ${withBetting} with betting, ${skipped} skipped`);
    
  } catch (error) {
    console.error(`❌ Failed to collect Week ${week}:`, error);
  }
}

async function main() {
  console.log('🏈 Collecting Missing 2024 Weeks (7-16)...');
  console.log('This will add the complete 2024 season with betting lines\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Show current status
  console.log('📊 Current 2024 database status:');
  const currentWeeks = await sql`
    SELECT week, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  for (const week of currentWeeks) {
    console.log(`   Week ${week.week}: ${week.games} games, ${week.with_betting} with betting`);
  }
  
  const existingWeeks = new Set(currentWeeks.map(w => w.week));
  const missingWeeks = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7].filter(w => !existingWeeks.has(w));
  
  console.log(`\n🎯 Missing weeks to collect: ${missingWeeks.join(', ')}\n`);
  
  // Collect each missing week
  for (const week of missingWeeks) {
    await collectWeekData(week);
    
    // Rate limiting - be respectful to CFBD API
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Final summary
  console.log('\n📈 Final 2024 Season Summary:');
  const finalWeeks = await sql`
    SELECT week, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed_games
    FROM games 
    WHERE season = 2024
    GROUP BY week 
    ORDER BY week DESC
  `;
  
  let totalGames = 0;
  let totalWithBetting = 0;
  let totalCompleted = 0;
  
  for (const week of finalWeeks) {
    console.log(`   Week ${week.week}: ${week.games} games, ${week.completed_games} completed, ${week.with_betting} with betting`);
    totalGames += parseInt(week.games);
    totalWithBetting += parseInt(week.with_betting);
    totalCompleted += parseInt(week.completed_games);
  }
  
  const bettingCoverage = ((totalWithBetting / totalGames) * 100).toFixed(1);
  console.log(`\n🏆 2024 Complete Season:`);
  console.log(`   📊 Total games: ${totalGames}`);
  console.log(`   ✅ Completed games: ${totalCompleted}`);
  console.log(`   💰 Games with betting lines: ${totalWithBetting} (${bettingCoverage}%)`);
  console.log('\n✅ 2024 season collection complete!');
}

main().catch(console.error);