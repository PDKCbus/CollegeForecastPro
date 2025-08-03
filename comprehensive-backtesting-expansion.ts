#!/usr/bin/env tsx

/**
 * Comprehensive Backtesting Expansion
 * Expand backtesting from 300 games (2022-2023) to full historical dataset (2009-2024)
 * Test algorithm performance across multiple seasons and economic conditions
 */

import { db } from './server/db';
import { games, teams, algorithmicPredictions } from './shared/schema';
import { eq, and, gte, lte, isNotNull, sql, ne } from 'drizzle-orm';

interface BacktestResult {
  season: number;
  totalGames: number;
  algorithmWins: number;
  algorithmLosses: number;
  atsPercentage: number;
  averageError: number;
  vegasBeats: number;
  vegasAverageError: number;
  confidence: number;
  seasonContext: string;
}

interface ComprehensiveBacktestSummary {
  totalGames: number;
  overallAtsPercentage: number;
  seasonResults: BacktestResult[];
  bestSeason: BacktestResult;
  worstSeason: BacktestResult;
  trendAnalysis: {
    improvingYears: number[];
    decliningYears: number[];
    averageByDecade: Record<string, number>;
  };
  performanceByEra: {
    prePlayoff: BacktestResult[];  // 2009-2013
    playoffEra: BacktestResult[];  // 2014-2024
  };
}

class ComprehensiveBacktester {
  
  async getSeasonGames(season: number): Promise<any[]> {
    console.log(`📊 Collecting ${season} season games for backtesting...`);
    
    const seasonGames = await db
      .select({
        id: games.id,
        season: games.season,
        week: games.week,
        homeTeamId: games.homeTeamId,
        awayTeamId: games.awayTeamId,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        spread: games.spread,
        overUnder: games.overUnder,
        startDate: games.startDate,
        completed: games.completed,
        weather: games.weatherCondition,
        temperature: games.temperature,
        venue: games.venue,
        isDome: games.isDome
      })
      .from(games)
      .where(
        and(
          eq(games.season, season),
          isNotNull(games.homeScore),
          isNotNull(games.awayScore),
          isNotNull(games.spread),
          eq(games.completed, true)
        )
      )
      .orderBy(games.week, games.startDate);

    console.log(`✅ Found ${seasonGames.length} completed games with betting data for ${season}`);
    return seasonGames;
  }

  async backtestSeason(season: number): Promise<BacktestResult> {
    console.log(`\n🎯 Backtesting ${season} season...`);
    
    const seasonGames = await this.getSeasonGames(season);
    
    if (seasonGames.length === 0) {
      console.log(`⚠️  No valid games found for ${season}`);
      return {
        season,
        totalGames: 0,
        algorithmWins: 0,
        algorithmLosses: 0,
        atsPercentage: 0,
        averageError: 0,
        vegasBeats: 0,
        vegasAverageError: 0,
        confidence: 0,
        seasonContext: this.getSeasonContext(season)
      };
    }

    let algorithmWins = 0;
    let algorithmLosses = 0;
    let totalError = 0;
    let vegasBeats = 0;
    let vegasTotalError = 0;

    // Simulate our algorithm's performance for each game
    for (const game of seasonGames) {
      const actualMargin = (game.homeScore || 0) - (game.awayScore || 0);
      const vegasSpread = game.spread || 0;
      
      // Simulate our algorithm prediction (using simplified current logic)
      const algorithmSpread = this.simulateAlgorithmPrediction(game);
      
      // Check ATS performance
      const vegasCover = actualMargin > vegasSpread;
      const algorithmCover = actualMargin > algorithmSpread;
      
      if (algorithmCover) {
        algorithmWins++;
      } else {
        algorithmLosses++;
      }
      
      // Calculate prediction accuracy
      const algorithmError = Math.abs(actualMargin - algorithmSpread);
      const vegasError = Math.abs(actualMargin - vegasSpread);
      
      totalError += algorithmError;
      vegasTotalError += vegasError;
      
      if (algorithmError < vegasError) {
        vegasBeats++;
      }
    }

    const atsPercentage = seasonGames.length > 0 ? (algorithmWins / seasonGames.length) * 100 : 0;
    const averageError = seasonGames.length > 0 ? totalError / seasonGames.length : 0;
    const vegasAverageError = seasonGames.length > 0 ? vegasTotalError / seasonGames.length : 0;
    const confidence = seasonGames.length > 100 ? 'high' : seasonGames.length > 50 ? 'medium' : 'low';

    const result: BacktestResult = {
      season,
      totalGames: seasonGames.length,
      algorithmWins,
      algorithmLosses,
      atsPercentage: Math.round(atsPercentage * 10) / 10,
      averageError: Math.round(averageError * 10) / 10,
      vegasBeats,
      vegasAverageError: Math.round(vegasAverageError * 10) / 10,
      confidence: seasonGames.length,
      seasonContext: this.getSeasonContext(season)
    };

    console.log(`📈 ${season} Results: ${atsPercentage.toFixed(1)}% ATS (${algorithmWins}-${algorithmLosses}) over ${seasonGames.length} games`);
    return result;
  }

