#!/usr/bin/env tsx

/**
 * Collect Recent 2024 Weeks
 * 
 * Checks what's actually available from CFBD API and collects missing recent weeks
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

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('🔍 Checking available 2024 weeks from CFBD API...\n');
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  try {
    // Check what weeks are actually available from CFBD
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    if (!gamesResponse.ok) {
      throw new Error(`CFBD API failed: ${gamesResponse.status}`);
    }
    
    const games: CFBDGame[] = await gamesResponse.json();
    console.log(`📊 Total 2024 games available from CFBD: ${games.length}`);
    
    // Analyze weeks available
    const weekStats = new Map<number, { total: number; completed: number; latest_date: string }>();
    
    for (const game of games) {
      if (!weekStats.has(game.week)) {
        weekStats.set(game.week, { total: 0, completed: 0, latest_date: game.start_date });
      }
      
      const stats = weekStats.get(game.week)!;
      stats.total++;
      if (game.completed) stats.completed++;
      
      // Update latest date for this week
      if (game.start_date > stats.latest_date) {
        stats.latest_date = game.start_date;
      }
    }
    
    console.log('\n📅 Available weeks from CFBD API:');
    const sortedWeeks = Array.from(weekStats.entries()).sort((a, b) => b[0] - a[0]);
    
    for (const [week, stats] of sortedWeeks) {
      const latestGameDate = new Date(stats.latest_date).toLocaleDateString();
      console.log(`   Week ${week}: ${stats.total} games, ${stats.completed} completed (latest: ${latestGameDate})`);
    }
    
    // Check what we have in our database
    console.log('\n📊 Current database status:');
    const dbStats = await sql`
      SELECT week, COUNT(*) as total_games, 
             COUNT(CASE WHEN completed = true THEN 1 END) as completed_games,
             COUNT(CASE WHEN spread IS NOT NULL OR over_under IS NOT NULL THEN 1 END) as with_betting,
             MAX(start_date) as latest_date
      FROM games 
      WHERE season = 2024
      GROUP BY week 
      ORDER BY week DESC
    `;
    
    for (const stat of dbStats) {
      const latestDate = new Date(stat.latest_date).toLocaleDateString();
      console.log(`   Week ${stat.week}: ${stat.total_games} games, ${stat.completed_games} completed, ${stat.with_betting} with betting (latest: ${latestDate})`);
    }
    
    // Find missing weeks
    const dbWeeks = new Set(dbStats.map(s => s.week));
    const cfbdWeeks = new Set(weekStats.keys());
    const missingWeeks = Array.from(cfbdWeeks).filter(week => !dbWeeks.has(week)).sort((a, b) => b - a);
    
    if (missingWeeks.length > 0) {
      console.log(`\n🎯 Missing weeks to collect: ${missingWeeks.join(', ')}`);
      
      // Here you could add collection logic for missing weeks
      console.log('\nTo collect missing weeks, run the appropriate collection script.');
    } else {
      console.log('\n✅ All available weeks are present in database');
      
      // Check for weeks that might need more recent games
      const latestCfbdWeek = Math.max(...cfbdWeeks);
      const latestDbWeek = Math.max(...dbWeeks);
      
      if (latestCfbdWeek > latestDbWeek) {
        console.log(`\n📈 CFBD has newer week: ${latestCfbdWeek} vs DB: ${latestDbWeek}`);
      } else {
        console.log(`\n📊 Database is up to date with latest CFBD week: ${latestDbWeek}`);
        
        // Check if we need to update completed games
        const latestWeekFromCfbd = weekStats.get(latestDbWeek);
        const latestWeekFromDb = dbStats.find(s => s.week === latestDbWeek);
        
        if (latestWeekFromCfbd && latestWeekFromDb) {
          console.log(`\nWeek ${latestDbWeek} comparison:`);
          console.log(`   CFBD: ${latestWeekFromCfbd.total} total, ${latestWeekFromCfbd.completed} completed`);
          console.log(`   DB:   ${latestWeekFromDb.total_games} total, ${latestWeekFromDb.completed_games} completed`);
          
          if (latestWeekFromCfbd.completed > latestWeekFromDb.completed_games) {
            console.log(`\n🎯 Week ${latestDbWeek} has more completed games in CFBD - consider updating scores`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking CFBD data:', error);
  }
}

main().catch(console.error);