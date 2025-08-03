import { db } from './db';
import { games, teams } from '@shared/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

/**
 * Advanced Prediction Models for College Football
 * Implements multiple sophisticated algorithms for game outcome prediction
 */

interface TeamStrength {
  teamId: number;
  eloRating: number;
  offensiveRating: number;
  defensiveRating: number;
  strengthOfSchedule: number;
  momentum: number;
  homeFieldAdvantage: number;
}

interface PredictionFactors {
  homeTeam: TeamStrength;
  awayTeam: TeamStrength;
  weatherImpact: number;
  rivalryBonus: number;
  conferenceStrength: number;
  seasonTrend: number;
}

interface WeatherFactors {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  weatherCondition: string;
  isDome: boolean;
  weatherImpactScore: number;
}

interface AdvancedPrediction {
  winProbability: number;
  predictedSpread: number;
  predictedTotal: number;
  confidence: number;
  keyFactors: string[];
  model: 'elo' | 'regression' | 'neural' | 'ensemble';
}

export class AdvancedPredictionEngine {
  
  /**
   * HYPOTHESIS 1: BYE WEEK ADVANTAGE
   * Teams coming off bye weeks perform better against the spread
   */
  async calculateByeWeekAdvantage(teamId: number, gameWeek: number, season: number): Promise<number> {
    try {
      // Check if team had a bye the previous week
      const previousWeekGames = await db
        .select()
        .from(games)
        .where(and(
          eq(games.season, season),
          eq(games.week, gameWeek - 1),
          sql`(${games.homeTeamId} = ${teamId} OR ${games.awayTeamId} = ${teamId})`
        ));

      const hadBye = previousWeekGames.length === 0;
      
      if (!hadBye) return 0;

      // Calculate historical bye week performance
      const byeWeekGames = await db
        .select({
          homeTeamId: games.homeTeamId,
          awayTeamId: games.awayTeamId,
          homePoints: games.homePoints,
          awayPoints: games.awayPoints,
          spread: games.spread,
          season: games.season,
          week: games.week
        })
        .from(games)
        .where(and(
          sql`${games.homePoints} IS NOT NULL`,
          sql`${games.awayPoints} IS NOT NULL`,
          sql`${games.spread} IS NOT NULL`,
          sql`${games.season} >= 2009`
        ));

      let byeWeekCoverage = 0;
      let totalByeWeekGames = 0;

      for (const game of byeWeekGames) {
        // Check if either team had a bye the previous week
        const prevWeekCheck = await db
          .select()
          .from(games)
          .where(and(
            eq(games.season, game.season),
            eq(games.week, game.week - 1),
            sql`(${games.homeTeamId} = ${game.homeTeamId} OR ${games.awayTeamId} = ${game.homeTeamId} OR ${games.homeTeamId} = ${game.awayTeamId} OR ${games.awayTeamId} = ${game.awayTeamId})`
          ))
          .limit(1);

        const homeTeamHadBye = prevWeekCheck.length === 0;
        const awayTeamHadBye = prevWeekCheck.length === 0;

        if (homeTeamHadBye || awayTeamHadBye) {
          const actualSpread = (game.homePoints || 0) - (game.awayPoints || 0);
          const vegasSpread = game.spread || 0;
          const covered = actualSpread > vegasSpread;

          if (homeTeamHadBye) {
            byeWeekCoverage += covered ? 1 : 0;
            totalByeWeekGames++;
          }
          if (awayTeamHadBye && !homeTeamHadBye) {
            byeWeekCoverage += (!covered) ? 1 : 0;
            totalByeWeekGames++;
          }
        }
      }

      const byeWeekSuccessRate = totalByeWeekGames > 0 ? byeWeekCoverage / totalByeWeekGames : 0.5;
      
      // Convert to point value (if bye week teams cover 55% of the time, that's worth ~2 points)
      const byeWeekBonus = (byeWeekSuccessRate - 0.5) * 8;
      
      return Math.max(-3, Math.min(3, byeWeekBonus));
    } catch (error) {
      console.error('Error calculating bye week advantage:', error);
      return 0;
    }
  }

