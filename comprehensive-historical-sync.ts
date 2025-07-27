#!/usr/bin/env tsx

/**
 * Comprehensive Historical Sync
 * 
 * Collects all missing years (2009-2023) using proven CFBD API patterns
 * Handles camelCase field names correctly to avoid API integration issues
 */

import { neon } from '@neondatabase/serverless';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  seasonType: string;
  startDate: string;      // camelCase from CFBD API
  neutralSite: boolean;
  conferenceGame: boolean;
  attendance?: number;
  venueId?: number;
  venue?: string;
  homeTeam: string;       // camelCase from CFBD API  
  homeConference?: string;
  homeClassification?: string;
  homePoints?: number;    // camelCase from CFBD API
  awayTeam: string;       // camelCase from CFBD API
  awayConference?: string;
  awayClassification?: string;
  awayPoints?: number;    // camelCase from CFBD API
  completed: boolean;
}

interface CFBDLine {
  season: number;
  week: number;
  seasonType: string;
  startDate: string;
  homeTeam: string;       // camelCase from CFBD API
  awayTeam: string;       // camelCase from CFBD API
  lines: Array<{
    provider: string;
    spread?: number;
    formattedSpread?: string;
    spreadOpen?: number;
    overUnder?: number;     // camelCase from CFBD API
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
  return newTeam[0].id;
}

async function collectSeasonData(year: number): Promise<void> {
  console.log(`\n🏈 Collecting ${year} season...`);
  
  try {
    // Get all games for the year using correct field names
    const gamesUrl = `https://api.collegefootballdata.com/games?year=${year}&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      console.log(`❌ Failed to fetch ${year} games: ${gamesResponse.status}`);
      return;
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`   📊 Found ${games.length} games`);
    
    // Get betting lines for the year
    const linesUrl = `https://api.collegefootballdata.com/lines?year=${year}&seasonType=regular`;
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
      const key = `${lineRecord.homeTeam}-${lineRecord.awayTeam}-${lineRecord.week}`;
      
      let bestLine = lineRecord.lines.find(l => l.provider === 'DraftKings') ||
                    lineRecord.lines.find(l => l.provider === 'Bovada') ||
                    lineRecord.lines[0];
      
      if (bestLine) {
        linesMap.set(key, {
          spread: bestLine.spread,
          overUnder: bestLine.overUnder  // camelCase field name
        });
      }
    }
    
    console.log(`   💰 Found ${bettingLines.length} betting records, ${linesMap.size} mapped`);
    
    let inserted = 0;
    let withBetting = 0;
    let skipped = 0;
    
    // Process games in batches to handle large years
    const batchSize = 100;
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      
      for (const game of batch) {
        try {
          if (!game.homeTeam || !game.awayTeam) {
            skipped++;
            continue;
          }
          
          const homeTeamId = await getOrCreateTeam(game.homeTeam, game.homeConference);
          const awayTeamId = await getOrCreateTeam(game.awayTeam, game.awayConference);
          
          if (homeTeamId === awayTeamId) {
            skipped++;
            continue;
          }
          
          // Check for duplicate using correct field names
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
            continue;
          }
          
          // Get betting data using correct field names and week
          const lineKey = `${game.homeTeam}-${game.awayTeam}-${game.week}`;
          const betting = linesMap.get(lineKey) || { spread: null, overUnder: null };
          
          // Parse date using correct field name
          const gameDate = new Date(game.startDate);  // startDate not start_date
          if (isNaN(gameDate.getTime())) {
            skipped++;
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
              ${game.homePoints || null}, ${game.awayPoints || null},  // camelCase field names
              ${game.completed}, ${betting.spread || null}, ${betting.overUnder || null},
              ${game.conferenceGame || false}, ${false}  // camelCase field name
            )
          `;
          
          inserted++;
          if (betting.spread !== null || betting.overUnder !== null) {
            withBetting++;
          }
          
        } catch (error) {
          skipped++;
          continue;
        }
      }
      
      // Progress indicator for large batches
      if (i % (batchSize * 5) === 0) {
        console.log(`   Progress: ${i}/${games.length} games processed...`);
      }
    }
    
    console.log(`   ✅ ${year}: ${inserted} inserted, ${withBetting} with betting, ${skipped} skipped`);
    
  } catch (error) {
    console.error(`❌ Failed to collect ${year}:`, error.message);
  }
}

async function main() {
  console.log('🏈 Comprehensive Historical Sync (2009-2023)...');
  console.log('Using proven CFBD API patterns with correct camelCase field names\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  // Check which years we already have
  console.log('📊 Current database status:');
  const existingYears = await sql`
    SELECT season, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed
    FROM games 
    GROUP BY season 
    ORDER BY season DESC
  `;
  
  for (const year of existingYears) {
    console.log(`   ${year.season}: ${year.games} games, ${year.completed} completed, ${year.with_betting} with betting`);
  }
  
  const existingSeasons = new Set(existingYears.map(y => y.season));
  
  // Define missing years (2009-2023, excluding 2024 which we just completed)
  const allYears = [];
  for (let year = 2009; year <= 2023; year++) {
    allYears.push(year);
  }
  
  const missingYears = allYears.filter(year => !existingSeasons.has(year));
  console.log(`\n🎯 Missing years to collect: ${missingYears.join(', ')}`);
  
  if (missingYears.length === 0) {
    console.log('✅ All years present! Historical collection complete.');
    return;
  }
  
  // Collect missing years in chronological order (oldest first for historical context)
  missingYears.sort((a, b) => a - b);
  
  for (const year of missingYears) {
    await collectSeasonData(year);
    
    // Rate limiting between years - be respectful to CFBD API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final comprehensive summary
  console.log('\n📈 Complete Historical Database Summary:');
  const finalYears = await sql`
    SELECT season, COUNT(*) as games, 
           COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
           COUNT(CASE WHEN completed = true THEN 1 END) as completed
    FROM games 
    GROUP BY season 
    ORDER BY season DESC
  `;
  
  let totalGames = 0;
  let totalCompleted = 0;
  let totalWithBetting = 0;
  
  for (const year of finalYears) {
    console.log(`   ${year.season}: ${year.games} games, ${year.completed} completed, ${year.with_betting} with betting`);
    totalGames += parseInt(year.games);
    totalCompleted += parseInt(year.completed);
    totalWithBetting += parseInt(year.with_betting);
  }
  
  const completionRate = ((totalCompleted / totalGames) * 100).toFixed(1);
  const bettingRate = ((totalWithBetting / totalGames) * 100).toFixed(1);
  const yearSpan = `${Math.min(...finalYears.map(y => y.season))}-${Math.max(...finalYears.map(y => y.season))}`;
  
  console.log(`\n🏆 Complete Historical Collection (${yearSpan}):`);
  console.log(`   📊 Total games: ${totalGames.toLocaleString()}`);
  console.log(`   ✅ Completed: ${totalCompleted.toLocaleString()} (${completionRate}%)`);
  console.log(`   💰 With betting: ${totalWithBetting.toLocaleString()} (${bettingRate}%)`);
  console.log(`   📅 Years covered: ${finalYears.length} seasons`);
  console.log('\n✅ Comprehensive historical sync complete!');
}

main().catch(console.error);