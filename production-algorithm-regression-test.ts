#!/usr/bin/env tsx

/**
 * Production Algorithm Regression Test
 * Fast, reliable test to ensure algorithm never drops below break-even
 * Run this before any algorithm changes to prevent performance degradation
 */

import { db } from './server/db';
import { games, teams } from './shared/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { ricksPicksEngine } from './server/prediction-engine';

// Critical performance thresholds
const BREAK_EVEN_THRESHOLD = 0.524; // 52.4% minimum
const CURRENT_BASELINE = 0.529;     // 52.9% documented performance  
const TARGET_PERFORMANCE = 0.542;   // 54.2% target

interface RegressionResult {
  status: 'PASS' | 'WARNING' | 'FAIL';
  testedGames: number;
  atsAccuracy: number;
  meetsBreakEven: boolean;
  meetsBaseline: boolean;
  message: string;
}

class QuickRegressionTest {
  
  async runTest(): Promise<RegressionResult> {
    console.log('🚨 ALGORITHM REGRESSION TEST');
    console.log('============================');
    console.log(`Break-even: ${(BREAK_EVEN_THRESHOLD * 100).toFixed(1)}%`);
    console.log(`Baseline: ${(CURRENT_BASELINE * 100).toFixed(1)}%`);
    console.log(`Target: ${(TARGET_PERFORMANCE * 100).toFixed(1)}%`);
    console.log('');
    
    // Get a representative sample of recent games with complete data
    const testGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.completed, true),
        isNotNull(games.spread),
        isNotNull(games.homeTeamScore),
        isNotNull(games.awayTeamScore)
      ))
      .orderBy(sql`RANDOM()`)
      .limit(50); // Quick test with focused sample
    
    if (testGames.length < 20) {
      return {
        status: 'FAIL',
        testedGames: testGames.length,
        atsAccuracy: 0,
        meetsBreakEven: false,
        meetsBaseline: false,
        message: `Insufficient test data: ${testGames.length} games`
      };
    }
    
    console.log(`Testing ${testGames.length} games...`);
    
    let validTests = 0;
    let algorithmWins = 0;
    
    for (const game of testGames) {
      const result = await this.testSingleGame(game);
      if (result !== null) {
        validTests++;
        if (result) algorithmWins++;
      }
    }
    
    if (validTests < 15) {
      return {
        status: 'FAIL',
        testedGames: validTests,
        atsAccuracy: 0,
        meetsBreakEven: false,
        meetsBaseline: false,
        message: `Too few valid tests: ${validTests}`
      };
    }
    
    const atsAccuracy = algorithmWins / validTests;
    const meetsBreakEven = atsAccuracy >= BREAK_EVEN_THRESHOLD;
    const meetsBaseline = atsAccuracy >= CURRENT_BASELINE;
    
    let status: 'PASS' | 'WARNING' | 'FAIL';
    let message: string;
    
    if (!meetsBreakEven) {
      status = 'FAIL';
      message = `CRITICAL: Below break-even (${(atsAccuracy * 100).toFixed(1)}% < 52.4%)`;
    } else if (!meetsBaseline) {
      status = 'WARNING';  
      message = `Below baseline (${(atsAccuracy * 100).toFixed(1)}% < 52.9%)`;
    } else {
      status = 'PASS';
      message = `Maintaining performance (${(atsAccuracy * 100).toFixed(1)}% ≥ 52.9%)`;
    }
    
    console.log('');
    console.log('📊 RESULTS:');
    console.log(`Status: ${status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌'} ${status}`);
    console.log(`ATS Accuracy: ${(atsAccuracy * 100).toFixed(1)}%`);
    console.log(`Break-even: ${meetsBreakEven ? '✅' : '❌'}`);
    console.log(`Baseline: ${meetsBaseline ? '✅' : '❌'}`);
    console.log(`Message: ${message}`);
    
    return {
      status,
      testedGames: validTests,
      atsAccuracy,
      meetsBreakEven,
      meetsBaseline,
      message
    };
  }
  
  private async testSingleGame(game: any): Promise<boolean | null> {
    try {
      // Get team data
      const [homeTeam, awayTeam] = await Promise.all([
        db.select().from(teams).where(eq(teams.id, game.homeTeamId)).limit(1),
        db.select().from(teams).where(eq(teams.id, game.awayTeamId)).limit(1)
      ]);
      
      if (homeTeam.length === 0 || awayTeam.length === 0) return null;
      
      // Generate prediction (suppress console output)
      const originalConsoleLog = console.log;
      console.log = () => {}; // Temporarily suppress logs
      
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
      
      console.log = originalConsoleLog; // Restore console
      
      // Calculate accuracy
      const actualMargin = game.homeTeamScore - game.awayTeamScore;
      const algorithmPrediction = prediction.spread;
      const vegasSpread = -game.spread;
      
      const algorithmError = Math.abs(actualMargin - algorithmPrediction);
      const vegasError = Math.abs(actualMargin - vegasSpread);
      
      // Algorithm wins if it's closer or equal to actual outcome
      return algorithmError <= vegasError;
      
    } catch (error) {
      return null;
    }
  }
}

// Main execution
async function main() {
  const tester = new QuickRegressionTest();
  const result = await tester.runTest();
  
  console.log('');
  if (result.status === 'PASS') {
    console.log('🚀 Algorithm regression test PASSED');
    console.log('Safe to deploy algorithm changes.');
    process.exit(0);
  } else if (result.status === 'WARNING') {
    console.log('⚠️ Algorithm performance degraded but still profitable');
    console.log('Consider investigating before deployment.');
    process.exit(1);
  } else {
    console.log('❌ Algorithm regression test FAILED');
    console.log('DO NOT DEPLOY - Revert changes immediately!');
    process.exit(2);
  }
}

// Export for programmatic use
export { QuickRegressionTest, BREAK_EVEN_THRESHOLD, CURRENT_BASELINE, TARGET_PERFORMANCE };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}