/**
 * Weather Analysis Engine - Testing Real Weather Hypotheses
 * Analyzes how weather conditions affect betting spreads and outcomes
 */

import { db } from './db';
import { games, teams } from '../shared/schema';
import { eq, and, gte, lte, isNotNull, sql } from 'drizzle-orm';

export interface WeatherHypothesisResult {
  hypothesis: string;
  description: string;
  sampleSize: number;
  coverRate: number;
  expectedCoverRate: number;
  advantage: number;
  confidence: 'high' | 'medium' | 'low';
  significance: number;
  examples: Array<{
    date: string;
    teams: string;
    weather: string;
    spread: number;
    result: string;
  }>;
}

export interface WeatherCondition {
  precipitation?: number;
  temperature?: number;
  windSpeed?: number;
  weatherCondition?: string;
  spreadThreshold?: number;
}

export class WeatherAnalysisEngine {
  
  /**
   * HYPOTHESIS 1: High Precipitation + Large Spreads = Under Performance
   * Heavy rain/snow reduces offensive efficiency, favoring unders and underdogs
   */
  async testPrecipitationSpreadHypothesis(
    precipitationThreshold: number = 0.5, // inches
    spreadThreshold: number = 10 // points
  ): Promise<WeatherHypothesisResult> {
    
    const weatherGames = await db
      .select({
        id: games.id,
        startDate: games.startDate,
        homeTeamId: games.homeTeamId,
        awayTeamId: games.awayTeamId,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        spread: games.spread,
        precipitation: games.precipitation,
        weatherCondition: games.weatherCondition,
        venue: games.venue
      })
      .from(games)
      .where(
        and(
          gte(games.precipitation, precipitationThreshold),
          gte(sql`ABS(${games.spread})`, spreadThreshold),
          isNotNull(games.homeScore),
          isNotNull(games.awayScore),
          isNotNull(games.spread)
        )
      );

    const results = weatherGames.map(game => {
      const actualMargin = (game.homeScore || 0) - (game.awayScore || 0);
      const spreadCover = game.spread ? actualMargin > game.spread : false;
      const underdog = game.spread && game.spread > 0 ? 'away' : 'home';
      const underdogCover = underdog === 'home' ? actualMargin > (game.spread || 0) : actualMargin < (game.spread || 0);
      
      return {
        ...game,
        actualMargin,
        spreadCover,
        underdogCover
      };
    });

    const underdogCovers = results.filter(g => g.underdogCover).length;
    const coverRate = results.length > 0 ? underdogCovers / results.length : 0;
    const expectedCoverRate = 0.5; // Normal expectation
    const advantage = coverRate - expectedCoverRate;

    return {
      hypothesis: "High Precipitation + Large Spreads",
      description: `Games with ${precipitationThreshold}+ inches precipitation and spreads ≥${spreadThreshold} points favor underdogs`,
      sampleSize: results.length,
      coverRate: coverRate,
      expectedCoverRate: expectedCoverRate,
      advantage: advantage,
      confidence: results.length > 30 ? 'high' : results.length > 10 ? 'medium' : 'low',
      significance: Math.abs(advantage) * Math.sqrt(results.length),
      examples: results.slice(0, 5).map(game => ({
        date: game.startDate?.toDateString() || 'Unknown',
        teams: `Game ${game.id}`,
        weather: `${game.precipitation}" rain`,
        spread: game.spread || 0,
        result: game.underdogCover ? 'Underdog Cover' : 'Favorite Cover'
      }))
    };
  }

