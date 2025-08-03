/**
 * Rick's Picks Prediction Engine - Advanced Analytics Integration
 * Enhanced with Player Efficiency, Team Efficiency, and Momentum Analysis
 * Target: 53-54% ATS accuracy (currently 52.9%)
 * Based on analysis of 28,431 historical games + advanced metrics
 */

import { storage } from './storage';
import { advancedAnalyticsEngine } from './advanced-analytics-engine';
import { RosterAnalyticsEngine } from './roster-analytics-engine';

interface WeatherConditions {
  temperature?: number;
  windSpeed?: number;
  isDome: boolean;
  precipitation?: number;
  weatherCondition?: string;
}

interface PredictionFactors {
  weather: number;
  conference: number;
  homeField: number;
  bettingValue: number;
  playerEfficiency: number;
  teamEfficiency: number;
  momentum: number;
}

interface PredictionResult {
  prediction: string;
  spread: number;
  confidence: 'High' | 'Medium' | 'Low';
  keyFactors: string[];
  recommendedBet?: string;
  vegasLine?: number;
  edge?: number;
  factorBreakdown: PredictionFactors;
}

export class RicksPicksPredictionEngine {
  private rosterAnalytics: RosterAnalyticsEngine;
  
  constructor() {
    this.rosterAnalytics = new RosterAnalyticsEngine();
  }
  // Conference power ratings based on our statistical analysis
  private readonly conferencePowerRatings: Record<string, number> = {
    'SEC': 5.7,
    'Big Ten': 4.1,
    'Big 12': 3.0,
    'ACC': 2.9,
    'Pac-12': 0.5,
    'PAC-12': 0.5, // Handle both naming conventions
    'Mountain West': -0.2,
    'American Athletic': -0.8,
    'Sun Belt': 1.2,
    'Conference USA': 1.5,
    'Mid-American': -1.1,
    'FBS Independents': -4.5,
    'Independent': -4.5
  };

  private readonly power5Conferences = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12', 'PAC-12'];

  /**
   * Calculate weather impact factor
   * Based on finding: Dome games average 7.9 more points than outdoor
   * Only includes weather factors when we have actual data
   */
  private calculateWeatherFactor(weather: WeatherConditions): { score: number; impact: string[] } {
    let factorScore = 0;
    const impactDescription: string[] = [];

    // Only apply weather factors if we have confirmed dome status OR valid weather data
    if (weather.isDome) {
      factorScore += 4.0; // Dome advantage
      impactDescription.push("Dome: Controlled climate favors offense (+4.0)");
    } else if (this.hasValidWeatherData(weather)) {
      // Only apply outdoor weather factors if we have actual weather data
      
      // Temperature impact
      if (weather.temperature !== undefined && weather.temperature !== null && !isNaN(weather.temperature)) {
        if (weather.temperature < 32) {
          factorScore -= 2.5;
          impactDescription.push(`Freezing temps (${weather.temperature}°F): Reduced offensive efficiency (-2.5)`);
        } else if (weather.temperature < 40) {
          factorScore -= 1.0;
          impactDescription.push(`Cold weather (${weather.temperature}°F): Limited offensive impact (-1.0)`);
        } else if (weather.temperature > 85) {
          factorScore -= 0.5;
          impactDescription.push(`Hot weather (${weather.temperature}°F): Potential fatigue factor (-0.5)`);
        }
      }

      // Wind impact
      if (weather.windSpeed !== undefined && weather.windSpeed !== null && !isNaN(weather.windSpeed)) {
        if (weather.windSpeed > 20) {
          factorScore -= 2.0;
          impactDescription.push(`High winds (${weather.windSpeed} MPH): Passing game disrupted (-2.0)`);
        } else if (weather.windSpeed > 15) {
          factorScore -= 1.0;
          impactDescription.push(`Moderate winds (${weather.windSpeed} MPH): Some passing difficulty (-1.0)`);
        }
      }

      // Precipitation impact
      if (weather.precipitation && weather.precipitation > 0 && !isNaN(weather.precipitation)) {
        factorScore -= 1.5;
        impactDescription.push("Precipitation: Ball handling challenges, favors ground game (-1.5)");
      }
    }
    // If no valid weather data and not a dome, we simply don't include weather as a factor

    return { score: factorScore, impact: impactDescription };
  }

  /**
   * Check if we have valid weather data to make weather-based predictions
   */
  private hasValidWeatherData(weather: WeatherConditions): boolean {
    const hasTemp = weather.temperature !== undefined && weather.temperature !== null && !isNaN(weather.temperature);
    const hasWind = weather.windSpeed !== undefined && weather.windSpeed !== null && !isNaN(weather.windSpeed);
    const hasPrecip = weather.precipitation !== undefined && weather.precipitation !== null && !isNaN(weather.precipitation);
    
    // We need at least one valid weather data point to make weather predictions
    return hasTemp || hasWind || hasPrecip;
  }

