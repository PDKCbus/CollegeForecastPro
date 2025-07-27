import { teams, games } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import postgres from "postgres";

export interface TeamAnalytics {
  teamId: number;
  eloRating: number;
  eloChange: number;
  totalYardsPerGame: number;
  passingYardsPerGame: number;
  rushingYardsPerGame: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversion: number;
  redZoneEfficiency: number;
  strengthOfSchedule: number;
  winStreak: number;
  lossStreak: number;
  momentumScore: number;
  last5Games: string;
  injuryImpactScore: number;
  recruitingClassRank?: number;
  avgRecruitRating: number;
  recruitingScore: number;
  sagRating: number;
  srsRating: number;
  sosRating: number;
}

export interface GameAnalytics {
  homeTeamAnalytics: TeamAnalytics;
  awayTeamAnalytics: TeamAnalytics;
  eloDifference: number;
  expectedOutcome: {
    homeWinProbability: number;
    predictedSpread: number;
    confidenceLevel: number;
  };
  keyMatchups: string[];
  momentumFactor: number;
  injuryImpact: number;
}

/**
 * ELO Rating System Implementation
 * Based on standard chess ELO adapted for college football
 */
export class ELORatingSystem {
  private static readonly K_FACTOR = 32; // Standard K-factor for ELO
  private static readonly HOME_FIELD_ADVANTAGE = 65; // ELO points for home field

  /**
   * Calculate expected score for team A against team B
   */
  static calculateExpectedScore(eloA: number, eloB: number, isHomeTeam: boolean = false): number {
    const adjustedEloA = isHomeTeam ? eloA + this.HOME_FIELD_ADVANTAGE : eloA;
    const diff = adjustedEloA - eloB;
    return 1 / (1 + Math.pow(10, -diff / 400));
  }

  /**
   * Update ELO ratings after a game
   */
  static updateELORatings(
    homeElo: number, 
    awayElo: number, 
    homeScore: number, 
    awayScore: number
  ): { newHomeElo: number; newAwayElo: number } {
    const homeExpected = this.calculateExpectedScore(homeElo, awayElo, true);
    const awayExpected = 1 - homeExpected;
    
    // Game result (1 = win, 0.5 = tie, 0 = loss)
    let homeResult: number;
    let awayResult: number;
    
    if (homeScore > awayScore) {
      homeResult = 1;
      awayResult = 0;
    } else if (awayScore > homeScore) {
      homeResult = 0;
      awayResult = 1;
    } else {
      homeResult = 0.5;
      awayResult = 0.5;
    }
    
    // Margin of victory multiplier
    const marginMultiplier = Math.log(Math.abs(homeScore - awayScore) + 1) * 2.2;
    const kFactor = this.K_FACTOR * marginMultiplier;
    
    const newHomeElo = homeElo + kFactor * (homeResult - homeExpected);
    const newAwayElo = awayElo + kFactor * (awayResult - awayExpected);
    
    return { newHomeElo, newAwayElo };
  }

  /**
   * Predict game outcome based on ELO ratings
   */
  static predictGame(homeElo: number, awayElo: number): {
    homeWinProbability: number;
    predictedSpread: number;
    confidenceLevel: number;
  } {
    const homeWinProb = this.calculateExpectedScore(homeElo, awayElo, true);
    const eloDiff = homeElo - awayElo + this.HOME_FIELD_ADVANTAGE;
    
    // Convert ELO difference to point spread (roughly 25 ELO points = 1 point)
    const predictedSpread = eloDiff / 25;
    
    // Confidence based on ELO difference magnitude
    const confidenceLevel = Math.min(95, Math.max(55, Math.abs(eloDiff) / 10 + 50));
    
    return {
      homeWinProbability: homeWinProb * 100,
      predictedSpread: Math.round(predictedSpread * 2) / 2, // Round to nearest 0.5
      confidenceLevel
    };
  }
}

/**
 * Team Analytics Engine
 */
export class TeamAnalyticsEngine {
  