  /**
   * HYPOTHESIS 2: AWAY FAVORITES UNDERPERFORM
   * Road favorites cover less often than home favorites
   */
  async calculateAwayFavoriteDisadvantage(isAwayFavorite: boolean, spread: number): Promise<number> {
    try {
      if (!isAwayFavorite) return 0;

      // Get historical away favorite performance
      const awayFavoriteGames = await db
        .select({
          homePoints: games.homePoints,
          awayPoints: games.awayPoints,
          spread: games.spread
        })
        .from(games)
        .where(and(
          sql`${games.homePoints} IS NOT NULL`,
          sql`${games.awayPoints} IS NOT NULL`,
          sql`${games.spread} IS NOT NULL`,
          sql`${games.spread} > 0`, // Away team favored (positive spread)
          sql`${games.season} >= 2009`
        ));

      let awayFavoriteCoverage = 0;
      let totalAwayFavoriteGames = 0;

      for (const game of awayFavoriteGames) {
        const actualSpread = (game.homePoints || 0) - (game.awayPoints || 0);
        const vegasSpread = game.spread || 0;
        const awayFavoriteCovered = actualSpread < vegasSpread;

        awayFavoriteCoverage += awayFavoriteCovered ? 1 : 0;
        totalAwayFavoriteGames++;
      }

      const awayFavoriteSuccessRate = totalAwayFavoriteGames > 0 ? awayFavoriteCoverage / totalAwayFavoriteGames : 0.5;
      
      // If away favorites cover less than 50%, adjust spread accordingly
      const awayFavoritePenalty = (0.5 - awayFavoriteSuccessRate) * 6;
      
      return Math.max(-2, Math.min(2, awayFavoritePenalty));
    } catch (error) {
      console.error('Error calculating away favorite disadvantage:', error);
      return 0;
    }
  }

  /**
   * HYPOTHESIS 3: CONFERENCE STRENGTH ANALYSIS
   * Analyze head-to-head performance between conferences
   */
  async calculateConferenceStrengthAdjustment(homeConference: string, awayConference: string): Promise<number> {
    try {
      if (homeConference === awayConference) return 0;

      // Get historical head-to-head results between these conferences
      const conferenceMatchups = await db
        .select({
          homePoints: games.homePoints,
          awayPoints: games.awayPoints,
          spread: games.spread
        })
        .from(games)
        .innerJoin(teams, eq(teams.id, games.homeTeamId))
        .innerJoin(teams, eq(teams.id, games.awayTeamId))
        .where(and(
          sql`${games.homePoints} IS NOT NULL`,
          sql`${games.awayPoints} IS NOT NULL`,
          sql`${games.spread} IS NOT NULL`,
          sql`${teams.conference} = ${homeConference}`,
          sql`${teams.conference} = ${awayConference}`,
          sql`${games.season} >= 2009`
        ));

      let homeConferenceWins = 0;
      let totalGames = 0;

      for (const game of conferenceMatchups) {
        const homeWon = (game.homePoints || 0) > (game.awayPoints || 0);
        homeConferenceWins += homeWon ? 1 : 0;
        totalGames++;
      }

      if (totalGames < 10) return 0; // Need minimum sample size

      const homeConferenceWinRate = homeConferenceWins / totalGames;
      
      // Conference strength mapping
      const conferenceStrengthMap: { [key: string]: number } = {
        'SEC': 1.0,
        'Big Ten': 0.9,
        'Big 12': 0.8,
        'ACC': 0.7,
        'Pac-12': 0.7,
        'American Athletic': 0.4,
        'Mountain West': 0.3,
        'Conference USA': 0.2,
        'MAC': 0.2,
        'Sun Belt': 0.1
      };

      const homeStrength = conferenceStrengthMap[homeConference] || 0.5;
      const awayStrength = conferenceStrengthMap[awayConference] || 0.5;
      
      // Adjust based on historical performance and relative strength
      const strengthDiff = homeStrength - awayStrength;
      const historicalAdjustment = (homeConferenceWinRate - 0.5) * 4;
      
      return Math.max(-3, Math.min(3, strengthDiff * 2 + historicalAdjustment));
    } catch (error) {
      console.error('Error calculating conference strength adjustment:', error);
      return 0;
    }
  }

