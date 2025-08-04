import { db } from './db';
import { games, players, injuries, playerStats, teams } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { injuryTracker } from './injury-tracker';

interface HandicappingAnalysis {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
  injuryImpact: {
    home: {
      totalImpact: number;
      keyPlayersOut: number;
      healthScore: number;
      criticalInjuries: any[];
    };
    away: {
      totalImpact: number;
      keyPlayersOut: number;
      healthScore: number;
      criticalInjuries: any[];
    };
  };
  keyPlayerMatchups: any[];
  depthChartImpact: {
    home: { [position: string]: number };
    away: { [position: string]: number };
  };
  overallHandicappingEdge: number; // -10 to +10 scale (positive favors home)
  keyFactors: string[];
  confidenceLevel: number; // 1-10 scale
}

interface PlayerMatchup {
  homePlayer: any;
  awayPlayer: any;
  matchupType: string;
  advantageRating: number; // -10 to +10 scale
  keyStats: any;
  impactOnGame: number; // 1-10 scale
}

export class HandicappingEngine {

  async generateHandicappingAnalysis(gameId: number): Promise<HandicappingAnalysis> {
    console.log(`⚡ Generating handicapping analysis for game ${gameId}`);

    try {
      // Get game details
      const game = await db.query.games.findFirst({
        where: (games, { eq }) => eq(games.id, gameId),
        with: {
          homeTeam: true,
          awayTeam: true
        }
      });

      if (!game) {
        throw new Error(`Game ${gameId} not found`);
      }

      // Calculate injury impact for both teams
      const homeInjuryImpact = await injuryTracker.calculateTeamInjuryImpact(game.homeTeamId);
      const awayInjuryImpact = await injuryTracker.calculateTeamInjuryImpact(game.awayTeamId);

      // Get critical injuries for both teams
      const homeCriticalInjuries = await this.getCriticalInjuries(game.homeTeamId);
      const awayCriticalInjuries = await this.getCriticalInjuries(game.awayTeamId);

      // Analyze key player matchups
      const keyPlayerMatchups = await this.analyzeKeyPlayerMatchups(gameId, game.homeTeamId, game.awayTeamId);

      // Calculate depth chart impact
      const depthChartImpact = await this.calculateDepthChartImpact(game.homeTeamId, game.awayTeamId);

      // Calculate overall handicapping edge
      const overallHandicappingEdge = this.calculateOverallEdge(
        homeInjuryImpact,
        awayInjuryImpact,
        keyPlayerMatchups,
        depthChartImpact
      );

      // Generate key factors
      const keyFactors = this.generateKeyFactors(
        homeInjuryImpact,
        awayInjuryImpact,
        homeCriticalInjuries,
        awayCriticalInjuries,
        keyPlayerMatchups
      );

      // Calculate confidence level
      const confidenceLevel = this.calculateConfidenceLevel(
        homeInjuryImpact,
        awayInjuryImpact,
        keyPlayerMatchups.length
      );

      const analysis: HandicappingAnalysis = {
        gameId,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        injuryImpact: {
          home: {
            totalImpact: homeInjuryImpact.totalImpact,
            keyPlayersOut: homeInjuryImpact.keyPlayersOut,
            healthScore: homeInjuryImpact.overallHealthScore,
            criticalInjuries: homeCriticalInjuries
          },
          away: {
            totalImpact: awayInjuryImpact.totalImpact,
            keyPlayersOut: awayInjuryImpact.keyPlayersOut,
            healthScore: awayInjuryImpact.overallHealthScore,
            criticalInjuries: awayCriticalInjuries
          }
        },
        keyPlayerMatchups,
        depthChartImpact,
        overallHandicappingEdge,
        keyFactors,
        confidenceLevel
      };

      console.log(`   ✅ Handicapping analysis complete - Edge: ${overallHandicappingEdge.toFixed(1)}`);
      return analysis;

    } catch (error) {
      console.error(`❌ Failed to generate handicapping analysis:`, error);
      throw error;
    }
  }

  private async getCriticalInjuries(teamId: number): Promise<any[]> {
    try {
      const criticalInjuries = await db.query.injuries.findMany({
        where: (injuries, { and, eq, gte }) => and(
          eq(injuries.teamId, teamId),
          eq(injuries.status, 'Active'),
          gte(injuries.impactScore, 7) // Only high-impact injuries
        ),
        with: {
          player: true
        }
      });

      return criticalInjuries.map(injury => ({
        playerName: injury.player.name,
        position: injury.player.position,
        injuryType: injury.injuryType,
        severity: injury.severity,
        impactScore: injury.impactScore,
        expectedReturn: injury.expectedReturn
      }));
    } catch (error) {
      console.error(`❌ Failed to get critical injuries:`, error);
      return [];
    }
  }

