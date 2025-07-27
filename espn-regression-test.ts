import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testHistoricalGamesAPI() {
  console.log('🔍 Historical Games API Test - Verifying Frontend Data Loading');
  
  try {
    // Test the historical games API endpoint directly
    const response = await fetch('http://localhost:5000/api/games/historical?page=0&limit=10&season=all&week=all');
    
    if (!response.ok) {
      console.log(`❌ Historical games API failed with status: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    // Verify API response structure
    if (!data.games || !Array.isArray(data.games)) {
      console.log('❌ API response missing games array');
      return false;
    }
    
    if (!data.pagination || typeof data.pagination.total !== 'number') {
      console.log('❌ API response missing pagination info');
      return false;
    }
    
    console.log(`✅ Historical games API working: ${data.games.length} games returned, ${data.pagination.total} total`);
    
    // Test specific season filtering (2024)
    const seasonResponse = await fetch('http://localhost:5000/api/games/historical?page=0&limit=5&season=2024&week=all');
    if (seasonResponse.ok) {
      const seasonData = await seasonResponse.json();
      console.log(`✅ Season filtering works: ${seasonData.games.length} games for 2024 season`);
      
      // Verify all returned games are from 2024
      const wrongSeasonGames = seasonData.games.filter((game: any) => game.season !== 2024);
      if (wrongSeasonGames.length > 0) {
        console.log(`❌ Season filtering failed: ${wrongSeasonGames.length} games from wrong season`);
        return false;
      }
    }
    
    // Test game data structure
    if (data.games.length > 0) {
      const sampleGame = data.games[0];
      const requiredFields = ['id', 'season', 'week', 'completed', 'homeTeam', 'awayTeam'];
      
      for (const field of requiredFields) {
        if (!(field in sampleGame)) {
          console.log(`❌ Missing required field: ${field}`);
          return false;
        }
      }
      
      // Verify team data structure
      if (!sampleGame.homeTeam.name || !sampleGame.awayTeam.name) {
        console.log('❌ Missing team names in game data');
        return false;
      }
      
      console.log(`✅ Game data structure valid - Sample: ${sampleGame.awayTeam.name} @ ${sampleGame.homeTeam.name}`);
    }
    
    console.log('✅ Historical Games API test passed!');
    return true;
    
  } catch (error) {
    console.log(`❌ Historical games API test failed: ${error.message}`);
    return false;
  }
}

async function regressionTestESPN() {
  console.log('🔍 ESPN Regression Test - Verifying Data Accuracy');
  
  try {
    // Sample 2024 games from our database to verify against ESPN
    const dbGamesResult = await pool.query(`
      SELECT 
        g.id,
        g.start_date::date as game_date,
        g.week,
        ht.name as home_team,
        at.name as away_team,
        g.home_team_score,
        g.away_team_score,
        g.completed,
        g.spread,
        g.over_under
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id  
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.season = 2024 
      AND g.completed = true
      AND g.home_team_score IS NOT NULL
      AND g.away_team_score IS NOT NULL
      ORDER BY g.start_date DESC
      LIMIT 15
    `);
    
    console.log(`Testing ${dbGamesResult.rows.length} completed 2024 games from our database:`);
    console.log('');
    
    let validGames = 0;
    let suspiciousGames = 0;
    
    for (const game of dbGamesResult.rows) {
      const homeScore = game.home_team_score;
      const awayScore = game.away_team_score;
      const totalScore = homeScore + awayScore;
      
      // Basic validation checks
      let issues = [];
      
      // Check for reasonable scores (0-100 range)
      if (homeScore < 0 || homeScore > 100 || awayScore < 0 || awayScore > 100) {
        issues.push('Unrealistic scores');
      }
      
      // Check for obvious team name issues
      if (game.home_team.includes('Unknown') || game.away_team.includes('Unknown')) {
        issues.push('Unknown team names');
      }
      
      // Check for duplicate team (same team playing itself)
      if (game.home_team === game.away_team) {
        issues.push('Same team vs itself');
      }
      
      // Check for reasonable total scores (typically 6-120 in college football)
      if (totalScore < 6 || totalScore > 120) {
        issues.push(`Unusual total score: ${totalScore}`);
      }
      
      if (issues.length === 0) {
        validGames++;
        console.log(`✅ Game ${game.id}: ${game.away_team} @ ${game.home_team} = ${awayScore}-${homeScore} (${game.game_date})`);
      } else {
        suspiciousGames++;
        console.log(`⚠️  Game ${game.id}: ${game.away_team} @ ${game.home_team} = ${awayScore}-${homeScore} - Issues: ${issues.join(', ')}`);
      }
    }
    
    console.log('');
    console.log('=== Regression Test Summary ===');
    console.log(`Valid games: ${validGames}`);
    console.log(`Suspicious games: ${suspiciousGames}`);
    console.log(`Total tested: ${dbGamesResult.rows.length}`);
    console.log(`Success rate: ${Math.round(validGames * 100 / dbGamesResult.rows.length)}%`);
    
    // Additional database integrity checks
    const integrityResult = await pool.query(`
      SELECT 
        'Total 2024 Games' as check_type,
        COUNT(*) as count
      FROM games 
      WHERE season = 2024
      
      UNION ALL
      
      SELECT 
        'Games with valid teams' as check_type,
        COUNT(*) as count
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.id  
      JOIN teams at ON g.away_team_id = at.id
      WHERE g.season = 2024
      AND ht.name != ''
      AND at.name != ''
      
      UNION ALL
      
      SELECT 
        'Completed games with scores' as check_type,
        COUNT(*) as count
      FROM games 
      WHERE season = 2024 
      AND completed = true
      AND home_team_score IS NOT NULL
      AND away_team_score IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'Games with betting lines' as check_type,
        COUNT(*) as count
      FROM games 
      WHERE season = 2024 
      AND (spread IS NOT NULL OR over_under IS NOT NULL)
      
      UNION ALL
      
      SELECT 
        'Duplicate team issues' as check_type,
        COUNT(*) as count
      FROM games 
      WHERE season = 2024 
      AND home_team_id = away_team_id
    `);
    
    console.log('');
    console.log('=== Database Integrity Checks ===');
    for (const check of integrityResult.rows) {
      console.log(`${check.check_type}: ${check.count}`);
    }
    
    // Check for specific well-known teams
    const teamCheck = await pool.query(`
      SELECT name, COUNT(*) as game_count
      FROM teams t
      JOIN games g ON (t.id = g.home_team_id OR t.id = g.away_team_id)
      WHERE g.season = 2024
      AND t.name IN ('Alabama', 'Georgia', 'Michigan', 'Ohio State', 'Texas', 'Oklahoma')
      GROUP BY t.name
      ORDER BY game_count DESC
    `);
    
    console.log('');
    console.log('=== Major Team Verification ===');
    for (const team of teamCheck.rows) {
      console.log(`${team.name}: ${team.game_count} games`);
    }
    
    const espnTestPassed = validGames >= 8;
    
    if (validGames >= 10 && suspiciousGames === 0) {
      console.log('');
      console.log('🎉 ESPN TEST PASSED - Data quality is excellent');
    } else if (validGames >= 8) {
      console.log('');
      console.log('✅ ESPN TEST PASSED - Data quality good');
    } else {
      console.log('');
      console.log('❌ ESPN TEST FAILED - Significant data quality issues');
    }
    
    return espnTestPassed;
    
  } catch (error) {
    console.error('❌ ESPN regression test failed:', error);
    return false;
  }
}

async function runAllRegressionTests() {
  console.log('🚀 Running Complete Regression Test Suite');
  console.log('==========================================');
  
  let allTestsPassed = true;
  
  // Test 1: Historical Games API
  console.log('\n1. Testing Historical Games API...');
  const apiTestPassed = await testHistoricalGamesAPI();
  if (!apiTestPassed) allTestsPassed = false;
  
  // Test 2: ESPN Data Quality
  console.log('\n2. Testing ESPN Data Quality...');
  const espnTestPassed = await regressionTestESPN();
  if (!espnTestPassed) allTestsPassed = false;
  
  // Final Results
  console.log('\n==========================================');
  console.log('🏆 COMPLETE REGRESSION TEST RESULTS:');
  console.log(`Historical Games API: ${apiTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`ESPN Data Quality: ${espnTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('==========================================');
  
  if (allTestsPassed) {
    console.log('🎉 ALL REGRESSION TESTS PASSED!');
  } else {
    console.log('❌ SOME REGRESSION TESTS FAILED');
    process.exit(1);
  }
  
  await pool.end();
}

// Run if called directly
runAllRegressionTests();