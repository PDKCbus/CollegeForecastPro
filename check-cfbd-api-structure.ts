#!/usr/bin/env tsx

/**
 * Check CFBD API Structure
 * 
 * Inspect the actual data structure from CFBD API
 */

async function checkApiStructure() {
  console.log('🔍 Checking CFBD API data structure...\n');
  
  try {
    // Get a few games from Week 7
    const gamesUrl = `https://api.collegefootballdata.com/games?year=2024&week=7&seasonType=regular`;
    const gamesResponse = await fetch(gamesUrl, {
      headers: { 'Authorization': `Bearer ${process.env.CFBD_API_KEY}` }
    });
    
    const games = await gamesResponse.json();
    
    console.log(`📊 Total games found: ${games.length}`);
    console.log('\n🎯 First game structure:');
    console.log(JSON.stringify(games[0], null, 2));
    
    console.log('\n📋 Field analysis:');
    const firstGame = games[0];
    console.log(`   id: ${firstGame.id}`);
    console.log(`   season: ${firstGame.season}`);
    console.log(`   week: ${firstGame.week}`);
    console.log(`   start_date: ${firstGame.start_date}`);
    console.log(`   completed: ${firstGame.completed}`);
    console.log(`   home_team: ${firstGame.home_team}`);
    console.log(`   away_team: ${firstGame.away_team}`);
    console.log(`   homeTeam: ${firstGame.homeTeam}`);
    console.log(`   awayTeam: ${firstGame.awayTeam}`);
    console.log(`   home_points: ${firstGame.home_points}`);
    console.log(`   away_points: ${firstGame.away_points}`);
    console.log(`   venue: ${firstGame.venue}`);
    
    // Check if it's using different field names
    console.log('\n🔍 Available fields:');
    console.log(Object.keys(firstGame).join(', '));
    
  } catch (error) {
    console.error('❌ Error checking API structure:', error);
  }
}

checkApiStructure().catch(console.error);