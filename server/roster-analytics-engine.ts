/**
 * Roster Analytics Engine
 * Implements player efficiency, team efficiency, and momentum analysis
 * Target: +1.3 points improvement (0.6 + 0.4 + 0.3) for 54.2% ATS
 */

import { db } from './db';
import { teams, games } from '../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

interface PlayerRating {
  name: string;
  position: string;
  team: string;
  gameRating: number; // 1-100 video game style
  usageRate: number;  // 0-1 snap percentage
  stars: number;      // 1-5 recruiting stars
}

interface TeamRosterStrength {
  teamId: number;
  teamName: string;
  totalTalent: number;
  averageRating: number;
  topPlayerCount: number;
  keyPlayerRatings: {
    qb: number;
    offense: number;
    defense: number;
  };
}

interface MomentumAnalysis {
  teamId: number;
  last3GamesPPG: number;
  last3GamesATS: number;
  trendDirection: 'up' | 'down' | 'stable';
  momentumScore: number; // -5 to +5
}

export class RosterAnalyticsEngine {
  
  /**
   * Calculate comprehensive analytics for a game
   * Returns player efficiency, team efficiency, and momentum scores
   */
  async calculateGameAnalytics(gameId: number): Promise<{
    playerEfficiency: number;    // -10 to +10
    teamEfficiency: number;      // -10 to +10
    momentum: number;            // -5 to +5
    confidence: number;          // 0-1
  }> {
    
    const game = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
    if (game.length === 0) throw new Error('Game not found');
    
    const gameData = game[0];
    
    // Get team data
    const [homeTeam, awayTeam] = await Promise.all([
      db.select().from(teams).where(eq(teams.id, gameData.homeTeamId)).limit(1),
      db.select().from(teams).where(eq(teams.id, gameData.awayTeamId)).limit(1)
    ]);
    
    if (homeTeam.length === 0 || awayTeam.length === 0) {
      throw new Error('Teams not found');
    }
    
    // Calculate all three analytics components
    const [playerEff, teamEff, momentum] = await Promise.all([
      this.calculatePlayerEfficiency(homeTeam[0].name, awayTeam[0].name),
      this.calculateTeamEfficiency(homeTeam[0].name, awayTeam[0].name),
      this.calculateMomentum(gameData.homeTeamId, gameData.awayTeamId, gameData.season)
    ]);
    
    // Calculate overall confidence based on data quality
    const confidence = this.calculateConfidence(playerEff, teamEff, momentum);
    
    return {
      playerEfficiency: playerEff.differential,
      teamEfficiency: teamEff.differential,
      momentum: momentum.differential,
      confidence
    };
  }
  
  /**
   * Player Efficiency Analysis (+0.6 points target)
   * Uses recruiting ratings and current usage data
   */
  private async calculatePlayerEfficiency(homeTeam: string, awayTeam: string): Promise<{
    differential: number;
    homeStrength: number;
    awayStrength: number;
  }> {
    
    console.log(`🏈 Calculating player efficiency: ${homeTeam} vs ${awayTeam}`);
    
    try {
      // Get roster strength for both teams
      const [homeRoster, awayRoster] = await Promise.all([
        this.getTeamRosterStrength(homeTeam),
        this.getTeamRosterStrength(awayTeam)
      ]);
      
      // Calculate key position advantages
      const qbAdvantage = homeRoster.keyPlayerRatings.qb - awayRoster.keyPlayerRatings.qb;
      const offenseAdvantage = homeRoster.keyPlayerRatings.offense - awayRoster.keyPlayerRatings.offense;
      const defenseAdvantage = homeRoster.keyPlayerRatings.defense - awayRoster.keyPlayerRatings.defense;
      
      // Weight by position importance (QB = 40%, Offense = 35%, Defense = 25%)
      const homeStrength = (homeRoster.keyPlayerRatings.qb * 0.4) + 
                          (homeRoster.keyPlayerRatings.offense * 0.35) + 
                          (homeRoster.keyPlayerRatings.defense * 0.25);
                          
      const awayStrength = (awayRoster.keyPlayerRatings.qb * 0.4) + 
                          (awayRoster.keyPlayerRatings.offense * 0.35) + 
                          (awayRoster.keyPlayerRatings.defense * 0.25);
      
      // Convert to point differential (-10 to +10 scale)
      const rawDifferential = homeStrength - awayStrength;
      const differential = Math.max(-10, Math.min(10, rawDifferential / 8)); // Scale down
      
      console.log(`   Player efficiency differential: ${differential.toFixed(2)}`);
      
      return {
        differential,
        homeStrength,
        awayStrength
      };
      
    } catch (error) {
      console.log(`   Player efficiency calculation failed: ${error}`);
      return { differential: 0, homeStrength: 50, awayStrength: 50 };
    }
  }
  
