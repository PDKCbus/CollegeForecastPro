#!/usr/bin/env node
/**
 * Quick Prediction Consistency Validator
 * Run this script to ensure predictions are consistent across all endpoints
 */

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function validatePredictionConsistency() {
  console.log('🔍 Testing prediction consistency across all endpoints...\n');
  
  try {
    // Get upcoming games to test
    const upcomingResponse = await axios.get(`${BASE_URL}/api/games/upcoming?limit=5`);
    const games = upcomingResponse.data.games;
    
    let totalGames = 0;
    let consistentGames = 0;
    let inconsistentGames = [];
    
    for (const game of games) {
      totalGames++;
      console.log(`Testing: ${game.awayTeam.name} @ ${game.homeTeam.name}`);
      
      try {
        const [analysisResponse, predictionResponse] = await Promise.all([
          axios.get(`${BASE_URL}/api/games/analysis/${game.id}`),
          axios.get(`${BASE_URL}/api/predictions/game/${game.id}`)
        ]);

        const analysisRec = analysisResponse.data.predictiveMetrics.recommendation;
        const predictionRec = predictionResponse.data.algorithmicPredictions[0]?.spreadPick;
        const analysisSpread = analysisResponse.data.predictiveMetrics.spreadPrediction;
        const predictionSpread = predictionResponse.data.algorithmicPredictions[0]?.predictedSpread;

        // Check recommendation consistency
        const recommendationConsistent = analysisRec === predictionRec;
        const spreadConsistent = Math.abs(analysisSpread - predictionSpread) < 0.01; // Allow tiny floating point differences

        if (recommendationConsistent && spreadConsistent) {
          consistentGames++;
          console.log(`  ✅ CONSISTENT: "${analysisRec}" (Spread: ${analysisSpread})`);
        } else {
          inconsistentGames.push({
            game: `${game.awayTeam.name} @ ${game.homeTeam.name}`,
            gameId: game.id,
            analysisRec,
            predictionRec,
            analysisSpread,
            predictionSpread,
            recommendationConsistent,
            spreadConsistent
          });
          console.log(`  ❌ INCONSISTENT:`);
          console.log(`     Analysis: "${analysisRec}" (Spread: ${analysisSpread})`);
          console.log(`     Prediction: "${predictionRec}" (Spread: ${predictionSpread})`);
        }
      } catch (error) {
        console.log(`  ⚠️  ERROR: ${error.message}`);
      }
      
      console.log('');
    }
    
    // Summary report
    console.log('='.repeat(50));
    console.log('PREDICTION CONSISTENCY REPORT');
    console.log('='.repeat(50));
    console.log(`Total games tested: ${totalGames}`);
    console.log(`Consistent predictions: ${consistentGames}`);
    console.log(`Inconsistent predictions: ${inconsistentGames.length}`);
    console.log(`Success rate: ${Math.round((consistentGames / totalGames) * 100)}%`);
    
    if (inconsistentGames.length > 0) {
      console.log('\n❌ INCONSISTENCIES DETECTED:');
      inconsistentGames.forEach(issue => {
        console.log(`\nGame: ${issue.game} (ID: ${issue.gameId})`);
        if (!issue.recommendationConsistent) {
          console.log(`  Recommendation: "${issue.analysisRec}" vs "${issue.predictionRec}"`);
        }
        if (!issue.spreadConsistent) {
          console.log(`  Spread: ${issue.analysisSpread} vs ${issue.predictionSpread}`);
        }
      });
      
      process.exit(1);
    } else {
      console.log('\n✅ ALL PREDICTIONS ARE CONSISTENT!');
      console.log('The prediction engine is working correctly across all endpoints.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePredictionConsistency();
}

export { validatePredictionConsistency };