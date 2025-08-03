#!/usr/bin/env tsx
import { SPPlusIntegration } from './server/sp-plus-integration';
import { EnhancedPredictionEngine } from './server/enhanced-prediction-engine';

async function testSPPlusImplementation() {
  console.log('🚀 Testing SP+ Integration Implementation');
  console.log('=' + '='.repeat(50));

  try {
    // Test SP+ Integration
    const spPlusIntegration = new SPPlusIntegration();
    console.log('✅ SP+ Integration module loaded successfully');
    
    // Test fetching SP+ ratings
    const ratings = await spPlusIntegration.fetchSPPlusRatings(2024);
    console.log(`📊 SP+ Ratings fetched: ${ratings.length} teams`);
    
    // Show sample ratings
    const topRatings = ratings.slice(0, 5);
    console.log('🏆 Top 5 SP+ Ratings:');
    topRatings.forEach((rating, i) => {
      const ratingVal = typeof rating.rating === 'number' ? rating.rating : parseFloat(rating.rating) || 0;
      const offenseVal = typeof rating.offense === 'number' ? rating.offense : parseFloat(rating.offense) || 0;
      const defenseVal = typeof rating.defense === 'number' ? rating.defense : parseFloat(rating.defense) || 0;
      console.log(`   ${i + 1}. ${rating.team}: ${ratingVal.toFixed(1)} (Off: ${offenseVal.toFixed(1)}, Def: ${defenseVal.toFixed(1)})`);
    });
    
    // Test SP+ enhancement on a sample game
    console.log('\n🧠 Testing SP+ Enhancement on Sample Game...');
    
    // Use a current game ID from the logs
    const testGameId = 82967; // Kansas State @ Iowa State
    const enhancement = await spPlusIntegration.enhancePredictionWithSPPlus(testGameId);
    
    if (enhancement) {
      console.log(`✅ Enhanced Prediction Generated:`);
      console.log(`   Original Spread: ${enhancement.originalSpread}`);
      console.log(`   SP+ Enhanced: ${enhancement.spPlusSpread}`);
      console.log(`   Improvement: ${enhancement.improvement} points`);
      console.log(`   Confidence: ${enhancement.confidence}%`);
      console.log(`   SP+ Advantage: ${enhancement.factors.spPlusAdvantage}`);
    }
    
    // Run accuracy test
    console.log('\n🧪 Running SP+ Accuracy Test...');
    const accuracyTest = await spPlusIntegration.testSPPlusAccuracy(2024);
    
    console.log(`📈 SP+ Test Results:`);
    console.log(`   Sample Size: ${accuracyTest.sampleSize} games`);
    console.log(`   Original Accuracy: ${accuracyTest.originalAccuracy}%`);
    console.log(`   SP+ Enhanced: ${accuracyTest.spPlusAccuracy}%`);
    console.log(`   Improvement: +${accuracyTest.improvement} percentage points`);
    
    const profitabilityStatus = accuracyTest.spPlusAccuracy > 52.4 ? 
      '🎯 ABOVE PROFITABLE THRESHOLD!' : 
      '⚠️ Still below 52.4% threshold';
    console.log(`   Status: ${profitabilityStatus}`);

    // Test Enhanced Prediction Engine
    console.log('\n🎯 Enhanced Prediction Engine Test');
    console.log('=' + '='.repeat(40));

    const enhancedEngine = new EnhancedPredictionEngine();
    console.log('✅ Enhanced Prediction Engine loaded');
    
    // Run validation
    console.log('\n🔬 Running Enhanced Algorithm Validation...');
    const validation = await enhancedEngine.validateEnhancedAlgorithm();
    
    console.log(`📊 Validation Results:`);
    console.log(`   SP+ Accuracy: ${validation.spPlusIntegration.spPlusAccuracy}%`);
    console.log(`   SP+ Improvement: +${validation.spPlusIntegration.improvement} points`);
    console.log(`   Average Enhancement: ${validation.avgImprovement.toFixed(1)} points`);
    console.log(`   Average Confidence: ${validation.avgConfidence.toFixed(1)}%`);
    
    const profitabilityCheck = validation.spPlusIntegration.spPlusAccuracy > 52.4;
    console.log(`\n🎯 PROFITABILITY STATUS: ${profitabilityCheck ? 'PROFITABLE!' : 'NEEDS IMPROVEMENT'}`);
    
    if (profitabilityCheck) {
      console.log('🚀 Algorithm is now above the 52.4% threshold for profitability!');
      const edge = validation.spPlusIntegration.spPlusAccuracy - 52.4;
      console.log(`💰 Edge over break-even: +${edge.toFixed(1)} percentage points`);
    }

    return {
      spPlusWorking: true,
      profitabilityAchieved: profitabilityCheck,
      accuracyImprovement: validation.spPlusIntegration.improvement,
      newAccuracy: validation.spPlusIntegration.spPlusAccuracy
    };
    
  } catch (error) {
    console.error('❌ SP+ Implementation test failed:', error.message);
    return {
      spPlusWorking: false,
      error: error.message
    };
  }
}

testSPPlusImplementation().then(results => {
  console.log('\n📋 FINAL RESULTS:');
  console.log(`SP+ Integration: ${results.spPlusWorking ? '✅ Working' : '❌ Failed'}`);
  if (results.profitabilityAchieved) {
    console.log(`Profitability: ✅ ACHIEVED (${results.newAccuracy}% accuracy)`);
    console.log(`Improvement: +${results.accuracyImprovement} percentage points`);
  } else if (results.spPlusWorking) {
    console.log(`Profitability: ⚠️ In progress (${results.newAccuracy}% accuracy)`);
  }
}).catch(console.error);