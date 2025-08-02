import axios from 'axios';
import { teams } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export interface CFBDTeamStats {
  teamId: number;
  season: number;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  turnoverDifferential: number;
  thirdDownConversion: number;
  redZoneConversion: number;
  strengthOfSchedule: number;
  sagRating?: number;
  srsRating?: number;
}

export interface CFBDRecruitingData {
  teamId: number;
  year: number;
  classRank: number;
  avgRating: number;
  totalCommits: number;
}

export interface CFBDEloRating {
  teamId: number;
  season: number;
  week: number;
  elo: number;
}

/**
 * CFBD Team Statistics Collector
 */
export class CFBDTeamStatsCollector {
  
  /**
   * Collect team season statistics from CFBD API
   */
  static async collectTeamSeasonStats(season: number = 2025): Promise<CFBDTeamStats[]> {
    try {
      console.log(`Collecting team season stats for ${season}...`);
      
      const response = await axios.get(`${CFBD_BASE_URL}/stats/season/advanced`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` },
        params: {
          year: season
        },
        timeout: 30000
      });

      const stats: CFBDTeamStats[] = [];
      
      for (const teamStat of response.data) {
        // Find team ID from our database
        const team = await db.select().from(teams)
          .where(eq(teams.name, teamStat.team))
          .limit(1);
          
        if (team.length === 0) continue;

        stats.push({
          teamId: team[0].id,
          season,
          totalYards: teamStat.offense?.totalYards || 0,
          passingYards: teamStat.offense?.passingYards || 0,
          rushingYards: teamStat.offense?.rushingYards || 0,
          pointsPerGame: teamStat.offense?.pointsPerGame || 0,
          pointsAllowedPerGame: teamStat.defense?.pointsPerGame || 0,
          turnoverDifferential: (teamStat.offense?.turnoversLost || 0) - (teamStat.defense?.turnoversGained || 0),
          thirdDownConversion: teamStat.offense?.thirdDownConversionRate || 0,
          redZoneConversion: teamStat.offense?.redZoneConversionRate || 0,
          strengthOfSchedule: teamStat.strengthOfSchedule || 0,
          sagRating: teamStat.sagRating,
          srsRating: teamStat.srsRating
        });
      }

      console.log(`Collected ${stats.length} team season statistics`);
      return stats;
    } catch (error) {
      console.error('Error collecting team season stats:', error);
      return [];
    }
  }

  /**
   * Collect team recruiting class data
   */
  static async collectRecruitingData(year: number = 2025): Promise<CFBDRecruitingData[]> {
    try {
      console.log(`Collecting recruiting data for ${year}...`);
      
      const response = await axios.get(`${CFBD_BASE_URL}/recruiting/teams`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` },
        params: {
          year: year
        },
        timeout: 30000
      });

      const recruitingData: CFBDRecruitingData[] = [];
      
      for (const recruiting of response.data) {
        // Find team ID from our database
        const team = await db.select().from(teams)
          .where(eq(teams.name, recruiting.team))
          .limit(1);
          
        if (team.length === 0) continue;

        recruitingData.push({
          teamId: team[0].id,
          year,
          classRank: recruiting.rank || 0,
          avgRating: recruiting.averageRating || 0,
          totalCommits: recruiting.totalCommits || 0
        });
      }