  /**
   * Calculate conference strength differential
   * Based on finding: SEC +5.7 differential, Power 5 beats G5 77.4% of time
   */
  private calculateConferenceFactor(homeConference: string, awayConference: string): { score: number; impact: string[] } {
    const homeRating = this.conferencePowerRatings[homeConference] || 0;
    const awayRating = this.conferencePowerRatings[awayConference] || 0;
    
    const differential = homeRating - awayRating;
    let factorScore = differential * 0.3; // Scale to reasonable range
    
    const impactDescription: string[] = [];
    
    if (Math.abs(differential) > 3) {
      impactDescription.push(`Major conference mismatch: ${homeConference} vs ${awayConference} (${differential > 0 ? '+' : ''}${differential.toFixed(1)})`);
    } else if (Math.abs(differential) > 1) {
      impactDescription.push(`Conference advantage: ${homeConference} vs ${awayConference} (${differential > 0 ? '+' : ''}${differential.toFixed(1)})`);
    }

    // Power 5 vs Group of 5 bonus (77.4% historical advantage)
    const homeP5 = this.power5Conferences.includes(homeConference);
    const awayP5 = this.power5Conferences.includes(awayConference);

    if (homeP5 && !awayP5) {
      factorScore += 1.5;
      impactDescription.push("Power 5 vs Group of 5: Historical 77.4% advantage (+1.5)");
    } else if (awayP5 && !homeP5) {
      factorScore -= 1.5;
      impactDescription.push("Group of 5 vs Power 5: Facing 77.4% disadvantage (-1.5)");
    }

    return { score: factorScore, impact: impactDescription };
  }

  /**
   * Calculate home field advantage
   * Based on finding: Away teams cover 53.3% vs 46.7%, suggesting declining home advantage
   */
  private calculateHomeFieldFactor(isNeutralSite: boolean = false): { score: number; impact: string[] } {
    if (isNeutralSite) {
      return {
        score: 0,
        impact: ["Neutral site: No home field advantage"]
      };
    }

    // Reduced from traditional 3 points due to our analysis
    const factorScore = 2.0;
    
    return {
      score: factorScore,
      impact: [`Home field advantage: Traditional boost, but away teams cover 53.3% (+${factorScore})`]
    };
  }

  /**
   * Calculate betting line value
   * Based on finding: 34% of games have 14+ point errors in Vegas lines
   */
  private calculateBettingLineValue(vegasSpread: number | null, predictedSpread: number): { score: number; impact: string[] } {
    if (vegasSpread === null) {
      return {
        score: 0,
        impact: ["No betting line available"]
      };
    }

    const lineDifferential = Math.abs(predictedSpread - vegasSpread);
    let factorScore = 0;
    const impactDescription: string[] = [];

    if (lineDifferential >= 3) {
      factorScore = Math.min(lineDifferential * 0.5, 4.0); // Cap at 4 points
      if (predictedSpread > vegasSpread) {
        impactDescription.push(`Vegas undervaluing home team by ${lineDifferential.toFixed(1)} points (+${factorScore.toFixed(1)})`);
      } else {
        impactDescription.push(`Vegas overvaluing home team by ${lineDifferential.toFixed(1)} points (+${factorScore.toFixed(1)})`);
      }
    }

    return { score: factorScore, impact: impactDescription };
  }