  private simulateAlgorithmPrediction(game: any): number {
    // Simplified version of our current algorithm for backtesting
    let prediction = game.spread || 0; // Start with Vegas line
    
    // Weather adjustments
    if (game.isDome) {
      prediction += 2.5; // Dome advantage
    }
    
    if (game.temperature && game.temperature < 32) {
      prediction -= 1.5; // Cold weather favors defense
    }
    
    if (game.weather && game.weather.toLowerCase().includes('rain')) {
      prediction -= 2; // Rain favors underdogs
    }
    
    // Conference strength (simplified)
    // Would need actual team data to be more accurate
    
    // Home field advantage already in spread, but add slight adjustment
    prediction += 0.5;
    
    return prediction;
  }

  private getSeasonContext(season: number): string {
    const contexts: Record<number, string> = {
      2009: "First year of BCS National Championship game format",
      2010: "Auburn's undefeated national championship season",
      2011: "LSU-Alabama dominated regular season",
      2012: "Johnny Manziel's Heisman Trophy season",
      2013: "Final year before College Football Playoff",
      2014: "First College Football Playoff season",
      2015: "Alabama's dominant championship run",
      2016: "Clemson defeats Alabama in championship",
      2017: "UCF's undefeated season controversy",
      2018: "Clemson dominates Alabama 44-16 in championship",
      2019: "LSU's historic undefeated season",
      2020: "COVID-19 affected season with limited attendance",
      2021: "Georgia's first championship since 1980",
      2022: "Georgia repeats, Michigan ends drought",
      2023: "Michigan completes perfect season",
      2024: "Current season in progress"
    };
    return contexts[season] || "College football season";
  }

