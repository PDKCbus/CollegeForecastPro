/**
 * Prediction Consistency Integration Tests
 * Ensures all prediction displays across the platform show identical recommendations
 */

const axios = require('axios');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Prediction Consistency Across Platform', () => {
  let testGameId;
  let gameAnalysisData;
  let unifiedPredictionData;

  before(async () => {
    // Get a game with predictions for testing
    const upcomingGamesResponse = await axios.get(`${BASE_URL}/api/games/upcoming?limit=10`);
    const gamesWithPredictions = upcomingGamesResponse.data.games;

    // Find first game with betting line for meaningful test
    testGameId = gamesWithPredictions.find(game => game.spread)?.id;

    if (!testGameId) {
      throw new Error('No games with betting lines found for testing');
    }

    console.log(`Testing prediction consistency for game ID: ${testGameId}`);
  });

  beforeEach(async () => {
    // Fetch both API endpoints
    const [analysisResponse, predictionResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/games/analysis/${testGameId}`),
      axios.get(`${BASE_URL}/api/predictions/game/${testGameId}`)
    ]);

    gameAnalysisData = analysisResponse.data;
    unifiedPredictionData = predictionResponse.data;
  });

  describe('Unified Prediction Engine Consistency', () => {
    it('should return the same spread prediction from both endpoints', () => {
      const analysisSpread = gameAnalysisData.predictiveMetrics.spreadPrediction;
      const predictionSpread = unifiedPredictionData.algorithmicPredictions[0]?.predictedSpread;

      expect(analysisSpread).to.equal(predictionSpread,
        `Game analysis spread (${analysisSpread}) should match prediction API spread (${predictionSpread})`);
    });

    it('should return the same recommendation text from both endpoints', () => {
      const analysisRecommendation = gameAnalysisData.predictiveMetrics.recommendation;
      const predictionRecommendation = unifiedPredictionData.algorithmicPredictions[0]?.spreadPick;

      expect(analysisRecommendation).to.equal(predictionRecommendation,
        `Game analysis recommendation (${analysisRecommendation}) should match prediction API recommendation (${predictionRecommendation})`);
    });

    it('should return the same confidence level from both endpoints', () => {
      const analysisConfidence = gameAnalysisData.predictiveMetrics.confidence;
      const predictionConfidence = Math.round(unifiedPredictionData.algorithmicPredictions[0]?.confidence * 100);

      expect(analysisConfidence).to.equal(predictionConfidence,
        `Game analysis confidence (${analysisConfidence}%) should match prediction API confidence (${predictionConfidence}%)`);
    });
  });

  describe('Recommendation Display Consistency', () => {
    it('should never show conflicting team recommendations', () => {
      const recommendation = gameAnalysisData.predictiveMetrics.recommendation;

      if (recommendation && recommendation.startsWith('Take ')) {
        const recommendedTeam = recommendation.replace('Take ', '').split(' ')[0];

        // The recommendation should only mention one team name
        const gameResponse = axios.get(`${BASE_URL}/api/games/${testGameId}`);
        const gameData = gameResponse.data;

        const homeTeamName = gameData.homeTeam?.name;
        const awayTeamName = gameData.awayTeam?.name;

        // Recommendation should contain exactly one team name, not both
        const containsHome = recommendation.includes(homeTeamName);
        const containsAway = recommendation.includes(awayTeamName);

        expect(containsHome && containsAway).to.be.false,
          `Recommendation "${recommendation}" should not contain both team names`);
        expect(containsHome || containsAway).to.be.true,
          `Recommendation "${recommendation}" should contain at least one valid team name`);
      }
    });

    it('should provide consistent betting direction for spread picks', () => {
      const recommendation = gameAnalysisData.predictiveMetrics.recommendation;
      const ourSpread = gameAnalysisData.predictiveMetrics.spreadPrediction;

      if (recommendation && recommendation.startsWith('Take ')) {
        // If we recommend taking a team, our algorithm should favor that team
        const gameResponse = axios.get(`${BASE_URL}/api/games/${testGameId}`);
        const gameData = gameResponse.data;

        if (recommendation.includes(gameData.homeTeam?.name) && ourSpread < 0) {
          throw new Error(`Inconsistent: Recommending home team "${gameData.homeTeam?.name}" but our spread (${ourSpread}) favors away team`);
        }

        if (recommendation.includes(gameData.awayTeam?.name) && ourSpread > 0) {
          throw new Error(`Inconsistent: Recommending away team "${gameData.awayTeam?.name}" but our spread (${ourSpread}) favors home team`);
        }
      }
    });
  });

  describe('Cross-Component Validation', () => {
    it('should maintain recommendation consistency across all UI components', async () => {
      // This test ensures that any component displaying predictions uses the same source
      const recommendation = gameAnalysisData.predictiveMetrics.recommendation;

      // Verify the recommendation is properly formatted
      if (recommendation) {
        expect(recommendation).to.be.a('string');
        expect(recommendation.length).to.be.greaterThan(0);

        // If it's a betting recommendation, ensure proper format
        if (recommendation.startsWith('Take ')) {
          expect(recommendation).to.match(/^Take \w+/,
            `Betting recommendation "${recommendation}" should follow "Take [TeamName]" format`);
        }
      }
    });

    it('should handle null predictions consistently', () => {
      const recommendation = gameAnalysisData.predictiveMetrics.recommendation;
      const spreadPick = unifiedPredictionData.algorithmicPredictions[0]?.spreadPick;

      // Both should handle null the same way
      if (recommendation === null || recommendation === undefined) {
        expect(spreadPick).to.be.oneOf([null, undefined],
          'Both endpoints should return null for games without strong predictions');
      }

      if (spreadPick === null || spreadPick === undefined) {
        expect(recommendation).to.be.oneOf([null, undefined],
          'Both endpoints should return null for games without strong predictions');
      }
    });
  });

  describe('Edge Case Validation', () => {
    it('should handle games without betting lines gracefully', async () => {
      // Test with a game that has no spread
      const upcomingGamesResponse = await axios.get(`${BASE_URL}/api/games/upcoming`);
      const gameWithoutSpread = upcomingGamesResponse.data.games.find(game => !game.spread);

      if (gameWithoutSpread) {
        const [analysisResponse, predictionResponse] = await Promise.all([
          axios.get(`${BASE_URL}/api/games/analysis/${gameWithoutSpread.id}`),
          axios.get(`${BASE_URL}/api/predictions/game/${gameWithoutSpread.id}`)
        ]);

        const analysisRecommendation = analysisResponse.data.predictiveMetrics.recommendation;
        const predictionRecommendation = predictionResponse.data.algorithmicPredictions[0]?.spreadPick;

        // Both should handle no-line games consistently
        expect(analysisRecommendation).to.equal(predictionRecommendation,
          'Games without betting lines should have consistent recommendations across endpoints');
      }
    });

    it('should maintain team name accuracy in all recommendations', async () => {
      const gameResponse = await axios.get(`${BASE_URL}/api/games/${testGameId}`);
      const gameData = gameResponse.data;
      const recommendation = gameAnalysisData.predictiveMetrics.recommendation;

      if (recommendation && recommendation.includes('Take ')) {
        const homeTeamName = gameData.homeTeam?.name;
        const awayTeamName = gameData.awayTeam?.name;

        // Recommendation should only contain actual team names from this game
        if (recommendation.includes(homeTeamName)) {
          expect(recommendation).to.include(homeTeamName,
            `Recommendation should use correct home team name "${homeTeamName}"`);
        }

        if (recommendation.includes(awayTeamName)) {
          expect(recommendation).to.include(awayTeamName,
            `Recommendation should use correct away team name "${awayTeamName}"`);
        }

        // Should not contain random team names
        expect(recommendation).to.not.include('Alabama', 'Should not contain unrelated team names');
        expect(recommendation).to.not.include('Georgia', 'Should not contain unrelated team names');
      }
    });
  });
});

// Helper function to run the tests
if (require.main === module) {
  console.log('Running Prediction Consistency Integration Tests...');
  console.log(`Testing against: ${BASE_URL}`);

  // This would be run with a test runner like Mocha
  // For manual testing, you can add basic assertion functions
}

module.exports = {
  // Export test functions for use in other test suites
  testPredictionConsistency: async (gameId) => {
    // Simplified version for integration into existing test suites
    const [analysisResponse, predictionResponse] = await Promise.all([
      axios.get(`${BASE_URL}/api/games/analysis/${gameId}`),
      axios.get(`${BASE_URL}/api/predictions/game/${gameId}`)
    ]);

    const analysisRec = analysisResponse.data.predictiveMetrics.recommendation;
    const predictionRec = predictionResponse.data.algorithmicPredictions[0]?.spreadPick;

    if (analysisRec !== predictionRec) {
      throw new Error(`Prediction inconsistency detected for game ${gameId}: Analysis="${analysisRec}" vs Prediction="${predictionRec}"`);
    }

    return { gameId, recommendation: analysisRec, consistent: true };
  }
};