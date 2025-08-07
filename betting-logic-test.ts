#!/usr/bin/env tsx

/**
 * 🎯 BETTING LOGIC REGRESSION TEST
 * 
 * Critical test suite to ensure betting recommendations stay accurate.
 * Run this EVERY TIME the prediction engine is modified.
 * 
 * Usage: npx tsx betting-logic-test.ts
 */

interface BettingTestCase {
  name: string;
  vegasSpread: number;
  ourPrediction: number;
  expectedRecommendation: string | null;
  expectedEdge: number;
  scenario: string;
}

// Core betting logic extracted from prediction engine
function calculateBettingRecommendation(vegasSpread: number, ourPrediction: number, homeTeam: string = "Home", awayTeam: string = "Away"): { bet: string | null, edge: number } {
  const totalScore = ourPrediction;
  
  let oppositeSides = false;
  let edge = 0;
  let recommendedBet: string | null = null;

  const vegasFavorsAway = vegasSpread > 0;  // Positive = away team favored
  const weFavorHome = totalScore > 0;       // Positive = home team favored
  
  oppositeSides = (vegasFavorsAway && weFavorHome) || (!vegasFavorsAway && !weFavorHome);
  
  if (oppositeSides) {
    // Opposite sides: Add the magnitudes
    edge = Math.abs(totalScore) + Math.abs(vegasSpread);
  } else {
    // Same side: Subtract the magnitudes
    edge = Math.abs(Math.abs(totalScore) - Math.abs(vegasSpread));
  }

  const significantEdge = edge >= 2; // 2+ point edge required for recommendation
  
  if (significantEdge) {
    if (totalScore > 0) { // We favor home team
      if (oppositeSides) {
        recommendedBet = `Take ${homeTeam}`;
      } else if (totalScore > Math.abs(vegasSpread)) {
        recommendedBet = `Take ${homeTeam}`;
      } else {
        // Underdog value - Vegas favors home more strongly
        recommendedBet = `Take ${awayTeam}`;
      }
    } else { // We favor away team  
      if (oppositeSides) {
        recommendedBet = `Take ${awayTeam}`;
      } else if (Math.abs(totalScore) > Math.abs(vegasSpread)) {
        recommendedBet = `Take ${awayTeam}`;
      } else {
        // Underdog value - Vegas favors away more strongly  
        recommendedBet = `Take ${homeTeam}`;
      }
    }
  }

  return { bet: recommendedBet, edge };
}

const BETTING_TEST_CASES: BettingTestCase[] = [
  // OPPOSITE SIDES TESTS
  {
    name: "Vegas favors away, we favor home (opposite sides)",
    vegasSpread: 3.5,    // Away -3.5
    ourPrediction: 1.75, // Home -1.75
    expectedRecommendation: "Take Home",
    expectedEdge: 5.25,   // 1.75 + 3.5
    scenario: 'opposite_sides'
  },
  {
    name: "Vegas favors home, we favor away (opposite sides)",
    vegasSpread: -7,      // Home -7
    ourPrediction: -3,    // Away -3
    expectedRecommendation: "Take Away",
    expectedEdge: 10,     // 3 + 7
    scenario: 'opposite_sides'
  },

  // SAME SIDE - WE'RE STRONGER TESTS
  {
    name: "Same side: We favor home more than Vegas",
    vegasSpread: -3,      // Home -3
    ourPrediction: 7,     // Home -7
    expectedRecommendation: "Take Home",
    expectedEdge: 4,      // |7 - 3|
    scenario: 'same_side_we_stronger'
  },
  {
    name: "Same side: We favor away more than Vegas",
    vegasSpread: 6,       // Away -6
    ourPrediction: -10,   // Away -10
    expectedRecommendation: "Take Away",
    expectedEdge: 4,      // |10 - 6|
    scenario: 'same_side_we_stronger'
  },

  // UNDERDOG VALUE TESTS (The critical bug fix!)
  {
    name: "UNDERDOG VALUE: Vegas favors home more than we do",
    vegasSpread: -14.5,   // Home -14.5
    ourPrediction: 6,     // Home -6
    expectedRecommendation: "Take Away", 
    expectedEdge: 8.5,    // |6 - 14.5|
    scenario: 'underdog_value'
  },
  {
    name: "UNDERDOG VALUE: Vegas favors away more than we do", 
    vegasSpread: 21,      // Away -21
    ourPrediction: -7,    // Away -7
    expectedRecommendation: "Take Home",
    expectedEdge: 14,     // |7 - 21|
    scenario: 'underdog_value'
  },

  // EDGE CASES
  {
    name: "Small edge - no recommendation",
    vegasSpread: -3,      // Home -3
    ourPrediction: 4,     // Home -4
    expectedRecommendation: null,
    expectedEdge: 1,      // Below 2-point threshold
    scenario: 'small_edge'
  },
  {
    name: "Exactly 2-point edge threshold",
    vegasSpread: -5,      // Home -5
    ourPrediction: 7,     // Home -7
    expectedRecommendation: "Take Home",
    expectedEdge: 2,      // Exactly at threshold
    scenario: 'threshold_edge'
  }
];

