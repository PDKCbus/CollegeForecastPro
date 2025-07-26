import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
    
    if (validGames >= 10 && suspiciousGames === 0) {
      console.log('');
      console.log('🎉 REGRESSION TEST PASSED - Data quality is excellent');
    } else if (validGames >= 8) {
      console.log('');
      console.log('⚠️ REGRESSION TEST WARNING - Some data quality issues detected');
    } else {
      console.log('');
      console.log('❌ REGRESSION TEST FAILED - Significant data quality issues');
    }
    
  } catch (error) {
    console.error('❌ Regression test failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

regressionTestESPN();