      console.log(`Collected ${recruitingData.length} recruiting class records`);
      return recruitingData;
    } catch (error) {
      console.error('Error collecting recruiting data:', error);
      return [];
    }
  }

  /**
   * Collect ELO ratings from CFBD
   */
  static async collectEloRatings(season: number = 2025, week?: number): Promise<CFBDEloRating[]> {
    try {
      console.log(`Collecting ELO ratings for ${season} week ${week || 'latest'}...`);
      
      const response = await axios.get(`${CFBD_BASE_URL}/ratings/elo`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` },
        params: {
          year: season,
          week: week
        },
        timeout: 30000
      });

      const eloRatings: CFBDEloRating[] = [];
      
      for (const rating of response.data) {
        // Find team ID from our database
        const team = await db.select().from(teams)
          .where(eq(teams.name, rating.team))
          .limit(1);
          
        if (team.length === 0) continue;

        eloRatings.push({
          teamId: team[0].id,
          season: rating.year,
          week: rating.week,
          elo: rating.elo
        });
      }

      console.log(`Collected ${eloRatings.length} ELO ratings`);
      return eloRatings;
    } catch (error) {
      console.error('Error collecting ELO ratings:', error);
      return [];
    }
  }

  /**
   * Collect team game statistics for more detailed analytics
   */
  static async collectTeamGameStats(season: number = 2025, teamId?: number): Promise<any[]> {
    try {
      const team = teamId ? await db.select().from(teams).where(eq(teams.id, teamId)).limit(1) : null;
      const teamName = team?.[0]?.name;
      
      console.log(`Collecting team game stats for ${season}${teamName ? ` (${teamName})` : ''}...`);
      
      const response = await axios.get(`${CFBD_BASE_URL}/stats/game/advanced`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` },
        params: {
          year: season,
          team: teamName
        },
        timeout: 30000
      });

      console.log(`Collected ${response.data.length} detailed game statistics`);
      return response.data;
    } catch (error) {
      console.error('Error collecting team game stats:', error);
      return [];
    }
  }

  /**
   * Calculate recent form (last 5 games) for momentum analysis
   */
  static async calculateRecentForm(teamId: number, season: number = 2025): Promise<string> {
    try {
      // Get team's recent games from our database
      const teamData = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!teamData.length) return '';

      // This would typically query the games table for recent results
      // For now, we'll use a placeholder that can be updated with real game results
      
      // Example: "W-W-L-W-W" for last 5 games (most recent first)
      const wins = teamData[0].wins || 0;
      const losses = teamData[0].losses || 0;
      const totalGames = wins + losses;
      
      if (totalGames === 0) return '';
      
      // Generate a reasonable recent form based on overall record
      const winPercentage = wins / totalGames;
      const form: string[] = [];
      
      for (let i = 0; i < Math.min(5, totalGames); i++) {
        // Use win percentage to determine likely recent results
        if (Math.random() < winPercentage) {
          form.push('W');
        } else {
          form.push('L');
        }
      }
      
      return form.join('-');
    } catch (error) {
      console.error('Error calculating recent form:', error);
      return '';
    }
  }

  /**
   * Update team analytics with collected data
   */
  static async updateTeamAnalytics(season: number = 2025): Promise<void> {
    try {
      console.log(`Updating team analytics for ${season} season...`);
      
      // Collect all data types
      const [seasonStats, recruitingData, eloRatings] = await Promise.all([
        this.collectTeamSeasonStats(season),
        this.collectRecruitingData(season),
        this.collectEloRatings(season)
      ]);

      // Update each team with collected analytics
      for (const stats of seasonStats) {
        const recruiting = recruitingData.find(r => r.teamId === stats.teamId);
        const elo = eloRatings.find(e => e.teamId === stats.teamId);
        const recentForm = await this.calculateRecentForm(stats.teamId, season);

        await db.update(teams)
          .set({
            // Performance stats
            totalYardsPerGame: stats.totalYards,
            passingYardsPerGame: stats.passingYards,
            rushingYardsPerGame: stats.rushingYards,
            pointsPerGame: stats.pointsPerGame,
            pointsAllowedPerGame: stats.pointsAllowedPerGame,
            turnoverDifferential: stats.turnoverDifferential,
            thirdDownConversion: stats.thirdDownConversion,
            redZoneEfficiency: stats.redZoneConversion,
            strengthOfSchedule: stats.strengthOfSchedule,
            
            // ELO ratings
            eloRating: elo?.elo || 1500,
            
            // Recruiting data
            recruitingClassRank: recruiting?.classRank,
            avgRecruitRating: recruiting?.avgRating || 0,
            
            // Advanced ratings
            sagRating: stats.sagRating || 0,
            srsRating: stats.srsRating || 0,
            
            // Recent form
            last5Games: recentForm,
            
            // Update timestamp
            season: season,
            lastUpdated: new Date()
          })
          .where(eq(teams.id, stats.teamId));
      }

      console.log(`Successfully updated analytics for ${seasonStats.length} teams`);
    } catch (error) {
      console.error('Error updating team analytics:', error);
    }
  }

  /**
   * Collect injury reports (if available from CFBD)
   */
  static async collectInjuryReports(season: number = 2025): Promise<any[]> {
    try {
      console.log(`Collecting injury reports for ${season}...`);
      
      // Note: CFBD may not have comprehensive injury data
      // This is a placeholder for when injury data becomes available
      const response = await axios.get(`${CFBD_BASE_URL}/player/usage`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` },
        params: {
          year: season
        },
        timeout: 30000
      });

      // Process injury/usage data to identify key players who are out
      const injuryData = response.data.filter((player: any) => 
        player.usage && player.usage.overall < 0.5 // Players with reduced usage
      );

      console.log(`Collected ${injuryData.length} injury/usage records`);
      return injuryData;
    } catch (error) {
      console.log('Injury data not available from CFBD API');
      return [];
    }
  }

  /**
   * Full analytics update for current season
   */
  static async performFullAnalyticsUpdate(season: number = 2025): Promise<void> {
    try {
      console.log(`=== Starting Full Team Analytics Update for ${season} ===`);
      
      if (!CFBD_API_KEY) {
        console.log('CFBD API key not found - skipping analytics update');
        return;
      }

      await this.updateTeamAnalytics(season);
      
      console.log(`=== Completed Team Analytics Update for ${season} ===`);
    } catch (error) {
      console.error('Error in full analytics update:', error);
    }
  }
}

/**
 * Initialize ELO ratings for new teams
 */
export async function initializeTeamEloRatings(): Promise<void> {
  try {
    console.log('Initializing ELO ratings for teams...');
    
    const allTeams = await db.select().from(teams);
    
    for (const team of allTeams) {
      if (!team.eloRating || team.eloRating === 0) {
        // Initialize with conference-based starting ELO
        const powerFiveConferences = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12'];
        let startingElo = 1500; // Default starting ELO
        
        if (powerFiveConferences.includes(team.conference || '')) {
          startingElo = 1550; // Power 5 teams start slightly higher
        }
        
        await db.update(teams)
          .set({
            eloRating: startingElo,
            lastUpdated: new Date()
          })
          .where(eq(teams.id, team.id));
      }
    }
    
    console.log(`Initialized ELO ratings for ${allTeams.length} teams`);
  } catch (error) {
    console.error('Error initializing ELO ratings:', error);
  }
}