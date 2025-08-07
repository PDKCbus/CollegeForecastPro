#!/usr/bin/env tsx

/**
 * Algorithm Regression Test Suite
 * Ensures algorithm never drops below break-even threshold (52.4% ATS)
 * Run before any algorithm modifications to prevent performance degradation
 */

import { db } from './server/db';
import { games, teams } from './shared/schema';
import { eq, and } from 'drizzle-orm';
import { ricksPicksEngine } from './server/prediction-engine';

// Critical thresholds - NEVER allow performance below these
const BREAK_EVEN_THRESHOLD = 0.524; // 52.4% minimum for profitability
const TARGET_ACCURACY = 0.542; // 54.2% target performance
const MIN_TEST_GAMES = 100; // Minimum games for valid test

interface RegressionTestResult {
  totalGames: number;
  atsAccuracy: number;
  passesBreakEven: boolean;
  achievesTarget: boolean;
  averageConfidence: number;
  profitMargin: number;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
}

class AlgorithmRegressionTester {
  
  async runRegressionTest(): Promise<RegressionTestResult> {
    console.log('🚨 ALGORITHM REGRESSION TEST STARTING...');
    console.log('=========================================');
    console.log(`Break-even Threshold: ${(BREAK_EVEN_THRESHOLD * 100).toFixed(1)}%`);
    console.log(`Target Performance: ${(TARGET_ACCURACY * 100).toFixed(1)}%`);
    console.log('');
    
    // Get recent completed games for testing (last 200 games)
    const testGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.completed, true)
      ))
      .orderBy(games.id)
      .limit(200);
    
    if (testGames.length < MIN_TEST_GAMES) {
      return {
        totalGames: testGames.length,
        atsAccuracy: 0,
        passesBreakEven: false,
        achievesTarget: false,
        averageConfidence: 0,
        profitMargin: 0,
        status: 'FAIL',
        message: `Insufficient test data: ${testGames.length} games (need ${MIN_TEST_GAMES})`
      };
    }
    
    console.log(`📊 Testing ${testGames.length} completed games...`);
    
    let correctATS = 0;
    let totalValidGames = 0;
    let totalConfidence = 0;
    
    for (const game of testGames) {
      try {
        const result = await this.testGamePrediction(game);
        if (result !== null) {
          totalValidGames++;
          if (result.atsCorrect) correctATS++;
          totalConfidence += result.confidenceScore;
        }
      } catch (error) {
        // Skip games with incomplete data
        continue;
      }
      
      // Show progress every 50 games
      if (totalValidGames % 50 === 0 && totalValidGames > 0) {
        const currentAccuracy = correctATS / totalValidGames;
        console.log(`   Progress: ${totalValidGames} games tested, ${(currentAccuracy * 100).toFixed(1)}% ATS`);
      }
    }
    
    if (totalValidGames < MIN_TEST_GAMES) {
      return {
        totalGames: totalValidGames,
        atsAccuracy: 0,
        passesBreakEven: false,
        achievesTarget: false,
        averageConfidence: 0,
        profitMargin: 0,
        status: 'FAIL',
        message: `Insufficient valid games: ${totalValidGames} (need ${MIN_TEST_GAMES})`
      };
    }
    
    const atsAccuracy = correctATS / totalValidGames;
    const averageConfidence = totalConfidence / totalValidGames;
    const profitMargin = atsAccuracy - BREAK_EVEN_THRESHOLD;
    const passesBreakEven = atsAccuracy >= BREAK_EVEN_THRESHOLD;
    const achievesTarget = atsAccuracy >= TARGET_ACCURACY;
    
    let status: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    let message = '';
    
    if (!passesBreakEven) {
      status = 'FAIL';
      message = `CRITICAL: Algorithm below break-even (${(atsAccuracy * 100).toFixed(1)}% < ${(BREAK_EVEN_THRESHOLD * 100).toFixed(1)}%)`;
    } else if (!achievesTarget) {
      status = 'WARNING';
      message = `Algorithm profitable but below target (${(atsAccuracy * 100).toFixed(1)}% < ${(TARGET_ACCURACY * 100).toFixed(1)}%)`;
    } else {
      status = 'PASS';
      message = `Algorithm performing above target (${(atsAccuracy * 100).toFixed(1)}% ≥ ${(TARGET_ACCURACY * 100).toFixed(1)}%)`;
    }
    
    // Display results
    console.log('');
    console.log('🎯 REGRESSION TEST RESULTS:');
    console.log('============================');
    console.log(`Status: ${status === 'PASS' ? '✅ PASS' : status === 'WARNING' ? '⚠️ WARNING' : '❌ FAIL'}`);
    console.log(`Total Games: ${totalValidGames}`);
    console.log(`ATS Accuracy: ${(atsAccuracy * 100).toFixed(1)}%`);
    console.log(`Break-even: ${passesBreakEven ? '✅' : '❌'} (${(BREAK_EVEN_THRESHOLD * 100).toFixed(1)}% required)`);
    console.log(`Target: ${achievesTarget ? '✅' : '❌'} (${(TARGET_ACCURACY * 100).toFixed(1)}% target)`);
    console.log(`Profit Margin: ${profitMargin >= 0 ? '+' : ''}${(profitMargin * 100).toFixed(1)}%`);
    console.log(`Avg Confidence: ${averageConfidence.toFixed(1)}`);
    console.log('');
    console.log(`Message: ${message}`);
    console.log('');
    
    if (status === 'FAIL') {
      console.log('🚨 ALGORITHM REGRESSION DETECTED!');
      console.log('DO NOT DEPLOY THIS VERSION!');
      console.log('Revert changes and investigate algorithm degradation.');
    } else if (status === 'WARNING') {
      console.log('⚠️  Algorithm needs optimization but is profitable.');
      console.log('Consider improvements before next release.');
    } else {
      console.log('🚀 Algorithm passed regression test!');
      console.log('Performance maintained above target threshold.');
    }
    
    return {
      totalGames: totalValidGames,
      atsAccuracy,
      passesBreakEven,
      achievesTarget,
      averageConfidence,
      profitMargin,
      status,
      message
    };
  }
  
  private async testGamePrediction(game: any): Promise<{
    atsCorrect: boolean;
    confidenceScore: number;
  } | null> {
    // Skip games without complete data
    if (!game.homeTeamScore || !game.awayTeamScore || !game.spread) {
      return null;
    }
    
    // Get team data
    const [homeTeam, awayTeam] = await Promise.all([
      db.select().from(teams).where(eq(teams.id, game.homeTeamId)).limit(1),
      db.select().from(teams).where(eq(teams.id, game.awayTeamId)).limit(1)
    ]);
    
    if (homeTeam.length === 0 || awayTeam.length === 0) return null;
    
    try {
      // Generate algorithm prediction
      const prediction = await ricksPicksEngine.generatePrediction(
        homeTeam[0].name,
        awayTeam[0].name,
        homeTeam[0].conference || 'Unknown',
        awayTeam[0].conference || 'Unknown',
        {
          temperature: game.temperature || 70,
          windSpeed: game.windSpeed || 5,
          isDome: game.isDome || false
        },
        game.spread,
        game.isNeutralSite || false
      );
      
      // Calculate actual game outcome
      const actualSpread = game.homeTeamScore - game.awayTeamScore;
      const predictedSpread = prediction.spread;
      const vegasSpread = game.spread;
      
      // Determine if algorithm beat Vegas ATS
      const algorithmError = Math.abs(actualSpread - predictedSpread);
      const vegasError = Math.abs(actualSpread - (-vegasSpread)); // Vegas spread is from home perspective
      const atsCorrect = algorithmError <= vegasError;
      
      // Convert confidence to numeric score
      const confidenceScore = prediction.confidence === 'High' ? 3 : 
                              prediction.confidence === 'Medium' ? 2 : 1;
      
      return {
        atsCorrect,
        confidenceScore
      };
      
    } catch (error) {
      return null;
    }
  }
}

// CLI usage
async function main() {
  const tester = new AlgorithmRegressionTester();
  const result = await tester.runRegressionTest();
  
  // Exit with error code if test fails
  if (result.status === 'FAIL') {
    process.exit(1);
  } else if (result.status === 'WARNING') {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Export for programmatic usage
export { AlgorithmRegressionTester, type RegressionTestResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}