  /**
   * Team Efficiency Analysis (+0.4 points target)
   * Uses roster talent rankings and recruiting composite scores
   */
  private async calculateTeamEfficiency(homeTeam: string, awayTeam: string): Promise<{
    differential: number;
    homeTalent: number;
    awayTalent: number;
  }> {
    
    console.log(`📊 Calculating team efficiency: ${homeTeam} vs ${awayTeam}`);
    
    try {
      // Get recruiting-based team talent over multiple years
      const [homeTalent, awayTalent] = await Promise.all([
        this.getTeamTalentComposite(homeTeam),
        this.getTeamTalentComposite(awayTeam)
      ]);
      
      // Calculate talent differential
      const rawDifferential = homeTalent - awayTalent;
      const differential = Math.max(-10, Math.min(10, rawDifferential / 1000)); // Scale to ±10
      
      console.log(`   Team efficiency differential: ${differential.toFixed(2)}`);
      
      return {
        differential,
        homeTalent,
        awayTalent
      };
      
    } catch (error) {
      console.log(`   Team efficiency calculation failed: ${error}`);
      return { differential: 0, homeTalent: 3000, awayTalent: 3000 };
    }
  }
  
  /**
   * Momentum Analysis (+0.3 points target)
   * Uses recent game performance and ATS trends
   */
  private async calculateMomentum(homeTeamId: number, awayTeamId: number, season: number): Promise<{
    differential: number;
    homeMomentum: number;
    awayMomentum: number;
  }> {
    
    console.log(`🚀 Calculating momentum analysis`);
    
    try {
      // Get recent games for both teams (last 3 games)
      const [homeMomentum, awayMomentum] = await Promise.all([
        this.getTeamMomentum(homeTeamId, season),
        this.getTeamMomentum(awayTeamId, season)
      ]);
      
      const differential = homeMomentum.momentumScore - awayMomentum.momentumScore;
      
      console.log(`   Momentum differential: ${differential.toFixed(2)}`);
      
      return {
        differential,
        homeMomentum: homeMomentum.momentumScore,
        awayMomentum: awayMomentum.momentumScore
      };
      
    } catch (error) {
      console.log(`   Momentum calculation failed: ${error}`);
      return { differential: 0, homeMomentum: 0, awayMomentum: 0 };
    }
  }
  
  /**
   * Get team roster strength using recruiting data
   */
  private async getTeamRosterStrength(teamName: string): Promise<TeamRosterStrength> {
    
    // Aggregate recruiting data from 2022-2024 (current players)
    const years = [2022, 2023, 2024];
    let totalTalent = 0;
    let playerCount = 0;
    let topPlayerCount = 0;
    
    const positionRatings = {
      qb: [] as number[],
      offense: [] as number[],
      defense: [] as number[]
    };
    
    for (const year of years) {
      try {
        const response = await fetch(`${BASE_URL}/recruiting/players?year=${year}&team=${encodeURIComponent(teamName)}`, {
          headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
        });
        
        if (response.ok) {
          const players = await response.json();
          
          for (const player of players) {
            const stars = player.stars || 2;
            const rating = player.rating || 0.5;
            
            // Convert to video game rating (1-100)
            let gameRating = 50;
            if (stars === 5) gameRating = 90 + Math.floor(rating * 9);
            else if (stars === 4) gameRating = 80 + Math.floor(rating * 9);
            else if (stars === 3) gameRating = 65 + Math.floor(rating * 14);
            else gameRating = 50 + Math.floor(rating * 14);
            
            totalTalent += stars * 20;
            playerCount++;
            if (stars >= 4) topPlayerCount++;
            
            // Categorize by position group
            if (player.position === 'QB') {
              positionRatings.qb.push(gameRating);
            } else if (['RB', 'WR', 'TE', 'OL'].includes(player.position)) {
              positionRatings.offense.push(gameRating);
            } else {
              positionRatings.defense.push(gameRating);
            }
          }
        }
      } catch (error) {
        // Continue with other years
      }
    }
    
    // Calculate position group averages
    const qbRating = positionRatings.qb.length > 0 
      ? positionRatings.qb.reduce((a, b) => a + b, 0) / positionRatings.qb.length 
      : 65;
      
    const offenseRating = positionRatings.offense.length > 0
      ? positionRatings.offense.reduce((a, b) => a + b, 0) / positionRatings.offense.length
      : 65;
      
    const defenseRating = positionRatings.defense.length > 0
      ? positionRatings.defense.reduce((a, b) => a + b, 0) / positionRatings.defense.length
      : 65;
    
    return {
      teamId: 0, // Will be filled by caller
      teamName,
      totalTalent,
      averageRating: playerCount > 0 ? totalTalent / playerCount : 60,
      topPlayerCount,
      keyPlayerRatings: {
        qb: qbRating,
        offense: offenseRating,
        defense: defenseRating
      }
    };
  }
  
