/**
 * Advanced Analytics Engine - Final Phase Implementation
 * Target: Push algorithm from 52.9% to 53-54% ATS
 * 
 * Features:
 * 1. Player Efficiency Metrics (+0.6 points)
 * 2. Team Efficiency Differentials (+0.4 points) 
 * 3. Recent Performance Momentum (+0.3 points)
 */

import { db } from './db';
import { games, teams, playerStats, teamSeasonStats, players } from '../shared/schema';
import { eq, and, desc, sql, avg, sum } from 'drizzle-orm';

interface PlayerEfficiencyMetrics {
  qbRating: number;
  qbCompletionPercentage: number;
  yardsPerAttempt: number;
  turnoverRate: number;
  redZoneEfficiency: number;
  impactScore: number; // 0-10 scale
}

interface TeamEfficiencyDifferentials {
  offensiveEfficiency: number; // Yards per play
  defensiveEfficiency: number; // Yards allowed per play
  turnoverMargin: number;
  thirdDownConversion: number;
  redZoneConversion: number;
  specialTeamsRating: number;
  overallEfficiencyScore: number; // -10 to +10 scale
}

interface RecentPerformanceMomentum {
  last3GamesMomentum: number;
  pointDifferentialTrend: number;
  againstTheSpreadRecord: number;
  homeAwayMomentum: number;
  momentumScore: number; // -5 to +5 scale
}

interface AdvancedAnalyticsResult {
  playerEfficiencyAdj: number;
  teamEfficiencyAdj: number;
  momentumAdj: number;
  totalAdvancedAdj: number;
  confidence: number;
  keyInsights: string[];
}

export class AdvancedAnalyticsEngine {
  
  /**
   * 1. Player Efficiency Metrics Analysis (+0.6 points target)
   * Focus on QB performance and key position players
   */
  async calculatePlayerEfficiencyMetrics(teamId: number, season: number): Promise<PlayerEfficiencyMetrics> {
    // Get team's starting QB stats for the season
    const qbStats = await db
      .select({
        passingYards: sum(playerStats.passingYards),
        passingAttempts: sum(playerStats.passingAttempts),
        passingCompletions: sum(playerStats.passingCompletions),
        passingTouchdowns: sum(playerStats.passingTouchdowns),
        passingInterceptions: sum(playerStats.passingInterceptions),
        rushingYards: sum(playerStats.rushingYards),
        rushingTouchdowns: sum(playerStats.rushingTouchdowns),
        rushingAttempts: sum(playerStats.rushingAttempts)
      })
      .from(playerStats)
      .innerJoin(players, eq(playerStats.playerId, players.id))
      .where(and(
        eq(players.teamId, teamId),
        eq(playerStats.season, season),
        eq(players.position, 'QB')
      ))
      .groupBy(players.id)
      .orderBy(desc(sum(playerStats.passingAttempts)))
      .limit(1);

    if (!qbStats.length) {
      return {
        qbRating: 50, // Below average
        qbCompletionPercentage: 60,
        yardsPerAttempt: 6.5,
        turnoverRate: 3.0,
        redZoneEfficiency: 50,
        impactScore: 3.0
      };
    }

    const stats = qbStats[0];
    
    // Calculate QB metrics
    const completionPct = stats.passingCompletions && stats.passingAttempts 
      ? (Number(stats.passingCompletions) / Number(stats.passingAttempts)) * 100 
      : 60;
    
    const yardsPerAttempt = stats.passingYards && stats.passingAttempts
      ? Number(stats.passingYards) / Number(stats.passingAttempts)
      : 6.5;
    
    const turnoverRate = stats.passingInterceptions && stats.passingAttempts
      ? (Number(stats.passingInterceptions) / Number(stats.passingAttempts)) * 100
      : 3.0;
    
    // QB Rating calculation (simplified)
    const qbRating = Math.min(158.3, Math.max(0, 
      ((completionPct - 30) * 0.05) + 
      ((yardsPerAttempt - 3) * 0.25) + 
      ((Number(stats.passingTouchdowns || 0) / Number(stats.passingAttempts || 1)) * 20) + 
      (2.375 - (turnoverRate * 0.25))
    ) * 100 / 6);

    // Impact score based on performance tiers
    let impactScore = 5.0; // Average
    if (qbRating > 130) impactScore = 9.0; // Elite QB (+5.7 points research finding)
    else if (qbRating > 110) impactScore = 7.5; // Very good QB
    else if (qbRating > 90) impactScore = 6.0; // Good QB
    else if (qbRating < 70) impactScore = 2.0; // Poor QB

    return {
      qbRating,
      qbCompletionPercentage: completionPct,
      yardsPerAttempt,
      turnoverRate,
      redZoneEfficiency: 70, // Will enhance with red zone data later
      impactScore
    };
  }