  /**
   * ELO RATING SYSTEM
   * Dynamic team strength ratings that update after each game
   */
  async calculateEloRatings(): Promise<Map<number, number>> {
    const eloRatings = new Map<number, number>();
    
    // Initialize all teams with base ELO of 1500
    const allTeams = await db.select().from(teams);
    allTeams.forEach(team => {
      eloRatings.set(team.id, 1500);
    });

    // Process all completed games chronologically to update ELO
    const completedGames = await db
      .select()
      .from(games)
      .where(eq(games.completed, true))
      .orderBy(asc(games.season), asc(games.week));

    for (const game of completedGames) {
      if (game.homeTeamScore !== null && game.awayTeamScore !== null) {
        const homeElo = eloRatings.get(game.homeTeamId) || 1500;
        const awayElo = eloRatings.get(game.awayTeamId) || 1500;
        
        // Calculate expected win probability
        const homeExpected = 1 / (1 + Math.pow(10, (awayElo - homeElo - 100) / 400)); // +100 for home field
        
        // Determine actual result
        const homeWon = game.homeTeamScore > game.awayTeamScore;
        const homeActual = homeWon ? 1 : 0;
        
        // Calculate margin of victory factor
        const marginOfVictory = Math.abs(game.homeTeamScore - game.awayTeamScore);
        const movMultiplier = Math.log(marginOfVictory + 1) * (2.2 / (homeExpected * (1 - homeExpected) + 0.1));
        
        // K-factor (importance of game)
        const kFactor = 32 * movMultiplier;
        
        // Update ELO ratings
        const homeNewElo = homeElo + kFactor * (homeActual - homeExpected);
        const awayNewElo = awayElo + kFactor * ((1 - homeActual) - (1 - homeExpected));
        
        eloRatings.set(game.homeTeamId, homeNewElo);
        eloRatings.set(game.awayTeamId, awayNewElo);
      }
    }
    
    return eloRatings;
  }

