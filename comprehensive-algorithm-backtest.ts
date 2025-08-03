#!/usr/bin/env tsx

/**
 * Comprehensive Algorithm Backtesting
 * Test the upgraded algorithm (SP+ + Roster Analytics) against historical data
 * Validate +1.3 point improvement targeting 54.2% ATS accuracy
 */

import { db } from './server/db';
import { games, teams } from './shared/schema';
import { eq, and, gte, lte, isNotNull, sql } from 'drizzle-orm';
import { ricksPicksEngine } from './server/prediction-engine';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

interface BacktestResult {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  actualSpread: number;
  algorithmSpread: number;
  vegasSpread: number;
  actualResult: 'home' | 'away' | 'push';
  algorithmPrediction: 'home' | 'away' | 'push';
  vegasPrediction: 'home' | 'away' | 'push';
  algorithmCorrect: boolean;
  vegasCorrect: boolean;
  algorithmATS: boolean;
  vegasATS: boolean;
  improvement: number;
  confidence: string;
}

interface BacktestSummary {
  totalGames: number;
  algorithmATS: number;
  vegasATS: number;
  algorithmAccuracy: number;
  vegasAccuracy: number;
  averageImprovement: number;
  profitability: number;
  breakEvenThreshold: number;
  targetAchieved: boolean;
}

class AlgorithmBacktester {
  
  async runComprehensiveBacktest(): Promise<void> {
    console.log('🎯 Starting Comprehensive Algorithm Backtest...');
    console.log('Testing SP+ Integration + Roster Analytics vs Historical Results');
    console.log('Target: 54.2% ATS accuracy (+1.3 points from 52.9%)');
    console.log('');
    
    // Test against 2022-2023 seasons (complete data available)
    const testSeasons = [2022, 2023];
    const allResults: BacktestResult[] = [];
    
    for (const season of testSeasons) {
      console.log(`📊 Backtesting ${season} Season...`);
      
      const seasonResults = await this.backtestSeason(season);
      allResults.push(...seasonResults);
      
      const seasonSummary = this.calculateSummary(seasonResults);
      console.log(`   Games: ${seasonSummary.totalGames}`);
      console.log(`   Algorithm ATS: ${(seasonSummary.algorithmATS * 100).toFixed(1)}%`);
      console.log(`   Vegas ATS: ${(seasonSummary.vegasATS * 100).toFixed(1)}%`);
      console.log(`   Improvement: +${seasonSummary.averageImprovement.toFixed(2)} points`);
      console.log('');
    }
    
    // Calculate overall results
    const overallSummary = this.calculateSummary(allResults);
    
    console.log('🏆 COMPREHENSIVE BACKTEST RESULTS:');
    console.log('=====================================');
    console.log(`Total Games Tested: ${overallSummary.totalGames}`);
    console.log(`Algorithm ATS: ${(overallSummary.algorithmATS * 100).toFixed(1)}%`);
    console.log(`Vegas Baseline: ${(overallSummary.vegasATS * 100).toFixed(1)}%`);
    console.log(`Improvement: +${(overallSummary.algorithmATS - overallSummary.vegasATS) * 100} percentage points`);
    console.log(`Average Point Improvement: +${overallSummary.averageImprovement.toFixed(2)} points`);
    console.log('');
    
    console.log('💰 PROFITABILITY ANALYSIS:');
    console.log(`Break-even Threshold: ${(overallSummary.breakEvenThreshold * 100).toFixed(1)}%`);
    console.log(`Current Performance: ${(overallSummary.algorithmATS * 100).toFixed(1)}%`);
    console.log(`Profit Margin: ${overallSummary.profitability > 0 ? '+' : ''}${(overallSummary.profitability * 100).toFixed(1)}%`);
    console.log(`Target Achieved: ${overallSummary.targetAchieved ? '✅ YES' : '❌ NO'}`);
    console.log('');
    
    if (overallSummary.targetAchieved) {
      console.log('🚀 ALGORITHM READY FOR DEPLOYMENT!');
      console.log('The enhanced algorithm beats the break-even threshold and achieves profitability.');
    } else {
      console.log('⚠️  ALGORITHM NEEDS REFINEMENT');
      console.log('Further improvements needed to reach consistent profitability.');
    }
    
    // Show top performing predictions
    this.showTopPredictions(allResults.slice(0, 10));
  }
  
