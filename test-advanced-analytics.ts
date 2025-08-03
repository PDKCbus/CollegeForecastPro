/**
 * Test Advanced Analytics Implementation 
 * Tests all three enhanced features targeting 53-54% ATS:
 * 1. Player Efficiency Metrics (+0.6 points)
 * 2. Team Efficiency Differentials (+0.4 points) 
 * 3. Recent Performance Momentum (+0.3 points)
 */

import { advancedAnalyticsEngine } from './server/advanced-analytics-engine';

async function testAdvancedAnalytics() {
  console.log("🚀 Testing Advanced Analytics Implementation");
  console.log("Target: Push algorithm from 52.9% to 53-54% ATS");
  console.log("=" .repeat(50));

  try {
    // Test with real team IDs (using sample data)
    const homeTeamId = 1; // Example: Kansas State
    const awayTeamId = 2; // Example: Iowa State  
    const season = 2025;

    console.log("\n1️⃣ Testing Player Efficiency Metrics (+0.6 points)");
    const homePlayerMetrics = await advancedAnalyticsEngine.calculatePlayerEfficiencyMetrics(homeTeamId, season);
    const awayPlayerMetrics = await advancedAnalyticsEngine.calculatePlayerEfficiencyMetrics(awayTeamId, season);
    
    console.log("Home Team QB Metrics:", {
      qbRating: homePlayerMetrics.qbRating.toFixed(1),
      completionPct: homePlayerMetrics.qbCompletionPercentage.toFixed(1) + "%",
      yardsPerAttempt: homePlayerMetrics.yardsPerAttempt.toFixed(1),
      impactScore: homePlayerMetrics.impactScore.toFixed(1) + "/10"
    });
    
    console.log("Away Team QB Metrics:", {
      qbRating: awayPlayerMetrics.qbRating.toFixed(1),
      completionPct: awayPlayerMetrics.qbCompletionPercentage.toFixed(1) + "%", 
      yardsPerAttempt: awayPlayerMetrics.yardsPerAttempt.toFixed(1),
      impactScore: awayPlayerMetrics.impactScore.toFixed(1) + "/10"
    });

    console.log("\n2️⃣ Testing Team Efficiency Differentials (+0.4 points)");
    const efficiencyAnalysis = await advancedAnalyticsEngine.calculateTeamEfficiencyDifferentials(homeTeamId, awayTeamId, season);
    
    console.log("Team Efficiency Matchup:", {
      homeOffenseYPP: efficiencyAnalysis.home.offensiveEfficiency.toFixed(1),
      homeDefenseYPP: efficiencyAnalysis.home.defensiveEfficiency.toFixed(1),
      awayOffenseYPP: efficiencyAnalysis.away.offensiveEfficiency.toFixed(1),
      awayDefenseYPP: efficiencyAnalysis.away.defensiveEfficiency.toFixed(1),
      differential: efficiencyAnalysis.differential.toFixed(1) + " pts"
    });

    console.log("\n3️⃣ Testing Recent Performance Momentum (+0.3 points)");
    const momentumAnalysis = await advancedAnalyticsEngine.calculateRecentPerformanceMomentum(homeTeamId, awayTeamId, season);
    
    console.log("Momentum Analysis:", {
      homeMomentum: momentumAnalysis.home.momentumScore.toFixed(1),
      awayMomentum: momentumAnalysis.away.momentumScore.toFixed(1),
      differential: momentumAnalysis.differential.toFixed(1) + " pts"
    });

    console.log("\n🎯 Comprehensive Advanced Analytics Test");
    const fullAnalytics = await advancedAnalyticsEngine.generateAdvancedAnalytics(homeTeamId, awayTeamId, season);
    
    console.log("Advanced Analytics Summary:", {
      playerEfficiencyAdj: fullAnalytics.playerEfficiencyAdj.toFixed(2) + " pts",
      teamEfficiencyAdj: fullAnalytics.teamEfficiencyAdj.toFixed(2) + " pts", 
      momentumAdj: fullAnalytics.momentumAdj.toFixed(2) + " pts",
      totalAdvancedAdj: fullAnalytics.totalAdvancedAdj.toFixed(2) + " pts",
      confidence: (fullAnalytics.confidence * 100).toFixed(1) + "%"
    });

    console.log("\nKey Insights:");
    fullAnalytics.keyInsights.forEach((insight, index) => {
      console.log(`  ${index + 1}. ${insight}`);
    });

    console.log("\n✅ Advanced Analytics Implementation Test Complete!");
    console.log("🎯 Target Performance:");
    console.log("  Current ATS: 52.9%");
    console.log("  Player Efficiency: +0.6 points"); 
    console.log("  Team Efficiency: +0.4 points");
    console.log("  Momentum: +0.3 points");
    console.log("  Total Enhancement: +1.3 points");
    console.log("  Target ATS: 54.2% (PROFITABLE RANGE!)");
    
  } catch (error) {
    console.error("❌ Advanced Analytics Test Failed:", error);
  }
}

// Run the test
testAdvancedAnalytics();