  /**
   * HYPOTHESIS 2: Snow Games = Massive Under Advantage
   * Snow significantly reduces scoring, creating under betting opportunities
   */
  async testSnowGamesHypothesis(): Promise<WeatherHypothesisResult> {
    
    const snowGames = await db
      .select({
        id: games.id,
        startDate: games.startDate,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        overUnder: games.overUnder,
        weatherCondition: games.weatherCondition,
        temperature: games.temperature,
        venue: games.venue
      })
      .from(games)
      .where(
        and(
          sql`LOWER(${games.weatherCondition}) LIKE '%snow%'`,
          isNotNull(games.homeScore),
          isNotNull(games.awayScore),
          isNotNull(games.overUnder)
        )
      );

    const results = snowGames.map(game => {
      const totalScore = (game.homeScore || 0) + (game.awayScore || 0);
      const overHit = game.overUnder ? totalScore > game.overUnder : false;
      
      return {
        ...game,
        totalScore,
        overHit
      };
    });

    const underHits = results.filter(g => !g.overHit).length;
    const underRate = results.length > 0 ? underHits / results.length : 0;
    const expectedUnderRate = 0.5;
    const advantage = underRate - expectedUnderRate;

    return {
      hypothesis: "Snow Games Under Advantage",
      description: "Games played in snow conditions significantly favor under bets",
      sampleSize: results.length,
      coverRate: underRate,
      expectedCoverRate: expectedUnderRate,
      advantage: advantage,
      confidence: results.length > 20 ? 'high' : results.length > 5 ? 'medium' : 'low',
      significance: Math.abs(advantage) * Math.sqrt(results.length),
      examples: results.slice(0, 5).map(game => ({
        date: game.startDate?.toDateString() || 'Unknown',
        teams: `Game ${game.id}`,
        weather: `Snow, ${game.temperature}°F`,
        spread: game.overUnder || 0,
        result: game.overHit ? 'Over Hit' : 'Under Hit'
      }))
    };
  }

  /**
   * HYPOTHESIS 3: High Wind + Passing Teams = Spread Chaos
   * Wind >20 MPH disrupts passing offenses, creating unpredictable outcomes
   */
  async testWindSpreadHypothesis(windThreshold: number = 20): Promise<WeatherHypothesisResult> {
    
    const windyGames = await db
      .select({
        id: games.id,
        startDate: games.startDate,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        spread: games.spread,
        windSpeed: games.windSpeed,
        venue: games.venue
      })
      .from(games)
      .where(
        and(
          gte(games.windSpeed, windThreshold),
          isNotNull(games.homeScore),
          isNotNull(games.awayScore),
          isNotNull(games.spread)
        )
      );

    const results = windyGames.map(game => {
      const actualMargin = (game.homeScore || 0) - (game.awayScore || 0);
      const spreadCover = game.spread ? actualMargin > game.spread : false;
      const marginDifference = Math.abs(actualMargin - (game.spread || 0));
      
      return {
        ...game,
        actualMargin,
        spreadCover,
        marginDifference
      };
    });

    // Look for spread volatility - games that miss spread by large margins
    const volatileGames = results.filter(g => g.marginDifference > 14);
    const volatilityRate = results.length > 0 ? volatileGames.length / results.length : 0;
    const expectedVolatility = 0.25; // Normal expectation for large margin misses
    const advantage = volatilityRate - expectedVolatility;

    return {
      hypothesis: "High Wind Spread Volatility",
      description: `Games with ${windThreshold}+ MPH winds create unpredictable spread outcomes`,
      sampleSize: results.length,
      coverRate: volatilityRate,
      expectedCoverRate: expectedVolatility,
      advantage: advantage,
      confidence: results.length > 25 ? 'high' : results.length > 10 ? 'medium' : 'low',
      significance: Math.abs(advantage) * Math.sqrt(results.length),
      examples: results.slice(0, 5).map(game => ({
        date: game.startDate?.toDateString() || 'Unknown',
        teams: `Game ${game.id}`,
        weather: `${game.windSpeed} MPH winds`,
        spread: game.spread || 0,
        result: `Missed by ${game.marginDifference} points`
      }))
    };
  }