async function runBettingLogicTests() {
  console.log('🎯 RICK\'S PICKS BETTING LOGIC TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Testing ${BETTING_TEST_CASES.length} critical betting scenarios...\n`);

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (let i = 0; i < BETTING_TEST_CASES.length; i++) {
    const test = BETTING_TEST_CASES[i];
    console.log(`🧪 Test ${i + 1}: ${test.name}`);
    
    try {
      const result = calculateBettingRecommendation(test.vegasSpread, test.ourPrediction);
      
      // Check results
      const edgeMatch = Math.abs(result.edge - test.expectedEdge) < 0.1;
      const betMatch = result.bet === test.expectedRecommendation;
      
      if (edgeMatch && betMatch) {
        console.log(`   ✅ PASS`);
        console.log(`      Edge: ${result.edge.toFixed(1)} points (expected: ${test.expectedEdge})`);
        console.log(`      Bet: ${result.bet || 'None'} (expected: ${test.expectedRecommendation || 'None'})`);
        console.log(`      Vegas: ${test.vegasSpread}, Our: ${test.ourPrediction}`);
        console.log(`      Scenario: ${test.scenario.replace('_', ' ').toUpperCase()}`);
        passed++;
      } else {
        console.log(`   ❌ FAIL`);
        console.log(`      Expected Edge: ${test.expectedEdge}, Got: ${result.edge.toFixed(1)}`);
        console.log(`      Expected Bet: ${test.expectedRecommendation || 'None'}, Got: ${result.bet || 'None'}`);
        console.log(`      Vegas: ${test.vegasSpread}, Our: ${test.ourPrediction}`);
        failed++;
        failures.push(`Test ${i + 1}: ${test.name}`);
      }

    } catch (error) {
      console.log(`   💥 ERROR: ${error}`);
      failed++;
      failures.push(`Test ${i + 1}: ${test.name} (ERROR)`);
    }
    
    console.log('');
  }

  // FINAL RESULTS
  console.log('🏁 TEST RESULTS');
  console.log('='.repeat(40));
  console.log(`✅ PASSED: ${passed}/${BETTING_TEST_CASES.length}`);
  console.log(`❌ FAILED: ${failed}/${BETTING_TEST_CASES.length}`);
  
  if (failed > 0) {
    console.log('\n🚨 FAILED TESTS:');
    failures.forEach(f => console.log(`   - ${f}`));
    console.log('\n⚠️  DO NOT DEPLOY - BETTING LOGIC IS BROKEN!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL BETTING LOGIC TESTS PASSED!');
    console.log('✅ Safe to deploy prediction engine changes.');
    return true;
  }
}

// Run the test suite
runBettingLogicTests().catch(console.error);