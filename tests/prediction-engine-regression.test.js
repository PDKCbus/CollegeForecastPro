/**
 * Prediction Engine Regression Test Suite
 * Ensures algorithm changes maintain 55%+ accuracy
 * Tests against historical data and validates core functionality
 */

const axios = require('axios');
const { expect } = require('chai');

describe('Prediction Engine Regression Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  let testResults = {
    totalGames: 0,
    correctPredictions: 0,
    accuracyRate: 0,
    confidenceBreakdown: {},
    factorPerformance: {},
    timestamp: new Date().toISOString()
  };

  describe('Algorithm Accuracy Validation', () => {
    it('should maintain minimum 55% ATS accuracy', async function() {
      this.timeout(60000); // 60 second timeout for extensive testing

      console.log('\n🎯 Running Algorithm Accuracy Test...');

      // Get recent completed games for backtesting
      const completedGamesResponse = await axios.get(`${BASE_URL}/api/games/completed?limit=100`);
      const completedGames = completedGamesResponse.data.games || [];

      if (completedGames.length === 0) {
        console.log('⚠️  No completed games found for backtesting');
        this.skip();
        return;
      }

      console.log(`📊 Testing against ${completedGames.length} completed games`);

      let correctPredictions = 0;
      let totalValidGames = 0;
      const confidenceResults = { High: { correct: 0, total: 0 }, Medium: { correct: 0, total: 0 }, Low: { correct: 0, total: 0 }};

      for (const game of completedGames) {
        if (!game.spread || game.homeTeamScore === null || game.awayTeamScore === null) {
          continue; // Skip games without complete data
        }

        try {
          // Get algorithm prediction for this historical game
          const predictionResponse = await axios.get(`${BASE_URL}/api/predictions/game/${game.id}`);
          const prediction = predictionResponse.data.algorithmicPredictions?.[0];

          if (!prediction) continue;

          // Calculate actual game result
          const actualSpread = game.homeTeamScore - game.awayTeamScore;
          const vegasSpread = game.spread;

          // Determine if our prediction was correct ATS
          let algorithmCorrect = false;
          if (prediction.predictionBet && prediction.predictionBet !== 'Analysis Pending') {
            // Parse our recommendation
            if (prediction.predictionBet.includes('Take')) {
              const isHomePick = prediction.predictionBet.includes(game.homeTeam.name);
              const isAwayPick = prediction.predictionBet.includes(game.awayTeam.name);

              if (isHomePick) {
                // We picked home team - did they cover?
                algorithmCorrect = actualSpread > vegasSpread;
              } else if (isAwayPick) {
                // We picked away team - did they cover?
                algorithmCorrect = actualSpread < vegasSpread;
              }
            }
          }

          if (algorithmCorrect) {
            correctPredictions++;
          }

          // Track confidence level performance
          const confidence = prediction.confidence || 'Medium';
          if (confidenceResults[confidence]) {
            confidenceResults[confidence].total++;
            if (algorithmCorrect) {
              confidenceResults[confidence].correct++;
            }
          }

          totalValidGames++;

          // Log progress every 25 games
          if (totalValidGames % 25 === 0) {
            const currentAccuracy = (correctPredictions / totalValidGames * 100).toFixed(1);
            console.log(`   Processed ${totalValidGames} games - Current accuracy: ${currentAccuracy}%`);
          }

        } catch (error) {
          console.log(`   Error processing game ${game.id}: ${error.message}`);
          continue;
        }
      }

      // Calculate final results
      const accuracyRate = totalValidGames > 0 ? (correctPredictions / totalValidGames) * 100 : 0;

      // Store results for reporting
      testResults.totalGames = totalValidGames;
      testResults.correctPredictions = correctPredictions;
      testResults.accuracyRate = accuracyRate;
      testResults.confidenceBreakdown = confidenceResults;

      console.log('\n📈 REGRESSION TEST RESULTS:');
      console.log('=' * 50);
      console.log(`Total Games Tested: ${totalValidGames}`);
      console.log(`Correct Predictions: ${correctPredictions}`);
      console.log(`Algorithm Accuracy: ${accuracyRate.toFixed(2)}%`);
      console.log(`Target Accuracy: 55.0%`);
      console.log(`Performance: ${accuracyRate >= 55 ? '✅ PASS' : '❌ FAIL'}`);

      // Confidence level breakdown
      console.log('\n📊 Confidence Level Performance:');
      Object.entries(confidenceResults).forEach(([level, results]) => {
        if (results.total > 0) {
          const pct = (results.correct / results.total * 100).toFixed(1);
          console.log(`   ${level}: ${results.correct}/${results.total} (${pct}%)`);
        }
      });

      // Assert minimum accuracy requirement
      expect(accuracyRate).to.be.at.least(55,
        `Algorithm accuracy ${accuracyRate.toFixed(2)}% is below required 55% threshold`);

      // Ensure we tested enough games for statistical significance
      expect(totalValidGames).to.be.at.least(50,
        `Need at least 50 games for valid regression test, got ${totalValidGames}`);
    });

    it('should maintain consistent prediction structure', async () => {
      const upcomingGamesResponse = await axios.get(`${BASE_URL}/api/games/upcoming?limit=5`);
      const upcomingGames = upcomingGamesResponse.data.games || [];

      if (upcomingGames.length === 0) {
        this.skip();
        return;
      }

      for (const game of upcomingGames.slice(0, 3)) {
        const predictionResponse = await axios.get(`${BASE_URL}/api/predictions/game/${game.id}`);
        const prediction = predictionResponse.data.algorithmicPredictions?.[0];

        expect(prediction).to.exist;
        expect(prediction).to.have.property('predictedSpread');
        expect(prediction).to.have.property('confidence');
        expect(prediction).to.have.property('keyFactors');
        expect(prediction.keyFactors).to.be.an('array');

        // Verify new stadium size factor is included
        const hasStadiumFactor = prediction.keyFactors.some(factor =>
          factor.toLowerCase().includes('stadium') || factor.toLowerCase().includes('capacity')
        );

        if (game.homeTeam?.name && ['Ohio State', 'Michigan', 'Alabama', 'Texas A&M', 'Penn State'].includes(game.homeTeam.name)) {
          expect(hasStadiumFactor).to.be.true(
            `Stadium size factor should be present for ${game.homeTeam.name} with massive stadium`
          );
        }
      }
    });
  });

  describe('Stadium Size Integration Tests', () => {
    it('should apply correct stadium size adjustments', async () => {
      // Test games at massive stadiums
      const massiveStadiumTeams = ['Ohio State', 'Michigan', 'Alabama', 'Texas A&M', 'Penn State'];

      const upcomingGamesResponse = await axios.get(`${BASE_URL}/api/games/upcoming`);
      const upcomingGames = upcomingGamesResponse.data.games || [];

      for (const game of upcomingGames) {
        if (massiveStadiumTeams.includes(game.homeTeam?.name)) {
          const predictionResponse = await axios.get(`${BASE_URL}/api/predictions/game/${game.id}`);
          const prediction = predictionResponse.data.algorithmicPredictions?.[0];

          if (prediction && prediction.factorBreakdown) {
            expect(prediction.factorBreakdown.stadiumSize).to.be.at.least(1.5,
              `${game.homeTeam.name} should get significant stadium size bonus`);
          }

          // Check key factors mention stadium advantage
          const stadiumMention = prediction.keyFactors.some(factor =>
            factor.includes('stadium') || factor.includes('capacity')
          );
          expect(stadiumMention).to.be.true(
            `Stadium advantage should be mentioned in key factors for ${game.homeTeam.name}`
          );
        }
      }
    });
  });

  describe('Threshold Changes Validation', () => {
    it('should generate more spread picks with 0.5 point threshold', async () => {
      const upcomingGamesResponse = await axios.get(`${BASE_URL}/api/games/upcoming?limit=20`);
      const upcomingGames = upcomingGamesResponse.data.games || [];

      let gamesWithSpreadPicks = 0;
      let gamesWithOtherPicks = 0;

      for (const game of upcomingGames) {
        if (!game.spread) continue; // Skip games without betting lines

        const predictionResponse = await axios.get(`${BASE_URL}/api/predictions/game/${game.id}`);
        const prediction = predictionResponse.data.algorithmicPredictions?.[0];

        if (prediction && prediction.spreadPick && prediction.spreadPick !== 'Analysis Pending') {
          if (prediction.spreadPick.toLowerCase().includes('take') &&
              (prediction.spreadPick.includes('+') || prediction.spreadPick.includes('-'))) {
            gamesWithSpreadPicks++;
          } else {
            gamesWithOtherPicks++;
          }
        }
      }

      console.log(`\n📊 Spread Pick Generation:`);
      console.log(`   Games with spread picks: ${gamesWithSpreadPicks}`);
      console.log(`   Games with other picks: ${gamesWithOtherPicks}`);

      // With 0.5 threshold, we should see more spread picks
      const spreadPickRate = gamesWithSpreadPicks / (gamesWithSpreadPicks + gamesWithOtherPicks);
      expect(spreadPickRate).to.be.at.least(0.6,
        'At least 60% of picks should be spread recommendations with 0.5 threshold');
    });
  });

  after(() => {
    // Output comprehensive test summary
    console.log('\n' + '=' * 60);
    console.log('🏆 PREDICTION ENGINE REGRESSION TEST SUMMARY');
    console.log('=' * 60);
    console.log(`Test Timestamp: ${testResults.timestamp}`);
    console.log(`Algorithm Version: Stadium Size Integration + 0.5 Threshold`);
    console.log(`Games Analyzed: ${testResults.totalGames}`);
    console.log(`Accuracy Rate: ${testResults.accuracyRate.toFixed(2)}%`);
    console.log(`Status: ${testResults.accuracyRate >= 55 ? '✅ PASS - Ready for Production' : '❌ FAIL - Needs Improvement'}`);

    if (testResults.accuracyRate < 55) {
      console.log('\n⚠️  REGRESSION DETECTED:');
      console.log('   Algorithm accuracy below 55% threshold');
      console.log('   Review recent changes before production deployment');
    }
    console.log('=' * 60);
  });
});