  private async analyzeKeyPlayerMatchups(gameId: number, homeTeamId: number, awayTeamId: number): Promise<PlayerMatchup[]> {
    try {
      // Get top players for each team by position
      const homeTopPlayers = await this.getTopPlayersByPosition(homeTeamId);
      const awayTopPlayers = await this.getTopPlayersByPosition(awayTeamId);

      const matchups: PlayerMatchup[] = [];

      // QB vs Defense matchup
      if (homeTopPlayers.QB && awayTopPlayers.Defense) {
        matchups.push(await this.analyzeQBvsDefenseMatchup(homeTopPlayers.QB, awayTopPlayers, 'home'));
      }
      if (awayTopPlayers.QB && homeTopPlayers.Defense) {
        matchups.push(await this.analyzeQBvsDefenseMatchup(awayTopPlayers.QB, homeTopPlayers, 'away'));
      }

      // RB vs Run Defense matchup
      if (homeTopPlayers.RB && awayTopPlayers.Defense) {
        matchups.push(await this.analyzeRBvsRunDefenseMatchup(homeTopPlayers.RB, awayTopPlayers, 'home'));
      }
      if (awayTopPlayers.RB && homeTopPlayers.Defense) {
        matchups.push(await this.analyzeRBvsRunDefenseMatchup(awayTopPlayers.RB, homeTopPlayers, 'away'));
      }

      return matchups;
    } catch (error) {
      console.error(`❌ Failed to analyze player matchups:`, error);
      return [];
    }
  }

  private async getTopPlayersByPosition(teamId: number): Promise<{ [position: string]: any }> {
    try {
      const topPlayers: { [position: string]: any } = {};

      // Get top QB
      const qb = await db.query.players.findFirst({
        where: (players, { and, eq }) => and(
          eq(players.teamId, teamId),
          eq(players.position, 'QB')
        ),
        with: {
          stats: {
            where: (playerStats, { eq }) => eq(playerStats.season, 2025),
            limit: 1
          }
        }
      });

      if (qb) topPlayers.QB = qb;

      // Get top RB
      const rb = await db.query.players.findFirst({
        where: (players, { and, eq }) => and(
          eq(players.teamId, teamId),
          eq(players.position, 'RB')
        ),
        with: {
          stats: {
            where: (playerStats, { eq }) => eq(playerStats.season, 2025),
            limit: 1
          }
        }
      });

      if (rb) topPlayers.RB = rb;

      // Get defensive players (simplified - would need more sophisticated analysis)
      const defensivePlayers = await db.query.players.findMany({
        where: (players, { and, eq, inArray }) => and(
          eq(players.teamId, teamId),
          inArray(players.position, ['DL', 'LB', 'DB'])
        ),
        with: {
          stats: {
            where: (playerStats, { eq }) => eq(playerStats.season, 2025),
            limit: 1
          }
        },
        limit: 5
      });

      topPlayers.Defense = defensivePlayers;

      return topPlayers;
    } catch (error) {
      console.error(`❌ Failed to get top players:`, error);
      return {};
    }
  }

  private async analyzeQBvsDefenseMatchup(qb: any, opposingPlayers: any, side: 'home' | 'away'): Promise<PlayerMatchup> {
    // Analyze QB stats vs opposing defense
    const qbStats = qb.stats?.[0];
    const passingYards = qbStats?.passingYards || 0;
    const passingTDs = qbStats?.passingTouchdowns || 0;
    const interceptions = qbStats?.passingInterceptions || 0;

    // Calculate advantage rating based on QB performance and defensive strength
    let advantageRating = 0;
    
    // QB performance factors
    if (passingYards > 3000) advantageRating += 2;
    if (passingTDs > 25) advantageRating += 2;
    if (interceptions < 8) advantageRating += 1;

    // Defensive strength factors (simplified)
    const defenseStrength = opposingPlayers.Defense?.length || 0;
    advantageRating -= Math.min(3, defenseStrength);

    return {
      homePlayer: side === 'home' ? qb : null,
      awayPlayer: side === 'away' ? qb : null,
      matchupType: 'QB vs Defense',
      advantageRating: Math.max(-10, Math.min(10, advantageRating)),
      keyStats: {
        qbPassingYards: passingYards,
        qbTouchdowns: passingTDs,
        qbInterceptions: interceptions
      },
      impactOnGame: 8 // QB matchups are highly impactful
    };
  }