  /**
   * Get team talent composite score
   */
  private async getTeamTalentComposite(teamName: string): Promise<number> {
    const roster = await this.getTeamRosterStrength(teamName);
    return roster.totalTalent;
  }
  
  /**
   * Get team momentum based on recent performance
   */
  private async getTeamMomentum(teamId: number, season: number): Promise<MomentumAnalysis> {
    
    // Get last 3 completed games
    const recentGames = await db
      .select()
      .from(games)
      .where(and(
        eq(games.season, season),
        eq(games.completed, true),
        sql`(${games.homeTeamId} = ${teamId} OR ${games.awayTeamId} = ${teamId})`
      ))
      .orderBy(desc(games.week))
      .limit(3);
    
    if (recentGames.length === 0) {
      return {
        teamId,
        last3GamesPPG: 25,
        last3GamesATS: 0,
        trendDirection: 'stable',
        momentumScore: 0
      };
    }
    
    let totalPoints = 0;
    let atsRecord = 0;
    
    for (const game of recentGames) {
      const isHome = game.homeTeamId === teamId;
      const teamScore = isHome ? game.homeTeamScore || 0 : game.awayTeamScore || 0;
      const opponentScore = isHome ? game.awayTeamScore || 0 : game.homeTeamScore || 0;
      
      totalPoints += teamScore;
      
      // Calculate ATS performance if spread available
      if (game.homeSpread !== null) {
        const spread = isHome ? -game.homeSpread : game.homeSpread;
        const margin = teamScore - opponentScore;
        const atsMargin = margin - spread;
        
        if (atsMargin > 0) atsRecord += 1;
        else if (atsMargin === 0) atsRecord += 0.5;
      }
    }
    
    const ppg = totalPoints / recentGames.length;
    const atsPercentage = recentGames.length > 0 ? atsRecord / recentGames.length : 0.5;
    
    // Calculate momentum score (-5 to +5)
    let momentumScore = 0;
    
    // PPG factor
    if (ppg > 35) momentumScore += 2;
    else if (ppg > 28) momentumScore += 1;
    else if (ppg < 14) momentumScore -= 2;
    else if (ppg < 21) momentumScore -= 1;
    
    // ATS factor
    if (atsPercentage >= 0.67) momentumScore += 2; // 2-1 or 3-0
    else if (atsPercentage >= 0.5) momentumScore += 1;
    else if (atsPercentage <= 0.33) momentumScore -= 2; // 1-2 or 0-3
    else momentumScore -= 1;
    
    // Trend direction
    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (momentumScore >= 2) trendDirection = 'up';
    else if (momentumScore <= -2) trendDirection = 'down';
    
    return {
      teamId,
      last3GamesPPG: ppg,
      last3GamesATS: atsRecord,
      trendDirection,
      momentumScore: Math.max(-5, Math.min(5, momentumScore))
    };
  }
  
  /**
   * Calculate confidence based on data quality
   */
  private calculateConfidence(playerEff: any, teamEff: any, momentum: any): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence if we have strong differentials
    const totalDifferential = Math.abs(playerEff.differential) + 
                             Math.abs(teamEff.differential) + 
                             Math.abs(momentum.differential);
    
    if (totalDifferential > 8) confidence = 0.9;
    else if (totalDifferential > 5) confidence = 0.8;
    else if (totalDifferential > 3) confidence = 0.7;
    else if (totalDifferential > 1) confidence = 0.6;
    
    return Math.min(0.95, confidence);
  }
}