  /**
   * OFFENSIVE/DEFENSIVE RATINGS
   * Calculate team strength on both sides of the ball
   */
  async calculateTeamRatings(season: number): Promise<Map<number, { offensive: number, defensive: number }>> {
    const ratings = new Map<number, { offensive: number, defensive: number }>();
    
    // Get all completed games for the season
    const seasonGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.season, season),
        eq(games.completed, true)
      ));

    // Calculate offensive and defensive efficiency for each team
    const teamStats = new Map<number, { 
      pointsScored: number[], 
      pointsAllowed: number[], 
      gameCount: number 
    }>();

    // Collect stats
    for (const game of seasonGames) {
      if (game.homeTeamScore !== null && game.awayTeamScore !== null) {
        // Home team stats
        if (!teamStats.has(game.homeTeamId)) {
          teamStats.set(game.homeTeamId, { pointsScored: [], pointsAllowed: [], gameCount: 0 });
        }
        const homeStats = teamStats.get(game.homeTeamId)!;
        homeStats.pointsScored.push(game.homeTeamScore);
        homeStats.pointsAllowed.push(game.awayTeamScore);
        homeStats.gameCount++;

        // Away team stats  
        if (!teamStats.has(game.awayTeamId)) {
          teamStats.set(game.awayTeamId, { pointsScored: [], pointsAllowed: [], gameCount: 0 });
        }
        const awayStats = teamStats.get(game.awayTeamId)!;
        awayStats.pointsScored.push(game.awayTeamScore);
        awayStats.pointsAllowed.push(game.homeTeamScore);
        awayStats.gameCount++;
      }
    }

    // Calculate ratings
    const avgPointsScored = Array.from(teamStats.values())
      .flatMap(stats => stats.pointsScored)
      .reduce((sum, points) => sum + points, 0) / Array.from(teamStats.values())
      .flatMap(stats => stats.pointsScored).length;

    for (const [teamId, stats] of teamStats) {
      const avgScored = stats.pointsScored.reduce((sum, points) => sum + points, 0) / stats.pointsScored.length;
      const avgAllowed = stats.pointsAllowed.reduce((sum, points) => sum + points, 0) / stats.pointsAllowed.length;
      
      const offensiveRating = (avgScored / avgPointsScored) * 100;
      const defensiveRating = (avgPointsScored / avgAllowed) * 100; // Higher is better (fewer points allowed)
      
      ratings.set(teamId, { 
        offensive: offensiveRating, 
        defensive: defensiveRating 
      });
    }
    
    return ratings;
  }

  /**
   * STRENGTH OF SCHEDULE
   * Calculate how difficult a team's schedule has been
   */
  async calculateStrengthOfSchedule(teamId: number, season: number, eloRatings: Map<number, number>): Promise<number> {
    const teamGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.season, season),
        sql`(${games.homeTeamId} = ${teamId} OR ${games.awayTeamId} = ${teamId})`
      ));

    let totalOpponentElo = 0;
    let gameCount = 0;

    for (const game of teamGames) {
      const opponentId = game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
      const opponentElo = eloRatings.get(opponentId) || 1500;
      totalOpponentElo += opponentElo;
      gameCount++;
    }

    return gameCount > 0 ? totalOpponentElo / gameCount : 1500;
  }

  /**
   * MOMENTUM CALCULATION
   * Recent performance trends
   */
  async calculateMomentum(teamId: number, season: number): Promise<number> {
    const recentGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.season, season),
        eq(games.completed, true),
        sql`(${games.homeTeamId} = ${teamId} OR ${games.awayTeamId} = ${teamId})`
      ))
      .orderBy(desc(games.week))
      .limit(5);

    let momentumScore = 0;
    let weight = 1.0;

    for (const game of recentGames) {
      if (game.homeTeamScore !== null && game.awayTeamScore !== null) {
        const isHome = game.homeTeamId === teamId;
        const teamScore = isHome ? game.homeTeamScore : game.awayTeamScore;
        const opponentScore = isHome ? game.awayTeamScore : game.homeTeamScore;
        
        const won = teamScore > opponentScore;
        const margin = teamScore - opponentScore;
        
        // Recent games have more weight
        const gameValue = (won ? 1 : -1) * (1 + Math.log(Math.abs(margin) + 1) / 10) * weight;
        momentumScore += gameValue;
        weight *= 0.8; // Decay weight for older games
      }
    }

    return momentumScore;
  }

  /**
   * WEATHER IMPACT ANALYSIS
   * Calculate how weather affects offensive and defensive performance
   */
  private calculateWeatherImpact(weather: WeatherFactors): {
    offensiveImpact: number;
    passingImpact: number;
    kickingImpact: number;
    turnoverImpact: number;
  } {
    if (weather.isDome) {
      return { offensiveImpact: 1.0, passingImpact: 1.0, kickingImpact: 1.0, turnoverImpact: 1.0 };
    }

    let offensiveImpact = 1.0;
    let passingImpact = 1.0;
    let kickingImpact = 1.0;
    let turnoverImpact = 1.0;

    // Temperature effects
    if (weather.temperature < 32) {
      offensiveImpact *= 0.85; // Cold reduces offensive efficiency
      passingImpact *= 0.80; // Harder to throw and catch in freezing weather
      kickingImpact *= 0.75; // Kicking much harder in cold
      turnoverImpact *= 1.3; // More fumbles and drops
    } else if (weather.temperature < 40) {
      offensiveImpact *= 0.92;
      passingImpact *= 0.90;
      kickingImpact *= 0.85;
      turnoverImpact *= 1.15;
    } else if (weather.temperature > 95) {
      offensiveImpact *= 0.90; // Heat exhaustion
      turnoverImpact *= 1.1;
    }

    // Wind effects (major impact on passing and kicking)
    if (weather.windSpeed > 25) {
      passingImpact *= 0.70; // Very windy severely impacts passing
      kickingImpact *= 0.60; // Field goals become very difficult
      turnoverImpact *= 1.2;
    } else if (weather.windSpeed > 15) {
      passingImpact *= 0.85;
      kickingImpact *= 0.75;
      turnoverImpact *= 1.1;
    } else if (weather.windSpeed > 10) {
      passingImpact *= 0.95;
      kickingImpact *= 0.90;
    }

    // Precipitation effects
    if (weather.precipitation > 0.3) {
      offensiveImpact *= 0.75; // Heavy rain/snow greatly reduces offense
      passingImpact *= 0.65; // Passing becomes very difficult
      kickingImpact *= 0.70;
      turnoverImpact *= 1.4; // Slippery ball causes fumbles
    } else if (weather.precipitation > 0.1) {
      offensiveImpact *= 0.85;
      passingImpact *= 0.80;
      kickingImpact *= 0.80;
      turnoverImpact *= 1.2;
    }

    // Snow has additional effects
    if (weather.weatherCondition.toLowerCase().includes('snow')) {
      offensiveImpact *= 0.80; // Snow reduces footing and visibility
      turnoverImpact *= 1.3;
    }

    return { offensiveImpact, passingImpact, kickingImpact, turnoverImpact };
  }

  /**
   * Get weather data for a game
   */
  private async getGameWeather(homeTeamId: number, awayTeamId: number, season: number): Promise<WeatherFactors | null> {
    try {
      // Try to get weather from existing game data first
      const existingGame = await db
        .select()
        .from(games)
        .where(and(
          eq(games.homeTeamId, homeTeamId),
          eq(games.awayTeamId, awayTeamId),
          eq(games.season, season)
        ))
        .limit(1);

      if (existingGame.length > 0 && existingGame[0].temperature !== null) {
        return {
          temperature: existingGame[0].temperature!,
          windSpeed: existingGame[0].windSpeed || 5,
          windDirection: existingGame[0].windDirection || 'SW',
          precipitation: existingGame[0].precipitation || 0,
          weatherCondition: existingGame[0].weatherCondition || 'Clear',
          isDome: existingGame[0].isDome || false,
          weatherImpactScore: existingGame[0].weatherImpactScore || 0
        };
      }

      // Default weather for prediction when no data available
      return {
        temperature: 65,
        windSpeed: 8,
        windDirection: 'SW',
        precipitation: 0,
        weatherCondition: 'Clear',
        isDome: false,
        weatherImpactScore: 2
      };

    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  /**
   * ENSEMBLE PREDICTION WITH HYPOTHESIS STACKING
   * Combines multiple models including hypothesis testing for final prediction
   */
  async generateAdvancedPrediction(homeTeamId: number, awayTeamId: number, season: number, gameWeek: number = 1, spread?: number): Promise<AdvancedPrediction> {
    const eloRatings = await this.calculateEloRatings();
    const teamRatings = await this.calculateTeamRatings(season);
    
    const homeElo = eloRatings.get(homeTeamId) || 1500;
    const awayElo = eloRatings.get(awayTeamId) || 1500;
    
    const homeRatings = teamRatings.get(homeTeamId) || { offensive: 100, defensive: 100 };
    const awayRatings = teamRatings.get(awayTeamId) || { offensive: 100, defensive: 100 };
    
    const homeSOS = await this.calculateStrengthOfSchedule(homeTeamId, season, eloRatings);
    const awaySOS = await this.calculateStrengthOfSchedule(awayTeamId, season, eloRatings);
    
    const homeMomentum = await this.calculateMomentum(homeTeamId, season);
    const awayMomentum = await this.calculateMomentum(awayTeamId, season);

    // Get team information for conference analysis
    const homeTeam = await db.select().from(teams).where(eq(teams.id, homeTeamId)).limit(1);
    const awayTeam = await db.select().from(teams).where(eq(teams.id, awayTeamId)).limit(1);
    
    const homeConference = homeTeam[0]?.conference || '';
    const awayConference = awayTeam[0]?.conference || '';

    // **HYPOTHESIS TESTING MODELS**
    // Hypothesis 1: Bye Week Advantage
    const homeByeAdvantage = await this.calculateByeWeekAdvantage(homeTeamId, gameWeek, season);
    const awayByeAdvantage = await this.calculateByeWeekAdvantage(awayTeamId, gameWeek, season);
    const byeWeekAdjustment = homeByeAdvantage - awayByeAdvantage;

    // Hypothesis 2: Away Favorite Disadvantage
    const isAwayFavorite = spread ? spread > 0 : false;
    const awayFavoriteAdjustment = await this.calculateAwayFavoriteDisadvantage(isAwayFavorite, spread || 0);

    // Hypothesis 3: Conference Strength Analysis
    const conferenceStrengthAdjustment = await this.calculateConferenceStrengthAdjustment(homeConference, awayConference);

    // Get weather data and calculate impacts
    const weather = await this.getGameWeather(homeTeamId, awayTeamId, season);
    const weatherImpacts = weather ? this.calculateWeatherImpact(weather) : {
      offensiveImpact: 1.0, passingImpact: 1.0, kickingImpact: 1.0, turnoverImpact: 1.0
    };

    // **CORE PREDICTION MODELS**
    
    // ELO-based prediction (25% weight - reduced for hypothesis integration)
    const eloAdvantage = homeElo - awayElo + 100; // +100 home field advantage
    const eloWinProb = 1 / (1 + Math.pow(10, -eloAdvantage / 400));
    
    // Rating-based prediction with weather adjustments (25% weight)
    const homeOffensiveAdjusted = homeRatings.offensive * weatherImpacts.offensiveImpact;
    const awayOffensiveAdjusted = awayRatings.offensive * weatherImpacts.offensiveImpact;
    
    const ratingAdvantage = (homeOffensiveAdjusted + homeRatings.defensive) - 
                           (awayOffensiveAdjusted + awayRatings.defensive);
    const ratingWinProb = 0.5 + (ratingAdvantage / 400);
    
    // Momentum-based adjustment (15% weight)
    const momentumAdvantage = homeMomentum - awayMomentum;
    const momentumWinProb = 0.5 + (momentumAdvantage / 10);
    
    // SOS adjustment (10% weight)
    const sosAdvantage = homeSOS - awaySOS;
    const sosWinProb = 0.5 + (sosAdvantage / 800);

    // Weather-based adjustment (10% weight)
    const weatherAdvantage = weather ? (weather.weatherImpactScore / 10) : 0;
    const weatherWinProb = 0.5 + (weatherAdvantage * 0.1); // Weather slightly favors home team

    // **HYPOTHESIS STACKING INTEGRATION**
    
    // Calculate base prediction from core models (85% weight)
    const baseWinProb = Math.max(0.05, Math.min(0.95,
      0.25 * eloWinProb + 
      0.25 * Math.max(0.05, Math.min(0.95, ratingWinProb)) +
      0.15 * Math.max(0.05, Math.min(0.95, momentumWinProb)) +
      0.10 * Math.max(0.05, Math.min(0.95, sosWinProb)) +
      0.10 * Math.max(0.05, Math.min(0.95, weatherWinProb))
    ));

    // Apply hypothesis adjustments (15% total weight split among hypotheses)
    let hypothesisAdjustment = 0;
    
    // Bye week advantage: 5% weight
    hypothesisAdjustment += 0.05 * (byeWeekAdjustment / 6); // Normalize to ±0.5 range
    
    // Away favorite disadvantage: 5% weight
    hypothesisAdjustment += 0.05 * (awayFavoriteAdjustment / 4); // Normalize to ±0.5 range
    
    // Conference strength: 5% weight
    hypothesisAdjustment += 0.05 * (conferenceStrengthAdjustment / 6); // Normalize to ±0.5 range

    // Final prediction with hypothesis stacking
    const finalWinProb = Math.max(0.05, Math.min(0.95, baseWinProb + hypothesisAdjustment));

    // Calculate predicted spread with weather adjustments
    const predictedSpread = -1 * (400 * Math.log10(finalWinProb / (1 - finalWinProb)) - 100) / 25;
    
    // Calculate predicted total points with weather impacts
    const baseHomePoints = (homeOffensiveAdjusted / 100) * 28 + (100 / awayRatings.defensive) * 7;
    const baseAwayPoints = (awayOffensiveAdjusted / 100) * 28 + (100 / homeRatings.defensive) * 7;
    
    // Adjust for turnovers and kicking difficulties
    const homePointsAdjusted = baseHomePoints * weatherImpacts.kickingImpact;
    const awayPointsAdjusted = baseAwayPoints * weatherImpacts.kickingImpact;
    
    const predictedTotal = homePointsAdjusted + awayPointsAdjusted;

    // Calculate confidence based on model agreement and weather certainty
    const modelVariance = Math.abs(eloWinProb - ratingWinProb) + 
                         Math.abs(eloWinProb - momentumWinProb) + 
                         Math.abs(ratingWinProb - momentumWinProb);
    
    let confidence = Math.max(0.1, 1 - (modelVariance / 3));
    
    // Reduce confidence for high weather impact games
    if (weather && weather.weatherImpactScore > 6) {
      confidence *= 0.8; // High weather impact reduces prediction confidence
    }

    // Identify key factors including weather and hypothesis insights
    const keyFactors: string[] = [];
    if (Math.abs(eloAdvantage) > 200) keyFactors.push('Significant ELO advantage');
    if (Math.abs(ratingAdvantage) > 40) keyFactors.push('Major rating difference');
    if (Math.abs(momentumAdvantage) > 2) keyFactors.push('Strong momentum trend');
    if (Math.abs(sosAdvantage) > 100) keyFactors.push('Schedule strength factor');
    
    // Hypothesis-specific factors
    if (Math.abs(byeWeekAdjustment) > 1) {
      keyFactors.push(byeWeekAdjustment > 0 ? 'Home team coming off bye week' : 'Away team coming off bye week');
    }
    
    if (isAwayFavorite && Math.abs(awayFavoriteAdjustment) > 0.5) {
      keyFactors.push('Away favorite historically underperforms');
    }
    
    if (Math.abs(conferenceStrengthAdjustment) > 1) {
      const stronger = conferenceStrengthAdjustment > 0 ? homeConference : awayConference;
      keyFactors.push(`${stronger} historically dominates this matchup`);
    }
    
    // Weather-specific factors
    if (weather) {
      if (weather.isDome) keyFactors.push('Dome game - controlled conditions');
      else if (weather.weatherImpactScore > 6) keyFactors.push('Severe weather expected');
      else if (weather.weatherImpactScore > 3) keyFactors.push('Weather impact moderate');
      
      if (weather.temperature < 32) keyFactors.push('Freezing conditions favor running game');
      if (weather.windSpeed > 15) keyFactors.push('High winds reduce passing effectiveness');
      if (weather.precipitation > 0.2) keyFactors.push('Precipitation increases turnovers');
    }

    return {
      winProbability: finalWinProb,
      predictedSpread: predictedSpread,
      predictedTotal: predictedTotal,
      confidence: confidence,
      keyFactors: keyFactors,
      model: 'ensemble'
    };
  }
}

export const advancedPredictionEngine = new AdvancedPredictionEngine();