  private async analyzeRBvsRunDefenseMatchup(rb: any, opposingPlayers: any, side: 'home' | 'away'): Promise<PlayerMatchup> {
    const rbStats = rb.stats?.[0];
    const rushingYards = rbStats?.rushingYards || 0;
    const rushingTDs = rbStats?.rushingTouchdowns || 0;
    const yardsPerCarry = rbStats?.yardsPerCarry || 0;

    let advantageRating = 0;
    
    // RB performance factors
    if (rushingYards > 1000) advantageRating += 2;
    if (rushingTDs > 10) advantageRating += 1;
    if (yardsPerCarry > 5.0) advantageRating += 2;

    // Run defense strength (simplified)
    const runDefenseStrength = Math.floor(Math.random() * 4); // Would need actual defensive stats
    advantageRating -= runDefenseStrength;

    return {
      homePlayer: side === 'home' ? rb : null,
      awayPlayer: side === 'away' ? rb : null,
      matchupType: 'RB vs Run Defense',
      advantageRating: Math.max(-10, Math.min(10, advantageRating)),
      keyStats: {
        rbRushingYards: rushingYards,
        rbTouchdowns: rushingTDs,
        rbYardsPerCarry: yardsPerCarry
      },
      impactOnGame: 6 // RB matchups are moderately impactful
    };
  }

  private async calculateDepthChartImpact(homeTeamId: number, awayTeamId: number): Promise<{
    home: { [position: string]: number };
    away: { [position: string]: number };
  }> {
    // Simplified depth chart impact - would need actual depth chart data
    return {
      home: {
        'QB': 8,
        'RB': 6,
        'WR': 5,
        'Defense': 7
      },
      away: {
        'QB': 7,
        'RB': 7,
        'WR': 6,
        'Defense': 6
      }
    };
  }

  private calculateOverallEdge(
    homeInjuryImpact: any,
    awayInjuryImpact: any,
    keyPlayerMatchups: PlayerMatchup[],
    depthChartImpact: any
  ): number {
    let edge = 0;

    // Injury impact differential
    const injuryDifferential = awayInjuryImpact.totalImpact - homeInjuryImpact.totalImpact;
    edge += injuryDifferential * 0.3; // 30% weight

    // Player matchup advantages
    const matchupAdvantage = keyPlayerMatchups.reduce((sum, matchup) => {
      return sum + (matchup.advantageRating * matchup.impactOnGame * 0.1);
    }, 0);
    edge += matchupAdvantage;

    // Depth chart differential (simplified)
    const homeDepthScore = Object.values(depthChartImpact.home).reduce((sum: number, val: any) => sum + val, 0);
    const awayDepthScore = Object.values(depthChartImpact.away).reduce((sum: number, val: any) => sum + val, 0);
    edge += (homeDepthScore - awayDepthScore) * 0.1;

    return Math.max(-10, Math.min(10, edge));
  }

  private generateKeyFactors(
    homeInjuryImpact: any,
    awayInjuryImpact: any,
    homeCriticalInjuries: any[],
    awayCriticalInjuries: any[],
    keyPlayerMatchups: PlayerMatchup[]
  ): string[] {
    const factors: string[] = [];

    // Critical injury factors
    if (homeCriticalInjuries.length > 0) {
      factors.push(`Home team missing ${homeCriticalInjuries.length} key player(s)`);
    }
    if (awayCriticalInjuries.length > 0) {
      factors.push(`Away team missing ${awayCriticalInjuries.length} key player(s)`);
    }

    // Health differential
    const healthDiff = homeInjuryImpact.overallHealthScore - awayInjuryImpact.overallHealthScore;
    if (Math.abs(healthDiff) > 2) {
      factors.push(
        healthDiff > 0 
          ? 'Home team significantly healthier'
          : 'Away team significantly healthier'
      );
    }

    // Player matchup advantages
    keyPlayerMatchups.forEach(matchup => {
      if (Math.abs(matchup.advantageRating) >= 3) {
        factors.push(`${matchup.matchupType} favors ${matchup.advantageRating > 0 ? 'home' : 'away'} team`);
      }
    });

    return factors;
  }

  private calculateConfidenceLevel(
    homeInjuryImpact: any,
    awayInjuryImpact: any,
    matchupCount: number
  ): number {
    let confidence = 5; // Base confidence

    // More data = higher confidence
    confidence += Math.min(3, matchupCount);

    // Clear injury advantages increase confidence
    const injuryDifferential = Math.abs(homeInjuryImpact.totalImpact - awayInjuryImpact.totalImpact);
    if (injuryDifferential > 10) confidence += 2;

    return Math.max(1, Math.min(10, confidence));
  }
}

// Export singleton instance
export const handicappingEngine = new HandicappingEngine();