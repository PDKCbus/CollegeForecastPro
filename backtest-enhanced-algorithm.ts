#!/usr/bin/env tsx
/**
 * Backtest Enhanced Algorithm - Check if we've reached 54% accuracy
 * Test our enhanced prediction engine with all new betting patterns
 */

import { ricksPicksEngine } from './server/prediction-engine';
import { storage } from './server/storage';

async function backtestEnhancedAlgorithm() {
  console.log('🎯 Backtesting Enhanced Algorithm with All New Patterns...\n');
  
  try {
    // Get a sample of historical games for testing
    const testGames = await storage.getHistoricalGames(2024, undefined, 500); // Test on 500 games from 2024
    console.log(`📊 Testing on ${testGames.length} completed games...\n`);
    
    let correctPredictions = 0;
    let totalPredictions = 0;
    let correctSpreadPicks = 0;
    const results: any[] = [];
    
    for (const game of testGames) {
      try {
        // Get team details
        const homeTeam = await storage.getTeam(game.homeTeamId);
        const awayTeam = await storage.getTeam(game.awayTeamId);
        
        if (!homeTeam || !awayTeam || game.homeTeamScore === null || game.awayTeamScore === null || !game.spread) {
          continue;
        }
        
        // Generate prediction using enhanced engine
        const prediction = await ricksPicksEngine.generatePrediction(
          homeTeam.name,
          awayTeam.name,
          homeTeam.conference || 'Independent',
          awayTeam.conference || 'Independent',
          {
            temperature: game.temperature,
            windSpeed: game.windSpeed,
            isDome: game.isDome || false,
            precipitation: game.precipitation,
            weatherCondition: game.weatherCondition
          },
          game.spread,
          game.isNeutralSite || false,
          game.week
        );
        
        // Calculate actual ATS result
        const actualSpread = game.homeTeamScore - game.awayTeamScore;
        const atsResult = actualSpread + game.spread; // Positive = favorite covered
        const favoriteCovered = atsResult > 0;
        
        // Check if our prediction was correct
        const ourPredictionFavoriteCovered = prediction.spread > 0;
        const predictionCorrect = favoriteCovered === ourPredictionFavoriteCovered;
        
        if (predictionCorrect) correctPredictions++;
        
        // Check spread prediction accuracy (within 3 points)
        const spreadError = Math.abs(prediction.spread - actualSpread);
        if (spreadError <= 3) correctSpreadPicks++;
        
        totalPredictions++;
        
        results.push({
          game: `${homeTeam.name} vs ${awayTeam.name}`,
          actualSpread,
          predictedSpread: prediction.spread,
          spreadError,
          atsResult,
          favoriteCovered,
          ourPrediction: ourPredictionFavoriteCovered,
          correct: predictionCorrect,
          factors: prediction.keyFactors.length,
          newFactors: [
            prediction.factorBreakdown.largeFavoriteRisk,
            prediction.factorBreakdown.seasonalPattern,
            prediction.factorBreakdown.weatherInteraction
          ].filter(f => f !== 0).length
        });
        
      } catch (error) {
        console.log(`⚠️ Error processing game ${game.id}:`, error);
      }
    }
    
    const accuracy = (correctPredictions / totalPredictions) * 100;
    const spreadAccuracy = (correctSpreadPicks / totalPredictions) * 100;
    
    console.log('📈 ENHANCED ALGORITHM BACKTEST RESULTS:\n');
    console.log(`   Games Analyzed: ${totalPredictions}`);
    console.log(`   Correct ATS Predictions: ${correctPredictions}`);
    console.log(`   🎯 Overall Accuracy: ${accuracy.toFixed(2)}%`);
    console.log(`   Spread Accuracy (±3pts): ${spreadAccuracy.toFixed(2)}%\n`);
    
    // Analyze results by new factors
    const gamesWithNewFactors = results.filter(r => r.newFactors > 0);
    const newFactorAccuracy = gamesWithNewFactors.filter(r => r.correct).length / gamesWithNewFactors.length * 100;
    
    console.log(`   Games with New Betting Patterns: ${gamesWithNewFactors.length}`);
    console.log(`   New Pattern Accuracy: ${newFactorAccuracy.toFixed(2)}%\n`);
    
    // Check if we reached our target
    if (accuracy >= 54.0) {
      console.log('🎉 SUCCESS: We have reached our 54% accuracy target!');
      console.log(`   Our enhanced algorithm achieves ${accuracy.toFixed(2)}% accuracy`);
    } else {
      console.log(`⚡ PROGRESS: Current accuracy is ${accuracy.toFixed(2)}%`);
      console.log(`   Target: 54.0% (Need +${(54.0 - accuracy).toFixed(2)}% improvement)`);
    }
    
    // Show sample of predictions
    console.log('\n📋 Sample Enhanced Predictions:');
    const samples = results.slice(0, 5);
    samples.forEach(r => {
      console.log(`   ${r.game}:`);
      console.log(`     Predicted: ${r.predictedSpread.toFixed(1)}, Actual: ${r.actualSpread}`);
      console.log(`     ATS Result: ${r.correct ? '✅ Correct' : '❌ Wrong'} (Error: ${r.spreadError.toFixed(1)}pts)`);
      console.log(`     New Factors Applied: ${r.newFactors}`);
    });
    
  } catch (error) {
    console.error('❌ Backtest failed:', error);
  }
}

// Run the backtest
backtestEnhancedAlgorithm().catch(console.error);