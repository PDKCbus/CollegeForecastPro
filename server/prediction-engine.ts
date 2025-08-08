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
  largeFavoriteRisk: number;
  seasonalPattern: number;
  weatherInteraction: number;
  injuryImpact: number;
  rivalryGame: number;
  recruitingEdge: number;
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
   * Large Favorite Risk Factor - Based on Historical Analysis
   * Data from 9,771 games (2009-2024):
   * - Double digit home favorites: 45.61% cover rate
   * - Double digit away favorites: 49.63% cover rate
   * - Three score favorites (>14pt): 46.13% cover rate
   */
  private calculateLargeFavoriteRisk(
    predictedSpread: number,
    vegasSpread: number | null,
    isHomeTeam: boolean
  ): { score: number; impact: string[] } {
    if (!vegasSpread) {
      return { score: 0, impact: [] };
    }

    const absVegasSpread = Math.abs(vegasSpread);
    let factorScore = 0;
    const impactDescription: string[] = [];

    // Three score favorites (>14 points) - 46.13% cover rate
    if (absVegasSpread > 14) {
      factorScore -= 2.0; // Significant penalty for large favorites
      impactDescription.push(`Three score favorite (${absVegasSpread}pt): Historical 46.1% cover rate (-2.0)`);
    }
    // Double digit favorites - Home: 45.61%, Away: 49.63%
    else if (absVegasSpread >= 10) {
      if (vegasSpread < 0) { // Home team favored
        factorScore -= 1.5;
        impactDescription.push(`Double digit home favorite (${absVegasSpread}pt): Historical 45.6% cover rate (-1.5)`);
      } else { // Away team favored
        factorScore -= 1.0;
        impactDescription.push(`Double digit away favorite (${absVegasSpread}pt): Historical 49.6% cover rate (-1.0)`);
      }
    }
    // Moderate favorites (7-9.5 points) - slight penalty
    else if (absVegasSpread >= 7) {
      factorScore -= 0.5;
      impactDescription.push(`Large favorite (${absVegasSpread}pt): Favorites tend to underperform (-0.5)`);
    }

    return { score: factorScore, impact: impactDescription };
  }

  /**
   * Seasonal Pattern Factor - Based on Week Analysis
   * Early season weeks (1-10): 43-48% favorite covering
   * Late season weeks (11-12): 50-51% favorite covering
   * Vegas has less data early in season
   */
  private calculateSeasonalPattern(week: number | null): { score: number; impact: string[] } {
    if (!week || week < 1 || week > 17) {
      return { score: 0, impact: [] };
    }

    let factorScore = 0;
    const impactDescription: string[] = [];

    // Early season (weeks 1-4) - Vegas has least data
    if (week <= 4) {
      factorScore += 1.0; // Fade favorites more aggressively
      impactDescription.push(`Early season (Week ${week}): Vegas less accurate, favorites cover only 44-46% (+1.0)`);
    }
    // Mid-early season (weeks 5-10)
    else if (week <= 10) {
      factorScore += 0.5;
      impactDescription.push(`Mid-season (Week ${week}): Continued favorite underperformance 45-47% (+0.5)`);
    }
    // Late season (weeks 11-12) - Favorites perform better
    else if (week >= 11 && week <= 12) {
      factorScore -= 0.5; // Slight boost to favorites
      impactDescription.push(`Late season (Week ${week}): Favorites improve to 50-51% cover rate (-0.5)`);
    }
    // Bowl/Playoff season - Return to neutral
    else if (week >= 13) {
      factorScore += 0.0;
      impactDescription.push(`Bowl/Playoff season (Week ${week}): Mixed patterns, neutral adjustment`);
    }

    return { score: factorScore, impact: impactDescription };
  }

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
   * Weather Interaction Effects - NEW IMPLEMENTATION
   * Based on analysis of 9,330 games with weather data:
   * - Freezing (<32°F) + Large Favorites: 58.57% cover (boost)
   * - Cold (32-49°F) + Large Favorites: 48.20% cover (penalty)
   * - Hot (>80°F) + Large Favorites: 53.87% cover (slight boost)
   * - Freezing + Small Favorites: 66.67% cover (strong boost)
   */
  private calculateWeatherInteractionEffects(
    weather: WeatherConditions,
    vegasSpread: number | null
  ): { score: number; impact: string[] } {
    if (!vegasSpread || weather.isDome) {
      return { score: 0, impact: [] };
    }

    const absSpread = Math.abs(vegasSpread);
    const isLargeFavorite = absSpread >= 10;
    const isSmallFavorite = absSpread < 7;

    let factorScore = 0;
    const impactDescription: string[] = [];

    if (weather.temperature !== undefined && weather.temperature !== null && !isNaN(weather.temperature)) {
      // Freezing weather interactions
      if (weather.temperature < 32) {
        if (isSmallFavorite) {
          factorScore += 1.5; // Freezing small favorites: 66.67% cover
          impactDescription.push(`Freezing + Small Favorite: Historical 66.7% cover rate (+1.5)`);
        } else if (isLargeFavorite) {
          factorScore += 0.8; // Freezing large favorites: 58.57% vs 51.91% moderate
          impactDescription.push(`Freezing + Large Favorite: Historical 58.6% vs 51.9% moderate (+0.8)`);
        }
      }
      // Cold weather interactions
      else if (weather.temperature >= 32 && weather.temperature < 50) {
        if (isLargeFavorite) {
          factorScore -= 1.2; // Cold large favorites: 48.20% cover
          impactDescription.push(`Cold + Large Favorite: Historical 48.2% vs 51.9% moderate (-1.2)`);
        }
      }
      // Hot weather interactions
      else if (weather.temperature > 80) {
        if (isLargeFavorite) {
          factorScore += 0.5; // Hot large favorites: 53.87% vs 51.91% moderate
          impactDescription.push(`Hot + Large Favorite: Historical 53.9% vs 51.9% moderate (+0.5)`);
        }
      }
    }

    return { score: factorScore, impact: impactDescription };
  }

  /**
   * Injury Impact Analysis - FRAMEWORK READY
   * Limited data available, but framework for when injury data is populated
   */
  private calculateInjuryImpact(
    homeTeamId?: number,
    awayTeamId?: number,
    vegasSpread: number | null = null
  ): { score: number; impact: string[] } {
    // Placeholder for when injury data becomes available
    // Would analyze: key player injuries, position impact, depth chart effects
    return { score: 0, impact: [] };
  }

  /**
   * Rivalry Game Analysis - FRAMEWORK READY
   * Limited data available, but framework for when rivalry flags are populated
   */
  private calculateRivalryGameImpact(isRivalryGame?: boolean): { score: number; impact: string[] } {
    // Placeholder for when rivalry data becomes available
    // Would analyze: historical rivalry ATS performance, emotional factors
    return { score: 0, impact: [] };
  }

  /**
   * Recruiting Rankings Correlation - FRAMEWORK READY
   * Limited data available, but framework for when recruiting data is populated
   */
  private calculateRecruitingEdge(
    homeTeamId?: number,
    awayTeamId?: number
  ): { score: number; impact: string[] } {
    // Placeholder for when recruiting rankings become available
    // Would analyze: recruiting class rankings, talent differential impact on ATS
    return { score: 0, impact: [] };
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
   * Generate comprehensive prediction using advanced analytics + betting patterns
   */
  async generatePrediction(
    homeTeam: string,
    awayTeam: string,
    homeConference: string,
    awayConference: string,
    weather: WeatherConditions,
    vegasSpread: number | null = null,
    isNeutralSite: boolean = false,
    week: number | null = null
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

    // Calculate NEW betting pattern factors
    const largeFavoriteRisk = this.calculateLargeFavoriteRisk(basePrediction, vegasSpread, true);
    const seasonalPattern = this.calculateSeasonalPattern(week);
    const weatherInteraction = this.calculateWeatherInteractionEffects(weather, vegasSpread);
    const injuryImpact = this.calculateInjuryImpact(homeTeamData?.id, awayTeamData?.id, vegasSpread);
    const rivalryGame = this.calculateRivalryGameImpact();
    const recruitingEdge = this.calculateRecruitingEdge(homeTeamData?.id, awayTeamData?.id);

    // Apply betting pattern adjustments to base prediction
    basePrediction += largeFavoriteRisk.score + seasonalPattern.score + weatherInteraction.score
                   + injuryImpact.score + rivalryGame.score + recruitingEdge.score;

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

      // Note: Roster analytics require gameId which is not available in this context
      // Will be applied at the route level where gameId is available
      console.log("Roster analytics unavailable, using existing algorithms");
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
    if (advancedAnalytics && typeof advancedAnalytics === 'object' && 'confidence' in advancedAnalytics) {
      if (advancedAnalytics.confidence > 0.8) {
        confidenceScore += 2;
      } else if (advancedAnalytics.confidence > 0.6) {
        confidenceScore += 1;
      }
    }

    if (Math.abs(totalScore) > 6 && confidenceScore >= 4) {
      confidence = "High";
    } else if (Math.abs(totalScore) > 3 && confidenceScore >= 2) {
      confidence = "Medium";
    } else {
      confidence = "Low";
    }

    // Compile all key factors including NEW betting patterns
    const allFactors: string[] = [
      ...weatherFactor.impact,
      ...conferenceFactor.impact,
      ...homeFieldFactor.impact,
      ...bettingValue.impact,
      ...largeFavoriteRisk.impact,   // NEW: Large favorite risk analysis
      ...seasonalPattern.impact,     // NEW: Seasonal betting patterns
      ...weatherInteraction.impact,  // NEW: Weather interaction effects
      ...injuryImpact.impact,        // NEW: Injury correlation (framework)
      ...rivalryGame.impact,         // NEW: Rivalry games analysis (framework)
      ...recruitingEdge.impact,      // NEW: Recruiting rankings correlation (framework)
      ...(advancedAnalytics ? advancedAnalytics.keyInsights : [])
    ].filter(impact => impact.length > 0);

    // Prediction result
    let prediction: string;
    let recommendedBet: string | undefined;

    // Calculate the true edge between our prediction and Vegas line
    let edge = 0;
    let oppositeSides = false;

    if (vegasSpread) {
      // Check if predictions are on opposite sides
      const vegasFavorsAway = vegasSpread > 0;  // Positive = away team favored
      const weFavorHome = totalScore > 0;       // Positive = home team favored

      oppositeSides = (vegasFavorsAway && weFavorHome) || (!vegasFavorsAway && !weFavorHome);

      if (oppositeSides) {
        // Opposite sides: Add the magnitudes
        edge = Math.abs(totalScore) + Math.abs(vegasSpread);
      } else {
        // Same side: Subtract the magnitudes
        edge = Math.abs(Math.abs(totalScore) - Math.abs(vegasSpread));
      }
    }

    const significantEdge = edge >= 2; // 2+ point edge required for recommendation

    // Debug logging for betting recommendations
    if (vegasSpread) {
      console.log(`🎯 Betting Logic Debug:`);
      console.log(`   Vegas Spread: ${vegasSpread} (${vegasSpread > 0 ? `${awayTeam} -${vegasSpread}` : `${homeTeam} -${Math.abs(vegasSpread)}`})`);
      console.log(`   Our Prediction: ${totalScore} (${totalScore > 0 ? `${homeTeam} -${totalScore}` : `${awayTeam} -${Math.abs(totalScore)}`})`);
      console.log(`   Opposite Sides: ${oppositeSides}`);
      console.log(`   Edge Calculation: ${oppositeSides ? `${Math.abs(totalScore)} + ${Math.abs(vegasSpread)}` : `|${Math.abs(totalScore)} - ${Math.abs(vegasSpread)}|`} = ${edge.toFixed(2)} points`);
      console.log(`   Significant Edge (>=2): ${significantEdge}`);
    }

    if (totalScore > 0) {
      prediction = `${homeTeam} favored by ${Math.abs(totalScore).toFixed(1)} points`;
      if (vegasSpread && significantEdge) {
        if (oppositeSides) {
          // Vegas favors away team, we favor home team - take home team at Vegas line
          recommendedBet = `Take ${homeTeam} +${Math.abs(vegasSpread)}`;
          console.log(`   ✅ OPPOSITE SIDES RECOMMENDATION: ${recommendedBet} (Vegas has them getting ${Math.abs(vegasSpread)} points)`);
        } else if (totalScore > Math.abs(vegasSpread)) {
          // Same side but we favor home team more strongly - take the favorite
          recommendedBet = `Take ${homeTeam} -${Math.abs(vegasSpread)}`;
          console.log(`   ✅ SAME SIDE RECOMMENDATION: ${recommendedBet} (we favor by ${totalScore}, Vegas by ${Math.abs(vegasSpread)})`);
        } else {
          // Same side but Vegas favors home team more strongly - VALUE IS ON THE UNDERDOG
          recommendedBet = `Take ${awayTeam} +${Math.abs(vegasSpread)}`;
          console.log(`   ✅ UNDERDOG VALUE RECOMMENDATION: ${recommendedBet} (we think they lose by only ${totalScore}, Vegas gives ${Math.abs(vegasSpread)} points)`);
        }
      }
    } else {
      prediction = `${awayTeam} favored by ${Math.abs(totalScore).toFixed(1)} points`;
      if (vegasSpread && significantEdge) {
        if (oppositeSides) {
          // Vegas favors home team, we favor away team - take away team at Vegas line
          recommendedBet = `Take ${awayTeam} +${Math.abs(vegasSpread)}`;
          console.log(`   ✅ OPPOSITE SIDES RECOMMENDATION: ${recommendedBet} (Vegas has them getting ${Math.abs(vegasSpread)} points)`);
        } else if (Math.abs(totalScore) > Math.abs(vegasSpread)) {
          // Same side but we favor away team more strongly - take the favorite
          recommendedBet = `Take ${awayTeam} -${Math.abs(vegasSpread)}`;
          console.log(`   ✅ SAME SIDE RECOMMENDATION: ${recommendedBet} (we favor by ${Math.abs(totalScore)}, Vegas by ${Math.abs(vegasSpread)})`);
        } else {
          // Same side but Vegas favors away team more strongly - VALUE IS ON THE UNDERDOG
          recommendedBet = `Take ${homeTeam} +${Math.abs(vegasSpread)}`;
          console.log(`   ✅ UNDERDOG VALUE RECOMMENDATION: ${recommendedBet} (we think they lose by only ${Math.abs(totalScore)}, Vegas gives ${Math.abs(vegasSpread)} points)`);
        }
      }
    }

    return {
      prediction,
      spread: totalScore,
      confidence,
      keyFactors: allFactors,
      recommendedBet,
      vegasLine: vegasSpread || undefined,
      edge: vegasSpread ? Math.abs(totalScore - vegasSpread) : undefined,
      factorBreakdown: {
        weather: weatherFactor.score,
        conference: conferenceFactor.score,
        homeField: homeFieldFactor.score,
        bettingValue: bettingValue.score,
        playerEfficiency: advancedAnalytics?.playerEfficiencyAdj || 0,
        teamEfficiency: advancedAnalytics?.teamEfficiencyAdj || 0,
        momentum: advancedAnalytics?.momentumAdj || 0,
        largeFavoriteRisk: largeFavoriteRisk.score,  // NEW betting pattern factor
        seasonalPattern: seasonalPattern.score,      // NEW seasonal factor
        weatherInteraction: weatherInteraction.score, // NEW weather interaction effects
        injuryImpact: injuryImpact.score,            // NEW injury correlation (framework)
        rivalryGame: rivalryGame.score,              // NEW rivalry analysis (framework)
        recruitingEdge: recruitingEdge.score         // NEW recruiting correlation (framework)
      }
    };
  }
}

// Export singleton instance
export const ricksPicksEngine = new RicksPicksPredictionEngine();