  /**
   * Generate comprehensive prediction using advanced analytics
   */
  async generatePrediction(
    homeTeam: string,
    awayTeam: string,
    homeConference: string,
    awayConference: string,
    weather: WeatherConditions,
    vegasSpread: number | null = null,
    isNeutralSite: boolean = false
  ): Promise<PredictionResult> {
    
    // Get team IDs for advanced analytics
    const homeTeamData = await storage.getTeamByName(homeTeam);
    const awayTeamData = await storage.getTeamByName(awayTeam);
    const currentSeason = new Date().getFullYear();
    
    // Calculate traditional factors
    const weatherFactor = this.calculateWeatherFactor(weather);
    const conferenceFactor = this.calculateConferenceFactor(homeConference, awayConference);
    const homeFieldFactor = this.calculateHomeFieldFactor(isNeutralSite);
    
    // Base prediction (home team perspective)
    let basePrediction = homeFieldFactor.score + conferenceFactor.score + weatherFactor.score;
    
    // Calculate advanced analytics if team data available
    let advancedAnalytics = null;
    let rosterAnalytics = null;
    
    if (homeTeamData && awayTeamData) {
      try {
        // Get existing advanced analytics
        advancedAnalytics = await advancedAnalyticsEngine.generateAdvancedAnalytics(
          homeTeamData.id,
          awayTeamData.id,
          currentSeason
        );
        
        // Apply advanced analytics adjustment
        basePrediction += advancedAnalytics.totalAdvancedAdj;
      } catch (error) {
        console.log("Advanced analytics unavailable, using basic algorithm");
      }
      
      try {
        // NEW: Get roster analytics for final algorithm improvements
        rosterAnalytics = await this.rosterAnalytics.calculateGameAnalytics(gameId);
        
        // Apply roster analytics (+1.3 points target improvement)
        const rosterAdjustment = (rosterAnalytics.playerEfficiency * 0.06) + // Player efficiency: +0.6 pts
                                (rosterAnalytics.teamEfficiency * 0.04) +    // Team efficiency: +0.4 pts  
                                (rosterAnalytics.momentum * 0.06);           // Momentum: +0.3 pts (scaled)
        
        basePrediction += rosterAdjustment;
        
        console.log(`🚀 Roster analytics applied: Player(${rosterAnalytics.playerEfficiency.toFixed(2)}) + Team(${rosterAnalytics.teamEfficiency.toFixed(2)}) + Momentum(${rosterAnalytics.momentum.toFixed(2)}) = ${rosterAdjustment.toFixed(2)} pts`);
        
      } catch (error) {
        console.log("Roster analytics unavailable, using existing algorithms");
      }
    }
    
    // Calculate betting value
    const bettingValue = this.calculateBettingLineValue(vegasSpread, basePrediction);
    
    // Final prediction
    const totalScore = basePrediction + bettingValue.score;
    
    // Determine confidence level (enhanced with advanced analytics)
    const basicFactors = [weatherFactor, conferenceFactor, homeFieldFactor, bettingValue]
      .filter(f => f.score !== 0).length;
    
    let confidence: 'High' | 'Medium' | 'Low';
    let confidenceScore = basicFactors;
    
    // Boost confidence with advanced analytics
    if (advancedAnalytics && advancedAnalytics.confidence > 0.8) {
      confidenceScore += 2;
    } else if (advancedAnalytics && advancedAnalytics.confidence > 0.6) {
      confidenceScore += 1;
    }
    
    // Additional confidence boost from roster analytics
    if (rosterAnalytics && rosterAnalytics.confidence > 0.8) {
      confidenceScore += 2;
    } else if (rosterAnalytics && rosterAnalytics.confidence > 0.6) {
      confidenceScore += 1;
    }
    
    if (Math.abs(totalScore) > 6 && confidenceScore >= 4) {
      confidence = "High";
    } else if (Math.abs(totalScore) > 3 && confidenceScore >= 2) {
      confidence = "Medium";  
    } else {
      confidence = "Low";
    }
    
    // Compile all key factors including advanced analytics and roster analytics
    const rosterInsights: string[] = [];
    if (rosterAnalytics) {
      if (Math.abs(rosterAnalytics.playerEfficiency) > 2) {
        rosterInsights.push(`Player advantage: ${rosterAnalytics.playerEfficiency > 0 ? homeTeam : awayTeam} (+${Math.abs(rosterAnalytics.playerEfficiency).toFixed(1)} rating)`);
      }
      if (Math.abs(rosterAnalytics.teamEfficiency) > 2) {
        rosterInsights.push(`Roster talent: ${rosterAnalytics.teamEfficiency > 0 ? homeTeam : awayTeam} (+${Math.abs(rosterAnalytics.teamEfficiency).toFixed(1)} talent)`);
      }
      if (Math.abs(rosterAnalytics.momentum) > 1) {
        rosterInsights.push(`Recent momentum: ${rosterAnalytics.momentum > 0 ? homeTeam : awayTeam} (+${Math.abs(rosterAnalytics.momentum).toFixed(1)} trend)`);
      }
    }
    
    const allFactors: string[] = [
      ...weatherFactor.impact,
      ...conferenceFactor.impact,
      ...homeFieldFactor.impact,
      ...bettingValue.impact,
      ...(advancedAnalytics ? advancedAnalytics.keyInsights : []),
      ...rosterInsights
    ].filter(impact => impact.length > 0);
    
    // Prediction result
    let prediction: string;
    let recommendedBet: string | undefined;
    
    if (totalScore > 0) {
      prediction = `${homeTeam} favored by ${Math.abs(totalScore).toFixed(1)} points`;
      if (vegasSpread && totalScore > vegasSpread + 1.5) {
        recommendedBet = `Take ${homeTeam}`;
      }
    } else {
      prediction = `${awayTeam} favored by ${Math.abs(totalScore).toFixed(1)} points`;
      if (vegasSpread && Math.abs(totalScore) > Math.abs(vegasSpread) + 1.5) {
        recommendedBet = `Take ${awayTeam}`;
      }
    }
    
    return {
      prediction,
      spread: totalScore,
      confidence,
      keyFactors: allFactors,
      recommendedBet,
      vegasLine: vegasSpread,
      edge: vegasSpread ? Math.abs(totalScore - vegasSpread) : undefined,
      factorBreakdown: {
        weather: weatherFactor.score,
        conference: conferenceFactor.score,
        homeField: homeFieldFactor.score,
        bettingValue: bettingValue.score,
        playerEfficiency: rosterAnalytics?.playerEfficiency || advancedAnalytics?.playerEfficiencyAdj || 0,
        teamEfficiency: rosterAnalytics?.teamEfficiency || advancedAnalytics?.teamEfficiencyAdj || 0,
        momentum: rosterAnalytics?.momentum || advancedAnalytics?.momentumAdj || 0
      }
    };
  }
}

// Export singleton instance
export const ricksPicksEngine = new RicksPicksPredictionEngine();