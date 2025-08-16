#!/usr/bin/env node
/**
 * Quick Algorithm Accuracy Test
 * Rapid validation of current algorithm performance
 */

import axios from 'axios';

async function quickAccuracyTest() {
  const baseUrl = 'http://localhost:5000';

  try {
    console.log('🎯 Running Quick Algorithm Accuracy Test...');

    // Get recent completed games
    const response = await axios.get(`${baseUrl}/api/games/completed?limit=50`);
    const games = response.data.games || [];

    if (games.length < 10) {
      console.log('⚠️  Need at least 10 completed games for testing');
      return;
    }

    let correct = 0;
    let total = 0;
    let stadiumFactorGames = 0;
    let thresholdTestGames = 0;

    for (const game of games.slice(0, 30)) {
      if (!game.spread || game.homeTeamScore === null || game.awayTeamScore === null) {
        continue;
      }

      try {
        const predictionResponse = await axios.get(`${baseUrl}/api/predictions/game/${game.id}`);
        const prediction = predictionResponse.data.algorithmicPredictions?.[0];

        if (!prediction?.predictionBet || prediction.predictionBet === 'Analysis Pending') {
          continue;
        }

        // Check for stadium factor (new feature)
        if (prediction.keyFactors?.some(f => f.toLowerCase().includes('stadium'))) {
          stadiumFactorGames++;
        }

        // Check for threshold working (more picks)
        if (prediction.predictionBet.includes('Take')) {
          thresholdTestGames++;
        }

        // Calculate correctness
        const actualSpread = game.homeTeamScore - game.awayTeamScore;
        const vegasSpread = game.spread;

        let isCorrect = false;
        if (prediction.predictionBet.includes(game.homeTeam.name)) {
          isCorrect = actualSpread > vegasSpread;
        } else if (prediction.predictionBet.includes(game.awayTeam.name)) {
          isCorrect = actualSpread < vegasSpread;
        }

        if (isCorrect) correct++;
        total++;

      } catch (error) {
        continue;
      }
    }

    const accuracy = total > 0 ? (correct / total * 100) : 0;

    console.log('\n📊 QUICK TEST RESULTS:');
    console.log(`   Games Tested: ${total}`);
    console.log(`   Correct: ${correct}`);
    console.log(`   Accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`   Stadium Factor Games: ${stadiumFactorGames}`);
    console.log(`   Threshold Test Games: ${thresholdTestGames}`);
    console.log(`   Status: ${accuracy >= 55 ? '✅ PASS' : '⚠️  REVIEW'}`);

    if (accuracy < 55) {
      console.log('\n⚠️  Algorithm accuracy below 55% - review changes');
    } else {
      console.log('\n✅ Algorithm performing well - ready for deployment');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

quickAccuracyTest();