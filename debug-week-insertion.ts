#!/usr/bin/env tsx

/**
 * Debug Week Insertion
 * 
 * Debug why week 7+ games aren't inserting
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function testSingleGameInsertion() {
  console.log('🔍 Testing single game insertion for Week 7...\n');
  
  try {
    // Get a single game from Week 7
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=7&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    const games = await gamesResponse.json();
    const testGame = games[0];
    
    console.log('📊 Test game data:');
    console.log(`   Home: ${testGame.home_team} (${testGame.home_conference})`);
    console.log(`   Away: ${testGame.away_team} (${testGame.away_conference})`);
    console.log(`   Date: ${testGame.start_date}`);
    console.log(`   Completed: ${testGame.completed}`);
    console.log(`   Score: ${testGame.away_points}-${testGame.home_points}`);
    
    // Check if teams exist
    const homeTeam = await sql`SELECT id, name FROM teams WHERE name = ${testGame.home_team} LIMIT 1`;
    const awayTeam = await sql`SELECT id, name FROM teams WHERE name = ${testGame.away_team} LIMIT 1`;
    
    console.log(`\n🏆 Team lookup:`);
    console.log(`   Home team (${testGame.home_team}): ${homeTeam.length > 0 ? 'EXISTS (ID: ' + homeTeam[0].id + ')' : 'NOT FOUND'}`);
    console.log(`   Away team (${testGame.away_team}): ${awayTeam.length > 0 ? 'EXISTS (ID: ' + awayTeam[0].id + ')' : 'NOT FOUND'}`);
    
    // Try to create teams if they don't exist
    let homeTeamId, awayTeamId;
    
    if (homeTeam.length > 0) {
      homeTeamId = homeTeam[0].id;
    } else {
      console.log(`   Creating home team: ${testGame.home_team}`);
      const newHome = await sql`
        INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
        VALUES (${testGame.home_team}, ${testGame.home_conference || 'Unknown'}, '', '#000000', null, 0, 0)
        RETURNING id
      `;
      homeTeamId = newHome[0].id;
      console.log(`   ✅ Created home team with ID: ${homeTeamId}`);
    }
    
    if (awayTeam.length > 0) {
      awayTeamId = awayTeam[0].id;
    } else {
      console.log(`   Creating away team: ${testGame.away_team}`);
      const newAway = await sql`
        INSERT INTO teams (name, conference, abbreviation, color, logo_url, wins, losses)
        VALUES (${testGame.away_team}, ${testGame.away_conference || 'Unknown'}, '', '#000000', null, 0, 0)
        RETURNING id
      `;
      awayTeamId = newAway[0].id;
      console.log(`   ✅ Created away team with ID: ${awayTeamId}`);
    }
    
    // Check if game already exists
    const existingGame = await sql`
      SELECT id FROM games 
      WHERE season = 2024 
      AND week = 7
      AND home_team_id = ${homeTeamId} 
      AND away_team_id = ${awayTeamId}
      LIMIT 1
    `;
    
    console.log(`\n📋 Game check:`);
    console.log(`   Game exists: ${existingGame.length > 0 ? 'YES (ID: ' + existingGame[0].id + ')' : 'NO'}`);
    
    if (existingGame.length === 0) {
      // Try to insert the game
      console.log(`\n🎯 Attempting to insert game...`);
      
      const gameDate = new Date(testGame.start_date);
      console.log(`   Parsed date: ${gameDate.toISOString()}`);
      
      const insertResult = await sql`
        INSERT INTO games (
          season, week, start_date, stadium, location,
          home_team_id, away_team_id, home_team_score, away_team_score,
          completed, spread, over_under, is_conference_game, is_rivalry_game
        ) VALUES (
          2024, 7, ${gameDate.toISOString()},
          ${testGame.venue || 'TBD'}, ${testGame.venue || 'TBD'},
          ${homeTeamId}, ${awayTeamId}, 
          ${testGame.home_points || null}, ${testGame.away_points || null},
          ${testGame.completed}, null, null,
          ${testGame.conference_game || false}, false
        )
        RETURNING id
      `;
      
      console.log(`   ✅ Game inserted successfully with ID: ${insertResult[0].id}`);
      
      // Verify insertion
      const verifyGame = await sql`
        SELECT g.*, ht.name as home_name, at.name as away_name
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.id = ${insertResult[0].id}
      `;
      
      console.log(`\n✅ Verification:`);
      console.log(`   ${verifyGame[0].away_name} @ ${verifyGame[0].home_name}`);
      console.log(`   Week ${verifyGame[0].week}, ${verifyGame[0].season}`);
      console.log(`   Score: ${verifyGame[0].away_team_score}-${verifyGame[0].home_team_score}`);
      console.log(`   Completed: ${verifyGame[0].completed}`);
      
    } else {
      console.log(`   Game already exists, skipping insertion`);
    }
    
  } catch (error) {
    console.error('❌ Error during test insertion:', error);
  }
}

testSingleGameInsertion().catch(console.error);