  /**
   * 2. Team Efficiency Differentials (+0.4 points target)
   * Analyze offensive vs defensive efficiency matchups
   */
  async calculateTeamEfficiencyDifferentials(
    homeTeamId: number, 
    awayTeamId: number, 
    season: number
  ): Promise<{ home: TeamEfficiencyDifferentials; away: TeamEfficiencyDifferentials; differential: number }> {
    
    const getTeamEfficiency = async (teamId: number): Promise<TeamEfficiencyDifferentials> => {
      const teamStats = await db
        .select()
        .from(teamSeasonStats)
        .where(and(
          eq(teamSeasonStats.teamId, teamId),
          eq(teamSeasonStats.season, season)
        ))
        .limit(1);

      if (!teamStats.length) {
        return {
          offensiveEfficiency: 5.5,
          defensiveEfficiency: 5.5,
          turnoverMargin: 0,
          thirdDownConversion: 35,
          redZoneConversion: 75,
          specialTeamsRating: 50,
          overallEfficiencyScore: 0
        };
      }

      const stats = teamStats[0];
      const gamesPlayed = (stats.wins || 0) + (stats.losses || 0);
      
      if (gamesPlayed === 0) {
        return {
          offensiveEfficiency: 5.5,
          defensiveEfficiency: 5.5,
          turnoverMargin: 0,
          thirdDownConversion: 35,
          redZoneConversion: 75,
          specialTeamsRating: 50,
          overallEfficiencyScore: 0
        };
      }

      // Calculate efficiency metrics
      const offensiveYPP = (stats.totalOffenseYards || 0) / Math.max(gamesPlayed * 65, 1); // ~65 plays per game
      const defensiveYPP = (stats.totalDefenseYards || 0) / Math.max(gamesPlayed * 65, 1);
      const avgTurnoverMargin = (stats.turnoverMargin || 0) / gamesPlayed;
      
      // Calculate overall efficiency score (-10 to +10)
      let efficiencyScore = 0;
      
      // Offensive efficiency bonus/penalty
      if (offensiveYPP > 6.5) efficiencyScore += 3;
      else if (offensiveYPP > 6.0) efficiencyScore += 1;
      else if (offensiveYPP < 4.5) efficiencyScore -= 3;
      else if (offensiveYPP < 5.0) efficiencyScore -= 1;
      
      // Defensive efficiency bonus/penalty  
      if (defensiveYPP < 4.5) efficiencyScore += 3;
      else if (defensiveYPP < 5.0) efficiencyScore += 1;
      else if (defensiveYPP > 6.5) efficiencyScore -= 3;
      else if (defensiveYPP > 6.0) efficiencyScore -= 1;
      
      // Turnover margin impact
      efficiencyScore += avgTurnoverMargin * 2;
      
      return {
        offensiveEfficiency: offensiveYPP,
        defensiveEfficiency: defensiveYPP,
        turnoverMargin: avgTurnoverMargin,
        thirdDownConversion: stats.thirdDownConversion || 35,
        redZoneConversion: stats.redZoneConversion || 75,
        specialTeamsRating: 50, // Neutral until we get ST data
        overallEfficiencyScore: Math.max(-10, Math.min(10, efficiencyScore))
      };
    };

    const homeEfficiency = await getTeamEfficiency(homeTeamId);
    const awayEfficiency = await getTeamEfficiency(awayTeamId);
    
    // Calculate matchup differential
    const offensiveMatchup = homeEfficiency.offensiveEfficiency - awayEfficiency.defensiveEfficiency;
    const defensiveMatchup = awayEfficiency.offensiveEfficiency - homeEfficiency.defensiveEfficiency;
    const overallDifferential = (offensiveMatchup - defensiveMatchup) + 
                               (homeEfficiency.overallEfficiencyScore - awayEfficiency.overallEfficiencyScore) * 0.5;

    return {
      home: homeEfficiency,
      away: awayEfficiency,
      differential: Math.max(-8, Math.min(8, overallDifferential)) // Cap at ±8 points
    };
  }

