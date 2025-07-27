#!/usr/bin/env tsx

/**
 * Betting Lines Filter Validation Test
 * 
 * This test verifies that all games returned by the historical and upcoming 
 * games APIs have betting lines (spread or over/under values).
 * This is critical for the "Beat The Books" betting-focused platform.
 */

async function runBettingFilterTest() {
  console.log('🧪 Starting Betting Lines Filter Validation Test...\n');
  
  try {
    // Test the dedicated validation endpoint
    console.log('📡 Calling betting filter validation API...');
    const response = await fetch('http://localhost:5000/api/test/betting-lines-filter', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const testResults = await response.json();
    
    // Display comprehensive test results
    console.log('=' .repeat(80));
    console.log(`🎯 TEST STATUS: ${testResults.testStatus}`);
    console.log(`⏰ Timestamp: ${testResults.timestamp}`);
    console.log('=' .repeat(80));
    
    console.log('\n📊 HISTORICAL GAMES ANALYSIS:');
    console.log(`   • Games tested: ${testResults.historicalGames.totalTested}`);
    console.log(`   • Games without betting lines: ${testResults.historicalGames.gamesWithoutBetting}`);
    console.log(`   • Failure rate: ${testResults.historicalGames.failureRate}`);
    console.log(`   • API returns: ${testResults.historicalGames.apiTotal} games`);
    console.log(`   • Database total: ${testResults.historicalGames.dbTotal} completed games`);
    console.log(`   • Database with betting: ${testResults.historicalGames.dbWithBetting} games`);
    
    console.log('\n📊 UPCOMING GAMES ANALYSIS:');
    console.log(`   • Games tested: ${testResults.upcomingGames.totalTested}`);
    console.log(`   • Games without betting lines: ${testResults.upcomingGames.gamesWithoutBetting}`);
    console.log(`   • Failure rate: ${testResults.upcomingGames.failureRate}`);
    console.log(`   • API returns: ${testResults.upcomingGames.apiTotal} games`);
    console.log(`   • Database total: ${testResults.upcomingGames.dbTotal} upcoming games`);
    console.log(`   • Database with betting: ${testResults.upcomingGames.dbWithBetting} games`);
    
    // Show failure details if any
    if (testResults.failureDetails.historicalFailures.length > 0) {
      console.log('\n❌ HISTORICAL GAMES WITHOUT BETTING LINES:');
      testResults.failureDetails.historicalFailures.forEach((game: any, index: number) => {
        console.log(`   ${index + 1}. ID ${game.id}: ${game.awayTeam} @ ${game.homeTeam} (${game.season} Week ${game.week})`);
      });
    }
    
    if (testResults.failureDetails.upcomingFailures.length > 0) {
      console.log('\n❌ UPCOMING GAMES WITHOUT BETTING LINES:');
      testResults.failureDetails.upcomingFailures.forEach((game: any, index: number) => {
        console.log(`   ${index + 1}. ID ${game.id}: ${game.awayTeam} @ ${game.homeTeam} (${game.season} Week ${game.week})`);
      });
    }
    
    console.log('\n' + '=' .repeat(80));
    
    if (testResults.testStatus === 'PASS') {
      console.log('✅ SUCCESS: All games have betting lines - filter working correctly!');
      console.log('🎯 Platform is properly aligned with "Beat The Books" betting focus');
    } else {
      console.log('❌ FAILURE: Some games lack betting lines - filter needs attention');
      console.log('⚠️  Platform showing irrelevant games to betting users');
    }
    
    console.log('=' .repeat(80));
    
    // Additional validation: Check data consistency
    const historicalConsistent = testResults.historicalGames.apiTotal === testResults.historicalGames.dbWithBetting;
    const upcomingConsistent = testResults.upcomingGames.apiTotal === testResults.upcomingGames.dbWithBetting;
    
    console.log('\n🔍 DATA CONSISTENCY CHECK:');
    console.log(`   Historical API/DB consistency: ${historicalConsistent ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Upcoming API/DB consistency: ${upcomingConsistent ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!historicalConsistent) {
      console.log(`     ⚠️  Historical: API returns ${testResults.historicalGames.apiTotal} but DB has ${testResults.historicalGames.dbWithBetting} with betting`);
    }
    
    if (!upcomingConsistent) {
      console.log(`     ⚠️  Upcoming: API returns ${testResults.upcomingGames.apiTotal} but DB has ${testResults.upcomingGames.dbWithBetting} with betting`);
    }
    
    // Final test result
    const overallSuccess = testResults.testStatus === 'PASS' && historicalConsistent && upcomingConsistent;
    
    console.log(`\n🏆 OVERALL TEST RESULT: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    process.exit(overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 TEST ERROR:', error);
    console.log('\n❌ Betting filter validation test failed to run');
    process.exit(1);
  }
}

// Run the test
runBettingFilterTest();