  /**
   * Calculate momentum score based on recent performance
   */
  static calculateMomentumScore(last5Games: string, currentStreak: number): number {
    if (!last5Games) return 50; // Neutral momentum
    
    const games = last5Games.split('-');
    let score = 50; // Start neutral
    
    // Weight recent games more heavily
    const weights = [1.0, 1.2, 1.4, 1.6, 2.0]; // Most recent game has highest weight
    
    games.forEach((result, index) => {
      const weight = weights[index] || 1.0;
      if (result === 'W') {
        score += 8 * weight;
      } else if (result === 'L') {
        score -= 8 * weight;
      }
    });
    
    // Streak bonus/penalty
    if (currentStreak > 0) {
      score += Math.min(currentStreak * 3, 15); // Win streak bonus
    } else {
      score += Math.max(currentStreak * 3, -15); // Loss streak penalty
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate injury impact score
   */
  static calculateInjuryImpact(injuryCount: number, keyPlayersInjured: string[]): number {
    let impact = injuryCount * 0.5; // Base impact
    
    // Key positions have higher impact
    const keyPositions = ['QB', 'RB', 'WR1', 'LT', 'C', 'DE', 'LB', 'CB', 'S'];
    keyPlayersInjured?.forEach(player => {
      keyPositions.forEach(pos => {
        if (player.includes(pos)) {
          impact += pos === 'QB' ? 3.0 : 1.5;
        }
      });
    });
    
    return Math.min(10, impact);
  }

  /**
   * Calculate recruiting impact on current performance
   */
  static calculateRecruitingScore(classRank?: number, avgRating: number = 0): number {
    if (!classRank || classRank === 0) return 50; // Neutral if no data
    
    // Higher ranked classes (lower numbers) get higher scores
    let score = Math.max(0, 130 - classRank);
    
    // Average recruit rating bonus
    if (avgRating > 0) {
      score += (avgRating - 2.5) * 20; // 3+ star average gets bonus
    }
    
    return Math.min(100, score);
  }

  /**
   * Get comprehensive team analytics
   */
  static async getTeamAnalytics(teamId: number, season: number = 2025): Promise<TeamAnalytics | null> {
    try {
      // Create a direct connection using postgres
      const sql = postgres(process.env.DATABASE_URL!);
      const team = await sql`SELECT * FROM teams WHERE id = ${teamId} LIMIT 1`;
      if (!team.length) return null;

      const teamData = team[0];
      
      // Calculate momentum if not already set
      const momentumScore = this.calculateMomentumScore(
        teamData.last5Games || '',
        teamData.winStreak || 0
      );

      // Calculate injury impact if not already set
      const injuryImpact = this.calculateInjuryImpact(
        teamData.injuryCount || 0,
        teamData.keyPlayersInjured || []
      );

      // Calculate recruiting score if not already set
      const recruitingScore = this.calculateRecruitingScore(
        teamData.recruitingClassRank || undefined,
        teamData.avgRecruitRating || 0
      );

      return {
        teamId: teamData.id,
        eloRating: teamData.eloRating || 1500,
        eloChange: teamData.eloChange || 0,
        totalYardsPerGame: teamData.totalYardsPerGame || 0,
        passingYardsPerGame: teamData.passingYardsPerGame || 0,
        rushingYardsPerGame: teamData.rushingYardsPerGame || 0,
        pointsPerGame: teamData.pointsPerGame || 0,
        pointsAllowedPerGame: teamData.pointsAllowedPerGame || 0,
        turnoverDifferential: teamData.turnoverDifferential || 0,
        thirdDownConversion: teamData.thirdDownConversion || 0,
        redZoneEfficiency: teamData.redZoneEfficiency || 0,
        strengthOfSchedule: teamData.strengthOfSchedule || 0,
        winStreak: teamData.winStreak || 0,
        lossStreak: teamData.lossStreak || 0,
        momentumScore,
        last5Games: teamData.last5Games || '',
        injuryImpactScore: injuryImpact,
        recruitingClassRank: teamData.recruitingClassRank || undefined,
        avgRecruitRating: teamData.avgRecruitRating || 0,
        recruitingScore,
        sagRating: teamData.sagRating || 0,
        srsRating: teamData.srsRating || 0,
        sosRating: teamData.sosRating || 0
      };
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      return null;
    }
  }

  /**
   * Get comprehensive game analytics for matchup analysis
   */
  static async getGameAnalytics(homeTeamId: number, awayTeamId: number): Promise<GameAnalytics | null> {
    try {
      const homeAnalytics = await this.getTeamAnalytics(homeTeamId);
      const awayAnalytics = await this.getTeamAnalytics(awayTeamId);
      
      if (!homeAnalytics || !awayAnalytics) return null;

      const eloDifference = homeAnalytics.eloRating - awayAnalytics.eloRating;
      const expectedOutcome = ELORatingSystem.predictGame(
        homeAnalytics.eloRating,
        awayAnalytics.eloRating
      );

      // Calculate key matchups
      const keyMatchups = this.identifyKeyMatchups(homeAnalytics, awayAnalytics);
      
      // Calculate momentum factor
      const momentumFactor = (homeAnalytics.momentumScore - awayAnalytics.momentumScore) / 100;
      
      // Calculate injury impact difference
      const injuryImpact = awayAnalytics.injuryImpactScore - homeAnalytics.injuryImpactScore;

      return {
        homeTeamAnalytics: homeAnalytics,
        awayTeamAnalytics: awayAnalytics,
        eloDifference,
        expectedOutcome,
        keyMatchups,
        momentumFactor,
        injuryImpact
      };
    } catch (error) {
      console.error('Error generating game analytics:', error);
      return null;
    }
  }

  /**
   * Identify key matchups between teams
   */
  private static identifyKeyMatchups(home: TeamAnalytics, away: TeamAnalytics): string[] {
    const matchups: string[] = [];

    // Passing offense vs pass defense
    if (away.passingYardsPerGame > 300 && home.pointsAllowedPerGame > 25) {
      matchups.push(`${away.teamId}'s passing attack vs ${home.teamId}'s pass defense`);
    }

    // Rushing offense vs rush defense
    if (away.rushingYardsPerGame > 180 && home.pointsAllowedPerGame > 20) {
      matchups.push(`${away.teamId}'s ground game vs ${home.teamId}'s run defense`);
    }

    // Red zone efficiency matchup
    if (Math.abs(home.redZoneEfficiency - away.redZoneEfficiency) > 20) {
      matchups.push("Red zone efficiency battle");
    }

    // Turnover battle
    if (Math.abs(home.turnoverDifferential - away.turnoverDifferential) > 1) {
      matchups.push("Turnover margin will be crucial");
    }

    // Third down battle
    if (Math.abs(home.thirdDownConversion - away.thirdDownConversion) > 10) {
      matchups.push("Third down conversions");
    }

    return matchups.slice(0, 3); // Return top 3 matchups
  }
}

/**
 * Update team analytics from game results
 */
export async function updateTeamAnalyticsFromGame(
  homeTeamId: number,
  awayTeamId: number,
  homeScore: number,
  awayScore: number,
  gameStats?: {
    homeTotalYards?: number;
    awayTotalYards?: number;
    homePassingYards?: number;
    awayPassingYards?: number;
    homeRushingYards?: number;
    awayRushingYards?: number;
    homeTurnovers?: number;
    awayTurnovers?: number;
  }
): Promise<void> {
  try {
    // Create a direct connection using postgres
    const sql = postgres(process.env.DATABASE_URL!);
    
    // Get current teams
    const homeTeam = await sql`SELECT * FROM teams WHERE id = ${homeTeamId} LIMIT 1`;
    const awayTeam = await sql`SELECT * FROM teams WHERE id = ${awayTeamId} LIMIT 1`;
    
    if (!homeTeam.length || !awayTeam.length) return;

    // Update ELO ratings
    const homeTeamData = homeTeam[0];
    const awayTeamData = awayTeam[0];
    
    const { newHomeElo, newAwayElo } = ELORatingSystem.updateELORatings(
      homeTeamData.elo_rating || 1500,
      awayTeamData.elo_rating || 1500,
      homeScore,
      awayScore
    );

    // Update team records and analytics
    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;

    // Update home team
    await sql`
      UPDATE teams SET
        elo_rating = ${newHomeElo},
        elo_change = ${newHomeElo - (homeTeamData.elo_rating || 1500)},
        wins = ${homeTeamData.wins + (homeWon ? 1 : 0)},
        losses = ${homeTeamData.losses + (awayWon ? 1 : 0)},
        win_streak = ${homeWon ? (homeTeamData.win_streak || 0) + 1 : 0},
        loss_streak = ${awayWon ? (homeTeamData.loss_streak || 0) + 1 : 0},
        last_updated = NOW()
      WHERE id = ${homeTeamId}
    `;

    // Update away team
    await sql`
      UPDATE teams SET
        elo_rating = ${newAwayElo},
        elo_change = ${newAwayElo - (awayTeamData.elo_rating || 1500)},
        wins = ${awayTeamData.wins + (awayWon ? 1 : 0)},
        losses = ${awayTeamData.losses + (homeWon ? 1 : 0)},
        win_streak = ${awayWon ? (awayTeamData.win_streak || 0) + 1 : 0},
        loss_streak = ${homeWon ? (awayTeamData.loss_streak || 0) + 1 : 0},
        last_updated = NOW()
      WHERE id = ${awayTeamId}
    `;

    console.log(`Updated ELO: Home ${homeTeamId}: ${newHomeElo.toFixed(1)}, Away ${awayTeamId}: ${newAwayElo.toFixed(1)}`);
  } catch (error) {
    console.error('Error updating team analytics:', error);
  }
}