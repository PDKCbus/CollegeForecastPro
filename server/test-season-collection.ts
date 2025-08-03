/**
 * Test Season Collection - Collect one season to verify CFBD API is working
 * This will test 2020 season which should have 300+ completed games
 */

import { db } from "./db";
import { games, teams } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  completed: boolean;
  home_team: string;
  home_points?: number;
  away_team: string;
  away_points?: number;
  home_id?: number;
  away_id?: number;
}

export async function testCollectSeason2020(): Promise<void> {
  const apiKey = process.env.CFBD_API_KEY;
  if (!apiKey) {
    console.error('❌ CFBD_API_KEY environment variable required');
    return;
  }

  console.log('🧪 Testing CFBD API collection for 2020 season...');

  try {
    // Make request to CFBD API
    const url = `https://api.collegefootballdata.com/games?year=2020&seasonType=regular`;
    console.log(`🌐 Requesting: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ CFBD API error: ${response.status} ${response.statusText}`);
      return;
    }

    const allGames = await response.json() as CFBDGame[];
    console.log(`📊 CFBD returned ${allGames.length} games for 2020`);

    // Filter to completed games with scores
    const completedGames = allGames.filter(game => 
      game.completed === true && 
      typeof game.home_points === 'number' && 
      typeof game.away_points === 'number' &&
      game.home_points !== null && 
      game.away_points !== null
    );

    console.log(`🏈 Found ${completedGames.length} COMPLETED games with actual scores`);

    if (completedGames.length === 0) {
      console.log('❌ No completed games found - check CFBD API response format');
      console.log('Sample game:', JSON.stringify(allGames[0], null, 2));
      return;
    }

    // Show sample of what we found
    console.log('\n📋 Sample completed games:');
    completedGames.slice(0, 3).forEach((game, i) => {
      console.log(`${i + 1}. ${game.away_team} @ ${game.home_team}: ${game.away_points}-${game.home_points} (Week ${game.week})`);
    });

    console.log(`\n✅ SUCCESS! CFBD API is working and provides ${completedGames.length} completed 2020 games`);
    console.log(`📈 Expected similar numbers for each season (2009-2024)`);
    console.log(`🎯 Total expected across 15 years: ~${completedGames.length * 15} games`);

  } catch (error) {
    console.error('❌ Error testing CFBD API:', error);
  }
}

// Quick test runner
if (require.main === module) {
  testCollectSeason2020().catch(console.error);
}