#!/usr/bin/env tsx

/**
 * Quick Betting Lines Test
 * Tests that all returned games have betting lines (spread or over/under)
 */

async function testBettingFilter() {
  console.log('🧪 Testing Betting Lines Filter...\n');
  
  try {
    // Test historical games
    console.log('1️⃣ Testing Historical Games API...');
    const historicalResponse = await fetch('http://localhost:5000/api/games/historical?page=0&limit=10&season=2024&week=all');
    const historicalData = await historicalResponse.json();
    const historicalGames = historicalData.games || [];
    
    const historicalFails = historicalGames.filter((game: any) => 
      game.spread === null && game.overUnder === null
    );
    
    console.log(`   📊 Games tested: ${historicalGames.length}`);
    console.log(`   ✅ Games with betting lines: ${historicalGames.length - historicalFails.length}`);
    console.log(`   ❌ Games without betting lines: ${historicalFails.length}`);
    console.log(`   🎯 Historical test: ${historicalFails.length === 0 ? 'PASS' : 'FAIL'}\n`);
    
    // Test upcoming games  
    console.log('2️⃣ Testing Upcoming Games API...');
    const upcomingResponse = await fetch('http://localhost:5000/api/games/upcoming?limit=10');
    const upcomingData = await upcomingResponse.json();
    const upcomingGames = upcomingData.games || [];
    
    const upcomingFails = upcomingGames.filter((game: any) => 
      game.spread === null && game.overUnder === null
    );
    
    console.log(`   📊 Games tested: ${upcomingGames.length}`);
    console.log(`   ✅ Games with betting lines: ${upcomingGames.length - upcomingFails.length}`);
    console.log(`   ❌ Games without betting lines: ${upcomingFails.length}`);
    console.log(`   🎯 Upcoming test: ${upcomingFails.length === 0 ? 'PASS' : 'FAIL'}\n`);
    
    // Overall result
    const overallPass = historicalFails.length === 0 && upcomingFails.length === 0;
    console.log('=' .repeat(50));
    console.log(`🏆 OVERALL TEST RESULT: ${overallPass ? 'PASS' : 'FAIL'}`);
    
    if (overallPass) {
      console.log('✅ All games have betting lines - filter working correctly!');
      console.log('🎯 Platform properly aligned with "Beat The Books" betting focus');
    } else {
      console.log('❌ Some games lack betting lines - filter needs attention');
      
      if (historicalFails.length > 0) {
        console.log('\n❌ Historical games without betting lines:');
        historicalFails.forEach((game: any, i: number) => {
          console.log(`   ${i + 1}. ${game.awayTeam?.name} @ ${game.homeTeam?.name} (${game.season} Week ${game.week})`);
        });
      }
      
      if (upcomingFails.length > 0) {
        console.log('\n❌ Upcoming games without betting lines:');
        upcomingFails.forEach((game: any, i: number) => {
          console.log(`   ${i + 1}. ${game.awayTeam?.name} @ ${game.homeTeam?.name} (${game.season} Week ${game.week})`);
        });
      }
    }
    
    console.log('=' .repeat(50));
    
    process.exit(overallPass ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

testBettingFilter();