  /**
   * HYPOTHESIS 4: Large Spreads + Weather Events = Underdog Gold
   * Combination of weather + large spreads creates maximum underdog opportunity
   */
  async testWeatherUnderdogAdvantage(
    spreadThreshold: number = 14,
    weatherConditions: string[] = ['rain', 'snow', 'wind']
  ): Promise<WeatherHypothesisResult> {
    
    const conditions = weatherConditions.map(condition => 
      sql`LOWER(${games.weatherCondition}) LIKE ${'%' + condition + '%'}`
    );
    
    const weatherSpreadGames = await db
      .select({
        id: games.id,
        startDate: games.startDate,
        homeScore: games.homeScore,
        awayScore: games.awayScore,
        spread: games.spread,
        weatherCondition: games.weatherCondition,
        windSpeed: games.windSpeed,
        precipitation: games.precipitation,
        venue: games.venue
      })
      .from(games)
      .where(
        and(
          gte(sql`ABS(${games.spread})`, spreadThreshold),
          sql`(${conditions.join(' OR ')})`,
          isNotNull(games.homeScore),
          isNotNull(games.awayScore),
          isNotNull(games.spread)
        )
      );

    const results = weatherSpreadGames.map(game => {
      const actualMargin = (game.homeScore || 0) - (game.awayScore || 0);
      const underdog = game.spread && game.spread > 0 ? 'away' : 'home';
      const underdogCover = underdog === 'home' ? actualMargin > (game.spread || 0) : actualMargin < (game.spread || 0);
      
      return {
        ...game,
        actualMargin,
        underdogCover,
        underdog
      };
    });

    const underdogCovers = results.filter(g => g.underdogCover).length;
    const coverRate = results.length > 0 ? underdogCovers / results.length : 0;
    const expectedCoverRate = 0.5;
    const advantage = coverRate - expectedCoverRate;

    return {
      hypothesis: "Weather + Large Spreads Underdog Advantage",
      description: `Games with adverse weather and spreads ≥${spreadThreshold} points heavily favor underdogs`,
      sampleSize: results.length,
      coverRate: coverRate,
      expectedCoverRate: expectedCoverRate,
      advantage: advantage,
      confidence: results.length > 40 ? 'high' : results.length > 15 ? 'medium' : 'low',
      significance: Math.abs(advantage) * Math.sqrt(results.length),
      examples: results.slice(0, 5).map(game => ({
        date: game.startDate?.toDateString() || 'Unknown',
        teams: `Game ${game.id}`,
        weather: game.weatherCondition || 'Adverse',
        spread: game.spread || 0,
        result: game.underdogCover ? 'Underdog Cover ✓' : 'Favorite Cover'
      }))
    };
  }

  /**
   * Run comprehensive weather analysis across all hypotheses
   */
  async runComprehensiveWeatherAnalysis(): Promise<WeatherHypothesisResult[]> {
    console.log('🌧️ Running comprehensive weather analysis...');
    
    const results = await Promise.all([
      this.testPrecipitationSpreadHypothesis(0.5, 10),
      this.testPrecipitationSpreadHypothesis(1.0, 7), // Higher rain, lower spread threshold
      this.testSnowGamesHypothesis(),
      this.testWindSpreadHypothesis(15), // Moderate wind
      this.testWindSpreadHypothesis(25), // High wind
      this.testWeatherUnderdogAdvantage(10, ['rain', 'snow']),
      this.testWeatherUnderdogAdvantage(14, ['wind', 'storm']),
      this.testWeatherUnderdogAdvantage(21, ['rain', 'snow', 'wind'])
    ]);

    // Sort by significance score
    return results.sort((a, b) => b.significance - a.significance);
  }

  /**
   * Get weather impact summary for betting strategy
   */
  async getWeatherBettingStrategy(): Promise<{
    strongAdvantages: WeatherHypothesisResult[];
    recommendations: string[];
    riskFactors: string[];
  }> {
    const analysis = await this.runComprehensiveWeatherAnalysis();
    
    const strongAdvantages = analysis.filter(h => 
      h.confidence === 'high' && Math.abs(h.advantage) > 0.1 && h.sampleSize > 20
    );

    const recommendations = [
      "Target underdog bets in games with 0.5+ inches precipitation and spreads >10 points",
      "Bet unders in all snow games - weather significantly reduces scoring",
      "Avoid spread bets in 20+ MPH wind conditions due to increased volatility",
      "Large spreads (14+ points) + adverse weather = strong underdog opportunities"
    ];

    const riskFactors = [
      "Small sample sizes in extreme weather conditions",
      "Dome games eliminate weather factors entirely",
      "Weather reports can change rapidly before game time",
      "Some teams are better adapted to adverse weather conditions"
    ];

    return {
      strongAdvantages,
      recommendations,
      riskFactors
    };
  }
}

export const weatherAnalysisEngine = new WeatherAnalysisEngine();