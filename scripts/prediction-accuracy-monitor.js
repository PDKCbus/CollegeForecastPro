#!/usr/bin/env node
/**
 * Prediction Accuracy Monitor
 * Continuously monitor algorithm performance and alert on accuracy drops
 */

import axios from 'axios';

class PredictionAccuracyMonitor {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.accuracyThreshold = 55; // Minimum acceptable accuracy percentage
    this.sampleSize = 100; // Number of recent games to analyze
  }

  async checkCurrentAccuracy() {
    console.log('📊 Checking current algorithm accuracy...');

    try {
      // Get recent completed games
      const completedGamesResponse = await axios.get(
        `${this.baseUrl}/api/games/completed?limit=${this.sampleSize}`
      );
      const completedGames = completedGamesResponse.data.games || [];

      if (completedGames.length < 20) {
        console.log('⚠️  Insufficient completed games for accuracy check');
        return null;
      }

      let correctPredictions = 0;
      let totalValidGames = 0;
      const results = [];

      for (const game of completedGames) {
        if (!game.spread || game.homeTeamScore === null || game.awayTeamScore === null) {
          continue;
        }

        try {
          const predictionResponse = await axios.get(`${this.baseUrl}/api/predictions/game/${game.id}`);
          const prediction = predictionResponse.data.algorithmicPredictions?.[0];

          if (!prediction || !prediction.predictionBet || prediction.predictionBet === 'Analysis Pending') {
            continue;
          }

          // Calculate actual result
          const actualSpread = game.homeTeamScore - game.awayTeamScore;
          const vegasSpread = game.spread;

          // Determine if prediction was correct
          let isCorrect = false;
          if (prediction.predictionBet.includes('Take')) {
            const isHomePick = prediction.predictionBet.includes(game.homeTeam.name);
            const isAwayPick = prediction.predictionBet.includes(game.awayTeam.name);

            if (isHomePick) {
              isCorrect = actualSpread > vegasSpread;
            } else if (isAwayPick) {
              isCorrect = actualSpread < vegasSpread;
            }
          }

          results.push({
            gameId: game.id,
            prediction: prediction.predictionBet,
            actualSpread,
            vegasSpread,
            correct: isCorrect
          });

          if (isCorrect) correctPredictions++;
          totalValidGames++;

        } catch (error) {
          console.log(`Error processing game ${game.id}: ${error.message}`);
        }
      }

      const accuracy = totalValidGames > 0 ? (correctPredictions / totalValidGames) * 100 : 0;

      console.log(`\n📈 ACCURACY REPORT:`);
      console.log(`   Games Analyzed: ${totalValidGames}`);
      console.log(`   Correct Predictions: ${correctPredictions}`);
      console.log(`   Accuracy Rate: ${accuracy.toFixed(2)}%`);
      console.log(`   Threshold: ${this.accuracyThreshold}%`);
      console.log(`   Status: ${accuracy >= this.accuracyThreshold ? '✅ HEALTHY' : '⚠️  BELOW THRESHOLD'}`);

      if (accuracy < this.accuracyThreshold) {
        console.log('\n🚨 ACCURACY ALERT:');
        console.log(`   Algorithm performance (${accuracy.toFixed(2)}%) is below ${this.accuracyThreshold}% threshold`);
        console.log('   Consider reviewing recent algorithm changes');
        console.log('   Monitor closely and potentially rollback if accuracy continues to decline');
      }

      return {
        accuracy,
        totalGames: totalValidGames,
        correctPredictions,
        isHealthy: accuracy >= this.accuracyThreshold,
        results: results.slice(0, 10) // Return sample results
      };

    } catch (error) {
      console.error('Error checking accuracy:', error.message);
      return null;
    }
  }

  async generateAccuracyReport() {
    const report = await this.checkCurrentAccuracy();

    if (!report) {
      return 'Unable to generate accuracy report';
    }

    return `
PREDICTION ALGORITHM ACCURACY REPORT
Generated: ${new Date().toISOString()}

PERFORMANCE METRICS:
- Games Analyzed: ${report.totalGames}
- Correct Predictions: ${report.correctPredictions}
- Accuracy Rate: ${report.accuracy.toFixed(2)}%
- Status: ${report.isHealthy ? 'HEALTHY' : 'NEEDS ATTENTION'}

SAMPLE RECENT PREDICTIONS:
${report.results.map(r =>
  `  Game ${r.gameId}: ${r.prediction} - ${r.correct ? '✅' : '❌'}`
).join('\n')}

${!report.isHealthy ? `
⚠️  ATTENTION REQUIRED:
Algorithm accuracy below ${this.accuracyThreshold}% threshold.
Review recent changes and consider implementing improvements.
` : '✅ Algorithm performing within acceptable parameters.'}
`;
  }
}

// Command line execution
if (require.main === module) {
  const monitor = new PredictionAccuracyMonitor();

  if (process.argv.includes('--report')) {
    monitor.generateAccuracyReport().then(report => {
      console.log(report);
      process.exit(0);
    });
  } else {
    monitor.checkCurrentAccuracy().then(() => {
      process.exit(0);
    });
  }
}

export default PredictionAccuracyMonitor;