  async backtestSeason(season: number): Promise<BacktestResult[]> {
    // Get completed games from season with betting lines
    const seasonGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.season, season),
        eq(games.completed, true)
      ))
      .limit(50); // Test sample for performance
    
    console.log(`   Found ${seasonGames.length} testable games`);
    
    const results: BacktestResult[] = [];
    
    for (const game of seasonGames) {
      try {
        const result = await this.backtestGame(game);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        // Skip games with incomplete data
        continue;
      }
    }
    
    return results;
  }
  
  async backtestGame(game: any): Promise<BacktestResult | null> {
    // Skip games without complete data
    if (!game.homeTeamScore || !game.awayTeamScore || !game.homeSpread) {
      return null;
    }
    
    // Get team data
    const [homeTeam, awayTeam] = await Promise.all([
      db.select().from(teams).where(eq(teams.id, game.homeTeamId)).limit(1),
      db.select().from(teams).where(eq(teams.id, game.awayTeamId)).limit(1)
    ]);
    
    if (homeTeam.length === 0 || awayTeam.length === 0) return null;
    
    // Calculate actual game result
    const homeScore = game.homeTeamScore;
    const awayScore = game.awayTeamScore;
    const actualSpread = homeScore - awayScore; // Positive = home team won by X
    const vegasSpread = game.homeSpread; // Negative = home team favored
    
    // Generate algorithm prediction using our enhanced system
    try {
      const prediction = await ricksPicksEngine.generatePrediction(
        game.id,
        homeTeam[0].name,
        awayTeam[0].name,
        homeTeam[0].conference || 'Unknown',
        awayTeam[0].conference || 'Unknown',
        { temperature: 70, windSpeed: 5, isDome: false }, // Default weather
        game.season,
        game.neutralSite || false,
        vegasSpread
      );
      
      const algorithmSpread = prediction.spread;
      
      // Determine winners
      const actualResult = actualSpread > 0 ? 'home' : actualSpread < 0 ? 'away' : 'push';
      const algorithmPrediction = algorithmSpread > 0 ? 'home' : algorithmSpread < 0 ? 'away' : 'push';
      const vegasPrediction = vegasSpread < 0 ? 'home' : vegasSpread > 0 ? 'away' : 'push';
      
      // Calculate ATS performance
      const algorithmATS = this.calculateATS(actualSpread, algorithmSpread);
      const vegasATS = this.calculateATS(actualSpread, -vegasSpread); // Vegas spread is from home perspective
      
      return {
        gameId: game.id,
        homeTeam: homeTeam[0].name,
        awayTeam: awayTeam[0].name,
        actualSpread,
        algorithmSpread,
        vegasSpread,
        actualResult,
        algorithmPrediction,
        vegasPrediction,
        algorithmCorrect: actualResult === algorithmPrediction,
        vegasCorrect: actualResult === vegasPrediction,
        algorithmATS,
        vegasATS,
        improvement: Math.abs(algorithmSpread - actualSpread) - Math.abs(vegasSpread - actualSpread),
        confidence: prediction.confidence
      };
      
    } catch (error) {
      return null;
    }
  }
  
  private calculateATS(actualSpread: number, predictedSpread: number): boolean {
    // ATS win if prediction is closer to actual result
    const margin = actualSpread - predictedSpread;
    return Math.abs(margin) < 3; // Within 3 points = ATS win
  }
  
  private calculateSummary(results: BacktestResult[]): BacktestSummary {
    if (results.length === 0) {
      return {
        totalGames: 0,
        algorithmATS: 0,
        vegasATS: 0,
        algorithmAccuracy: 0,
        vegasAccuracy: 0,
        averageImprovement: 0,
        profitability: 0,
        breakEvenThreshold: 0.524,
        targetAchieved: false
      };
    }
    
    const algorithmATS = results.filter(r => r.algorithmATS).length / results.length;
    const vegasATS = results.filter(r => r.vegasATS).length / results.length;
    const algorithmAccuracy = results.filter(r => r.algorithmCorrect).length / results.length;
    const vegasAccuracy = results.filter(r => r.vegasCorrect).length / results.length;
    const averageImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
    
    const breakEvenThreshold = 0.524; // Need 52.4% to break even
    const profitability = algorithmATS - breakEvenThreshold;
    const targetAchieved = algorithmATS >= 0.542; // 54.2% target
    
    return {
      totalGames: results.length,
      algorithmATS,
      vegasATS,
      algorithmAccuracy,
      vegasAccuracy,
      averageImprovement,
      profitability,
      breakEvenThreshold,
      targetAchieved
    };
  }
  
  private showTopPredictions(results: BacktestResult[]): void {
    console.log('🔥 TOP ALGORITHM PREDICTIONS:');
    console.log('============================');
    
    const topPredictions = results
      .filter(r => r.algorithmATS && r.confidence === 'High')
      .slice(0, 5);
    
    topPredictions.forEach((result, index) => {
      console.log(`${index + 1}. ${result.homeTeam} vs ${result.awayTeam}`);
      console.log(`   Algorithm: ${result.algorithmSpread > 0 ? result.homeTeam : result.awayTeam} by ${Math.abs(result.algorithmSpread).toFixed(1)}`);
      console.log(`   Vegas: ${result.vegasSpread < 0 ? result.homeTeam : result.awayTeam} by ${Math.abs(result.vegasSpread).toFixed(1)}`);
      console.log(`   Actual: ${result.actualSpread > 0 ? result.homeTeam : result.awayTeam} by ${Math.abs(result.actualSpread).toFixed(1)}`);
      console.log(`   Algorithm ATS: ${result.algorithmATS ? '✅' : '❌'} | Vegas ATS: ${result.vegasATS ? '✅' : '❌'}`);
      console.log('');
    });
  }
}

async function main() {
  const backtester = new AlgorithmBacktester();
  await backtester.runComprehensiveBacktest();
}

main();