  /**
   * 3. Recent Performance Momentum (+0.3 points target)
   * Analyze recent game trends and momentum
   */
  async calculateRecentPerformanceMomentum(
    homeTeamId: number, 
    awayTeamId: number, 
    season: number
  ): Promise<{ home: RecentPerformanceMomentum; away: RecentPerformanceMomentum; differential: number }> {
    
    const getTeamMomentum = async (teamId: number): Promise<RecentPerformanceMomentum> => {
      // Get last 5 games
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

      if (recentGames.length < 3) {
        return {
          last3GamesMomentum: 0,
          pointDifferentialTrend: 0,
          againstTheSpreadRecord: 0,
          homeAwayMomentum: 0,
          momentumScore: 0
        };
      }

      let momentumScore = 0;
      let pointDifferentialSum = 0;
      let atsRecord = 0;
      let weight = 1.0;

      // Analyze last 3 games for momentum
      for (let i = 0; i < Math.min(3, recentGames.length); i++) {
        const game = recentGames[i];
        if (game.homeTeamScore !== null && game.awayTeamScore !== null) {
          const isHome = game.homeTeamId === teamId;
          const teamScore = isHome ? game.homeTeamScore : game.awayTeamScore;
          const opponentScore = isHome ? game.awayTeamScore : game.homeTeamScore;
          const margin = teamScore - opponentScore;
          
          // Win/loss with margin consideration
          const gameValue = margin > 0 ? 1 : -1;
          const marginBonus = Math.min(Math.abs(margin) / 14, 1); // Cap bonus at 14+ point games
          
          momentumScore += (gameValue + marginBonus * gameValue * 0.5) * weight;
          pointDifferentialSum += margin;
          
          // ATS calculation (simplified - assuming spread if available)
          if (game.spread) {
            const coverMargin = isHome ? margin + game.spread : margin - game.spread;
            if (coverMargin > 0) atsRecord += weight;
          }
          
          weight *= 0.8; // Decay for older games
        }
      }

      const avgPointDiff = pointDifferentialSum / Math.min(3, recentGames.length);
      
      // Home/Away momentum (if current game context is known)
      let homeAwayBonus = 0;
      const homeGames = recentGames.filter(g => g.homeTeamId === teamId && g.completed);
      if (homeGames.length > 0) {
        const homeRecord = homeGames.filter(g => 
          g.homeTeamScore !== null && g.awayTeamScore !== null && 
          g.homeTeamScore > g.awayTeamScore
        ).length;
        homeAwayBonus = (homeRecord / homeGames.length - 0.5) * 2; // -1 to +1
      }

      const finalMomentumScore = Math.max(-5, Math.min(5, momentumScore + avgPointDiff * 0.1 + homeAwayBonus));

      return {
        last3GamesMomentum: momentumScore,
        pointDifferentialTrend: avgPointDiff,
        againstTheSpreadRecord: atsRecord,
        homeAwayMomentum: homeAwayBonus,
        momentumScore: finalMomentumScore
      };
    };

    const homeMomentum = await getTeamMomentum(homeTeamId);
    const awayMomentum = await getTeamMomentum(awayTeamId);
    
    const differential = homeMomentum.momentumScore - awayMomentum.momentumScore;

    return {
      home: homeMomentum,
      away: awayMomentum,
      differential: Math.max(-6, Math.min(6, differential)) // Cap at ±6 points
    };
  }

