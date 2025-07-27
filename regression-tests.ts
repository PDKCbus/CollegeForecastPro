#!/usr/bin/env tsx

/**
 * Regression Tests for Duplicate Game Prevention
 * 
 * This script runs automated tests to ensure duplicate games don't reappear
 * in the upcoming games API endpoint.
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function testUpcomingGamesDuplicates() {
  console.log('🧪 Testing upcoming games for duplicates...');
  
  // Test 1: Database level duplicates
  const dbDuplicates = await sql`
    SELECT home_team_id, away_team_id, start_date, COUNT(*) as duplicate_count
    FROM games 
    WHERE season = 2025 AND completed = false
    GROUP BY home_team_id, away_team_id, start_date
    HAVING COUNT(*) > 1
  `;
  
  console.log(`Database duplicates: ${dbDuplicates.length}`);
  
  // Test 2: API endpoint test
  try {
    const response = await fetch('http://localhost:5000/api/games/upcoming');
    const data = await response.json();
    
    const games = data.games || [];
    const uniqueMatchups = new Set();
    const duplicateMatchups = [];
    
    for (const game of games) {
      const matchupKey = `${game.homeTeam.id}-${game.awayTeam.id}-${game.startDate}`;
      
      if (uniqueMatchups.has(matchupKey)) {
        duplicateMatchups.push(matchupKey);
      }
      uniqueMatchups.add(matchupKey);
    }
    
    console.log(`API games returned: ${games.length}`);
    console.log(`Unique matchups: ${uniqueMatchups.size}`);
    console.log(`API duplicates: ${duplicateMatchups.length}`);
    
    if (duplicateMatchups.length > 0) {
      console.log('⚠️  Duplicate matchups found:', duplicateMatchups);
    }
    
    return {
      dbDuplicates: dbDuplicates.length,
      apiGames: games.length,
      uniqueMatchups: uniqueMatchups.size,
      apiDuplicates: duplicateMatchups.length,
      passed: dbDuplicates.length === 0 && duplicateMatchups.length === 0
    };
    
  } catch (error) {
    console.error('Error testing API:', error);
    return {
      dbDuplicates: dbDuplicates.length,
      apiGames: 0,
      uniqueMatchups: 0,
      apiDuplicates: 0,
      passed: false,
      error: error.message
    };
  }
}

async function testHistoricalGamesDuplicates() {
  console.log('\n🧪 Testing historical games for duplicates...');
  
  const dbDuplicates = await sql`
    SELECT season, week, home_team_id, away_team_id, COUNT(*) as duplicate_count
    FROM games 
    WHERE completed = true
    GROUP BY season, week, home_team_id, away_team_id
    HAVING COUNT(*) > 1
  `;
  
  console.log(`Historical duplicates: ${dbDuplicates.length}`);
  
  return {
    historicalDuplicates: dbDuplicates.length,
    passed: dbDuplicates.length === 0
  };
}

async function main() {
  console.log('🔄 Running Regression Tests for Duplicate Prevention\n');
  
  const upcomingTest = await testUpcomingGamesDuplicates();
  const historicalTest = await testHistoricalGamesDuplicates();
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Upcoming games: ${upcomingTest.passed ? 'PASS' : 'FAIL'}`);
  console.log(`   - DB duplicates: ${upcomingTest.dbDuplicates}`);
  console.log(`   - API games: ${upcomingTest.apiGames}`);
  console.log(`   - Unique matchups: ${upcomingTest.uniqueMatchups}`);
  console.log(`   - API duplicates: ${upcomingTest.apiDuplicates}`);
  
  console.log(`✅ Historical games: ${historicalTest.passed ? 'PASS' : 'FAIL'}`);
  console.log(`   - Historical duplicates: ${historicalTest.historicalDuplicates}`);
  
  const allTestsPassed = upcomingTest.passed && historicalTest.passed;
  console.log(`\n🎯 Overall: ${allTestsPassed ? 'ALL TESTS PASS' : 'TESTS FAILED'}`);
  
  if (!allTestsPassed) {
    process.exit(1);
  }
}

main().catch(console.error);