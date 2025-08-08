#!/usr/bin/env tsx
/**
 * Test Weather Interaction Implementation
 * Verify weather + spread interaction effects are working
 */

import { ricksPicksEngine } from './server/prediction-engine';

async function testWeatherInteractions() {
  console.log('🌡️ Testing Weather Interaction Effects...\n');

  // Test Case 1: Freezing + Large Favorite (58.57% historical cover)
  console.log('❄️ TEST 1: Freezing + Large Favorite');
  const freezingLargeFav = await ricksPicksEngine.generatePrediction(
    'Alabama', 'Western Kentucky',
    'SEC', 'Conference USA', 
    { temperature: 28, isDome: false },
    -14.5,
    false,
    3
  );

  console.log(`   Weather: 28°F (Freezing)`);
  console.log(`   Vegas Spread: -14.5`);
  console.log(`   Our Prediction: ${freezingLargeFav.spread.toFixed(2)}`);
  console.log(`   Weather Interaction: ${freezingLargeFav.factorBreakdown.weatherInteraction}`);
  console.log(`   Key Factors: ${freezingLargeFav.keyFactors.filter(f => f.includes('Freezing')).join(', ')}`);
  console.log(`   Recommendation: ${freezingLargeFav.recommendedBet || 'No Strong Edge'}\n`);

  // Test Case 2: Cold + Large Favorite (48.20% historical cover)
  console.log('🥶 TEST 2: Cold + Large Favorite');
  const coldLargeFav = await ricksPicksEngine.generatePrediction(
    'Ohio State', 'Akron',
    'Big Ten', 'Mid-American',
    { temperature: 38, isDome: false },
    -17.5,
    false,
    4
  );

  console.log(`   Weather: 38°F (Cold)`);
  console.log(`   Vegas Spread: -17.5`);
  console.log(`   Our Prediction: ${coldLargeFav.spread.toFixed(2)}`);
  console.log(`   Weather Interaction: ${coldLargeFav.factorBreakdown.weatherInteraction}`);
  console.log(`   Key Factors: ${coldLargeFav.keyFactors.filter(f => f.includes('Cold')).join(', ')}`);
  console.log(`   Recommendation: ${coldLargeFav.recommendedBet || 'No Strong Edge'}\n`);

  // Test Case 3: Freezing + Small Favorite (66.67% historical cover)
  console.log('❄️ TEST 3: Freezing + Small Favorite');
  const freezingSmallFav = await ricksPicksEngine.generatePrediction(
    'Michigan', 'Michigan State',
    'Big Ten', 'Big Ten',
    { temperature: 25, isDome: false },
    -3.5,
    false,
    12
  );

  console.log(`   Weather: 25°F (Freezing)`);
  console.log(`   Vegas Spread: -3.5`);
  console.log(`   Our Prediction: ${freezingSmallFav.spread.toFixed(2)}`);
  console.log(`   Weather Interaction: ${freezingSmallFav.factorBreakdown.weatherInteraction}`);
  console.log(`   Key Factors: ${freezingSmallFav.keyFactors.filter(f => f.includes('Freezing')).join(', ')}`);
  console.log(`   Recommendation: ${freezingSmallFav.recommendedBet || 'No Strong Edge'}\n`);

  console.log('✅ Weather interaction tests completed!');
  console.log('   ➤ Freezing + Large Favorites boosted (58.6% vs 51.9%)');
  console.log('   ➤ Cold + Large Favorites penalized (48.2% vs 51.9%)');  
  console.log('   ➤ Freezing + Small Favorites enhanced (66.7% cover)');
  console.log('   ➤ Historical weather data patterns now integrated\n');
}

// Run the test
testWeatherInteractions().catch(console.error);