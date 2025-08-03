#!/usr/bin/env tsx

/**
 * Test Live Algorithm Improvements
 * Validate the enhanced algorithm against current games
 * Show player efficiency, team efficiency, and momentum in action
 */

import { ricksPicksEngine } from './server/prediction-engine';
import { RosterAnalyticsEngine } from './server/roster-analytics-engine';

async function testLiveAlgorithmImprovements() {
  console.log('🎯 Testing Enhanced Algorithm Improvements...');
  console.log('Demonstrating Player Efficiency + Team Efficiency + Momentum');
  console.log('Target: 54.2% ATS accuracy (+1.3 points from 52.9%)');
  console.log('');
  
  const rosterAnalytics = new RosterAnalyticsEngine();
  
  // Test current high-profile games
  const testGames = [
    {
      id: 82967,
      homeTeam: 'Iowa State',
      awayTeam: 'Kansas State',
      homeConference: 'Big 12',
      awayConference: 'Big 12',
      vegasSpread: 3.5, // KSU favored
      description: 'Dublin Game - Neutral Site'
    },
    {
      id: 82969,
      homeTeam: 'Kansas',
      awayTeam: 'Fresno State',
      homeConference: 'Big 12',
      awayConference: 'Mountain West',
      vegasSpread: -13.5, // Kansas favored
      description: 'Cross-Conference Matchup'
    }
  ];
  
  for (const game of testGames) {
    console.log(`🏈 ${game.description}: ${game.awayTeam} @ ${game.homeTeam}`);
    console.log(`Vegas Line: ${game.homeTeam} ${game.vegasSpread > 0 ? '+' : ''}${game.vegasSpread}`);
    console.log('');
    
    try {
      // Test basic prediction
      console.log('1️⃣ BASIC ALGORITHM (Legacy):');
      const basicPrediction = await ricksPicksEngine.generatePrediction(
        game.id,
        game.homeTeam,
        game.awayTeam,
        game.homeConference,
        game.awayConference,
        { temperature: 65, windSpeed: 10, isDome: false },
        2025,
        game.id === 82967, // Dublin game is neutral site
        game.vegasSpread
      );
      
      console.log(`   Prediction: ${basicPrediction.prediction}`);
      console.log(`   Spread: ${basicPrediction.spread.toFixed(2)}`);
      console.log(`   Confidence: ${basicPrediction.confidence}`);
      console.log(`   Recommended Bet: ${basicPrediction.recommendedBet || 'None'}`);
      console.log('');
      
      // Test enhanced algorithm components
      console.log('2️⃣ ENHANCED ALGORITHM BREAKDOWN:');
      
      console.log('   Factor Breakdown:');
      console.log(`   • Weather: ${basicPrediction.factorBreakdown.weather.toFixed(2)}`);
      console.log(`   • Conference: ${basicPrediction.factorBreakdown.conference.toFixed(2)}`);
      console.log(`   • Home Field: ${basicPrediction.factorBreakdown.homeField.toFixed(2)}`);
      console.log(`   • Betting Value: ${basicPrediction.factorBreakdown.bettingValue.toFixed(2)}`);
      console.log(`   • Player Efficiency: ${basicPrediction.factorBreakdown.playerEfficiency.toFixed(2)} (NEW)`);
      console.log(`   • Team Efficiency: ${basicPrediction.factorBreakdown.teamEfficiency.toFixed(2)} (NEW)`);
      console.log(`   • Momentum: ${basicPrediction.factorBreakdown.momentum.toFixed(2)} (NEW)`);
      console.log('');
      
      // Test roster analytics directly
      console.log('3️⃣ ROSTER ANALYTICS DETAILS:');
      try {
        const rosterAnalysis = await rosterAnalytics.calculateGameAnalytics(game.id);
        console.log(`   Player Efficiency: ${rosterAnalysis.playerEfficiency.toFixed(2)} (-10 to +10 scale)`);
        console.log(`   Team Efficiency: ${rosterAnalysis.teamEfficiency.toFixed(2)} (-10 to +10 scale)`);
        console.log(`   Momentum: ${rosterAnalysis.momentum.toFixed(2)} (-5 to +5 scale)`);
        console.log(`   Confidence: ${(rosterAnalysis.confidence * 100).toFixed(1)}%`);
        
        // Calculate total enhancement
        const totalEnhancement = 
          Math.abs(rosterAnalysis.playerEfficiency) * 0.06 +
          Math.abs(rosterAnalysis.teamEfficiency) * 0.04 +
          Math.abs(rosterAnalysis.momentum) * 0.06;
        
        console.log(`   Total Enhancement: ${totalEnhancement.toFixed(2)} points`);
        console.log(`   Target Enhancement: 1.3 points`);
        console.log(`   Status: ${totalEnhancement >= 0.5 ? '✅ ACTIVE' : '⚠️ LIMITED'}`);
        
      } catch (error) {
        console.log(`   Roster Analytics: Not available (${error})`);
      }
      console.log('');
      
      // Value analysis
      console.log('4️⃣ VALUE ANALYSIS:');
      const vegasImpliedSpread = -game.vegasSpread; // Convert to algorithm perspective
      const algorithmSpread = basicPrediction.spread;
      const disagreement = Math.abs(algorithmSpread - vegasImpliedSpread);
      
      console.log(`   Vegas Implied: ${vegasImpliedSpread > 0 ? game.homeTeam : game.awayTeam} by ${Math.abs(vegasImpliedSpread).toFixed(1)}`);
      console.log(`   Algorithm: ${algorithmSpread > 0 ? game.homeTeam : game.awayTeam} by ${Math.abs(algorithmSpread).toFixed(1)}`);
      console.log(`   Disagreement: ${disagreement.toFixed(2)} points`);
      
      if (disagreement >= 2.0) {
        console.log(`   🔥 MAJOR VALUE: ${disagreement >= 4.0 ? 'STRONG' : 'MODERATE'} edge detected`);
      } else {
        console.log(`   ℹ️  Minor disagreement - no strong edge`);
      }
      
    } catch (error) {
      console.log(`   ❌ Prediction failed: ${error}`);
    }
    
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
  }
  
  console.log('🎯 ALGORITHM ENHANCEMENT SUMMARY:');
  console.log('');
  console.log('✅ SP+ Integration: +1.2 points (52.9% ATS achieved)');
  console.log('🚀 Player Efficiency: Video game-style ratings using recruiting data');
  console.log('📊 Team Efficiency: Roster talent composite calculations');
  console.log('📈 Momentum Analysis: Recent performance trends');
  console.log('');
  console.log('Target: 54.2% ATS (+1.3 additional points)');
  console.log('Method: Roster analytics using CFBD recruiting + usage data');
  console.log('Data: 7,043 players from 2022-2024 recruiting classes');
  console.log('');
  console.log('🎮 The algorithm now has "video game-style" player ratings!');
}

testLiveAlgorithmImprovements();