  /**
   * Generate comprehensive advanced analytics adjustment
   */
  async generateAdvancedAnalytics(
    homeTeamId: number,
    awayTeamId: number, 
    season: number
  ): Promise<AdvancedAnalyticsResult> {
    
    try {
      // Calculate all three components
      const [homePlayerMetrics, awayPlayerMetrics] = await Promise.all([
        this.calculatePlayerEfficiencyMetrics(homeTeamId, season),
        this.calculatePlayerEfficiencyMetrics(awayTeamId, season)
      ]);
      
      const efficiencyAnalysis = await this.calculateTeamEfficiencyDifferentials(homeTeamId, awayTeamId, season);
      const momentumAnalysis = await this.calculateRecentPerformanceMomentum(homeTeamId, awayTeamId, season);
      
      // Calculate adjustments (positive = home team advantage)
      const playerEfficiencyAdj = (homePlayerMetrics.impactScore - awayPlayerMetrics.impactScore) * 0.75; // Max ±4.5 points
      const teamEfficiencyAdj = efficiencyAnalysis.differential * 0.5; // Max ±4 points  
      const momentumAdj = momentumAnalysis.differential * 0.5; // Max ±3 points
      
      const totalAdvancedAdj = playerEfficiencyAdj + teamEfficiencyAdj + momentumAdj;
      
      // Calculate confidence based on data quality
      let confidence = 0.7; // Base confidence
      if (homePlayerMetrics.qbRating > 0 && awayPlayerMetrics.qbRating > 0) confidence += 0.1;
      if (Math.abs(efficiencyAnalysis.differential) > 2) confidence += 0.1;
      if (Math.abs(momentumAnalysis.differential) > 1) confidence += 0.1;
      
      // Generate key insights
      const keyInsights: string[] = [];
      
      if (Math.abs(playerEfficiencyAdj) > 1.5) {
        const favored = playerEfficiencyAdj > 0 ? "Home" : "Away";
        keyInsights.push(`${favored} team has significant QB advantage (+${Math.abs(playerEfficiencyAdj).toFixed(1)} pts)`);
      }
      
      if (Math.abs(teamEfficiencyAdj) > 1.0) {
        const favored = teamEfficiencyAdj > 0 ? "Home" : "Away";
        keyInsights.push(`${favored} team efficiency mismatch (+${Math.abs(teamEfficiencyAdj).toFixed(1)} pts)`);
      }
      
      if (Math.abs(momentumAdj) > 1.0) {
        const favored = momentumAdj > 0 ? "Home" : "Away";
        keyInsights.push(`${favored} team riding momentum (+${Math.abs(momentumAdj).toFixed(1)} pts)`);
      }
      
      return {
        playerEfficiencyAdj,
        teamEfficiencyAdj,
        momentumAdj,
        totalAdvancedAdj: Math.max(-10, Math.min(10, totalAdvancedAdj)), // Cap total at ±10
        confidence: Math.min(1.0, confidence),
        keyInsights
      };
      
    } catch (error) {
      console.error("Advanced analytics calculation error:", error);
      return {
        playerEfficiencyAdj: 0,
        teamEfficiencyAdj: 0,
        momentumAdj: 0,
        totalAdvancedAdj: 0,
        confidence: 0.5,
        keyInsights: ["Advanced analytics data unavailable"]
      };
    }
  }
}

export const advancedAnalyticsEngine = new AdvancedAnalyticsEngine();