  async runComprehensiveBacktest(): Promise<ComprehensiveBacktestSummary> {
    console.log("🚀 Starting Comprehensive Historical Backtesting (2009-2024)");
    console.log("=" * 80);
    
    const startTime = Date.now();
    const seasonResults: BacktestResult[] = [];
    
    // Test each season from 2009 to 2024
    for (let season = 2009; season <= 2024; season++) {
      const result = await this.backtestSeason(season);
      seasonResults.push(result);
    }
    
    // Calculate overall statistics
    const totalGames = seasonResults.reduce((sum, r) => sum + r.totalGames, 0);
    const totalWins = seasonResults.reduce((sum, r) => sum + r.algorithmWins, 0);
    const overallAtsPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    
    // Find best and worst seasons
    const validSeasons = seasonResults.filter(r => r.totalGames > 0);
    const bestSeason = validSeasons.reduce((best, current) => 
      current.atsPercentage > best.atsPercentage ? current : best
    );
    const worstSeason = validSeasons.reduce((worst, current) => 
      current.atsPercentage < worst.atsPercentage ? current : worst
    );
    
    // Analyze trends
    const trendAnalysis = this.analyzeTrends(validSeasons);
    
    // Separate by era
    const prePlayoff = validSeasons.filter(r => r.season <= 2013);
    const playoffEra = validSeasons.filter(r => r.season >= 2014);
    
    const summary: ComprehensiveBacktestSummary = {
      totalGames,
      overallAtsPercentage: Math.round(overallAtsPercentage * 10) / 10,
      seasonResults: validSeasons,
      bestSeason,
      worstSeason,
      trendAnalysis,
      performanceByEra: {
        prePlayoff,
        playoffEra
      }
    };
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n✅ Comprehensive backtesting completed in ${duration.toFixed(1)} seconds`);
    this.displaySummary(summary);
    
    return summary;
  }

  private analyzeTrends(seasonResults: BacktestResult[]): any {
    const improvingYears: number[] = [];
    const decliningYears: number[] = [];
    
    for (let i = 1; i < seasonResults.length; i++) {
      const current = seasonResults[i];
      const previous = seasonResults[i - 1];
      
      if (current.atsPercentage > previous.atsPercentage) {
        improvingYears.push(current.season);
      } else if (current.atsPercentage < previous.atsPercentage) {
        decliningYears.push(current.season);
      }
    }
    
    const averageByDecade = {
      '2009-2013': this.calculateAverage(seasonResults.filter(r => r.season <= 2013)),
      '2014-2019': this.calculateAverage(seasonResults.filter(r => r.season >= 2014 && r.season <= 2019)),
      '2020-2024': this.calculateAverage(seasonResults.filter(r => r.season >= 2020))
    };
    
    return {
      improvingYears,
      decliningYears,
      averageByDecade
    };
  }

  private calculateAverage(seasons: BacktestResult[]): number {
    if (seasons.length === 0) return 0;
    const sum = seasons.reduce((total, season) => total + season.atsPercentage, 0);
    return Math.round((sum / seasons.length) * 10) / 10;
  }

  private displaySummary(summary: ComprehensiveBacktestSummary): void {
    console.log("\n📊 COMPREHENSIVE BACKTESTING RESULTS");
    console.log("=" * 60);
    console.log(`Total Games Analyzed: ${summary.totalGames.toLocaleString()}`);
    console.log(`Overall ATS Performance: ${summary.overallAtsPercentage}%`);
    console.log(`Break-even Target: 52.4%`);
    console.log(`Performance vs Target: ${(summary.overallAtsPercentage - 52.4).toFixed(1)}%`);
    
    console.log(`\n🏆 Best Season: ${summary.bestSeason.season} (${summary.bestSeason.atsPercentage}%)`);
    console.log(`📉 Worst Season: ${summary.worstSeason.season} (${summary.worstSeason.atsPercentage}%)`);
    
    console.log(`\n📈 ERA COMPARISON:`);
    const prePlayoffAvg = this.calculateAverage(summary.performanceByEra.prePlayoff);
    const playoffAvg = this.calculateAverage(summary.performanceByEra.playoffEra);
    console.log(`Pre-Playoff Era (2009-2013): ${prePlayoffAvg}%`);
    console.log(`Playoff Era (2014-2024): ${playoffAvg}%`);
    
    console.log(`\n📊 DECADE AVERAGES:`);
    Object.entries(summary.trendAnalysis.averageByDecade).forEach(([period, avg]) => {
      console.log(`${period}: ${avg}%`);
    });
  }
}

async function main() {
  console.log("Starting comprehensive backtesting expansion...");
  
  const backtester = new ComprehensiveBacktester();
  const results = await backtester.runComprehensiveBacktest();
  
  // Save detailed results to file
  const fs = await import('fs');
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `comprehensive_backtest_results_${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${filename}`);
}

// Run if this is the main module
main().catch(console.error);

export { ComprehensiveBacktester, type ComprehensiveBacktestSummary };