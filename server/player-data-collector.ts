import { db } from './db';
import { players, playerStats, injuries, depthChart, playerImpactAnalysis } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface CFBDPlayer {
  id: number;
  team: string;
  name: string;
  first_name: string;
  last_name: string;
  position: string;
  jersey?: number;
  year?: number;
  height?: number;
  weight?: number;
  home_city?: string;
  home_state?: string;
  home_country?: string;
}

interface CFBDPlayerStats {
  playerId: number;
  season: number;
  team: string;
  category: string;
  statType: string;
  stat: number;
}

interface CFBDInjuryReport {
  season: number;
  week: number;
  team: string;
  player: string;
  position: string;
  injury_type: string;
  injury_status: string;
  details?: string;
}

export class PlayerDataCollector {
  private readonly CFBD_API_KEY = process.env.CFBD_API_KEY;
  private readonly BASE_URL = 'https://api.collegefootballdata.com';

  async collectTeamRoster(teamName: string, season: number = 2025): Promise<void> {
    console.log(`🏈 Collecting roster for ${teamName} (${season})`);
    
    try {
      const response = await fetch(
        `${this.BASE_URL}/roster?team=${encodeURIComponent(teamName)}&year=${season}`,
        {
          headers: { 'Authorization': `Bearer ${this.CFBD_API_KEY}` }
        }
      );

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status}`);
      }

      const rosterData: CFBDPlayer[] = await response.json();
      console.log(`   Found ${rosterData.length} players`);

      // Get team ID from our database
      const teamQuery = await db.query.teams.findFirst({
        where: (teams, { eq }) => eq(teams.name, teamName)
      });

      if (!teamQuery) {
        console.log(`   ❌ Team ${teamName} not found in database`);
        return;
      }

      let playersAdded = 0;
      let playersUpdated = 0;

      for (const player of rosterData) {
        try {
          // Check if player exists
          const existingPlayer = await db.query.players.findFirst({
            where: (players, { and, eq }) => and(
              eq(players.teamId, teamQuery.id),
              eq(players.name, `${player.first_name} ${player.last_name}`)
            )
          });

          const playerData = {
            teamId: teamQuery.id,
            name: `${player.first_name} ${player.last_name}`,
            position: player.position,
            number: player.jersey || null,
            year: player.year ? this.convertYear(player.year) : null,
            height: player.height ? this.formatHeight(player.height) : null,
            weight: player.weight || null,
            hometown: player.home_city && player.home_state 
              ? `${player.home_city}, ${player.home_state}` 
              : null,
            active: true
          };

          if (existingPlayer) {
            await db.update(players)
              .set(playerData)
              .where(eq(players.id, existingPlayer.id));
            playersUpdated++;
          } else {
            await db.insert(players).values(playerData);
            playersAdded++;
          }
        } catch (err) {
          console.log(`   Skip player ${player.first_name} ${player.last_name}: ${err.message}`);
        }
      }

      console.log(`   ✅ Added ${playersAdded} players, updated ${playersUpdated} players`);
    } catch (error) {
      console.error(`❌ Roster collection failed for ${teamName}:`, error);
    }
  }

  async collectPlayerStats(teamName: string, season: number = 2025): Promise<void> {
    console.log(`📊 Collecting player stats for ${teamName} (${season})`);

    try {
      const response = await fetch(
        `${this.BASE_URL}/stats/player/season?team=${encodeURIComponent(teamName)}&year=${season}`,
        {
          headers: { 'Authorization': `Bearer ${this.CFBD_API_KEY}` }
        }
      );

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status}`);
      }

      const statsData: CFBDPlayerStats[] = await response.json();
      console.log(`   Found ${statsData.length} stat records`);

      let statsAdded = 0;

      for (const statRecord of statsData) {
        try {
          // Find player in our database
          const player = await db.query.players.findFirst({
            where: (players, { and, eq }) => and(
              eq(players.name, statRecord.playerId.toString()), // This might need adjustment based on API response
              eq(players.teamId, teamName) // This needs team ID lookup
            )
          });

          if (!player) continue;

          // Convert CFBD stats to our schema
          const statsData = this.convertStatsToSchema(statRecord);
          
          await db.insert(playerStats).values({
            playerId: player.id,
            season: season,
            ...statsData
          });

          statsAdded++;
        } catch (err) {
          console.log(`   Skip stat record: ${err.message}`);
        }
      }

      console.log(`   ✅ Added ${statsAdded} stat records`);
    } catch (error) {
      console.error(`❌ Stats collection failed for ${teamName}:`, error);
    }
  }

  async collectInjuryReports(season: number = 2025, week?: number): Promise<void> {
    console.log(`🏥 Collecting injury reports for ${season}${week ? ` Week ${week}` : ''}`);

    try {
      const url = week 
        ? `${this.BASE_URL}/player/usage?year=${season}&week=${week}`
        : `${this.BASE_URL}/player/usage?year=${season}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.CFBD_API_KEY}` }
      });

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status}`);
      }

      // Note: CFBD doesn't have direct injury endpoint, so we'll need to supplement
      // with other sources or create a manual injury tracking system
      console.log(`   ⚠️  CFBD doesn't provide direct injury data - implementing manual tracking`);
      
    } catch (error) {
      console.error(`❌ Injury collection failed:`, error);
    }
  }

  private convertYear(year: number): string {
    switch (year) {
      case 1: return 'Freshman';
      case 2: return 'Sophomore';
      case 3: return 'Junior';
      case 4: return 'Senior';
      case 5: return 'Graduate';
      default: return 'Unknown';
    }
  }

  private formatHeight(heightInches: number): string {
    const feet = Math.floor(heightInches / 12);
    const inches = heightInches % 12;
    return `${feet}'${inches}"`;
  }

  private convertStatsToSchema(statRecord: CFBDPlayerStats): any {
    // Convert CFBD stat categories to our schema fields
    const stats: any = {};

    switch (statRecord.category) {
      case 'passing':
        if (statRecord.statType === 'YDS') stats.passingYards = statRecord.stat;
        if (statRecord.statType === 'ATT') stats.passingAttempts = statRecord.stat;
        if (statRecord.statType === 'CMP') stats.passingCompletions = statRecord.stat;
        if (statRecord.statType === 'TD') stats.passingTouchdowns = statRecord.stat;
        if (statRecord.statType === 'INT') stats.passingInterceptions = statRecord.stat;
        break;
      case 'rushing':
        if (statRecord.statType === 'YDS') stats.rushingYards = statRecord.stat;
        if (statRecord.statType === 'ATT') stats.rushingAttempts = statRecord.stat;
        if (statRecord.statType === 'TD') stats.rushingTouchdowns = statRecord.stat;
        break;
      case 'receiving':
        if (statRecord.statType === 'YDS') stats.receivingYards = statRecord.stat;
        if (statRecord.statType === 'REC') stats.receptions = statRecord.stat;
        if (statRecord.statType === 'TD') stats.receivingTouchdowns = statRecord.stat;
        break;
      case 'defensive':
        if (statRecord.statType === 'TACKLES') stats.tackles = statRecord.stat;
        if (statRecord.statType === 'SACKS') stats.sacks = statRecord.stat;
        if (statRecord.statType === 'INT') stats.interceptions = statRecord.stat;
        if (statRecord.statType === 'PB') stats.passBreakups = statRecord.stat;
        break;
    }

    return stats;
  }

  async calculatePlayerImpact(playerId: number): Promise<void> {
    console.log(`⚡ Calculating impact analysis for player ${playerId}`);

    try {
      const player = await db.query.players.findFirst({
        where: (players, { eq }) => eq(players.id, playerId),
        with: {
          stats: true,
          team: true
        }
      });

      if (!player) return;

      // Calculate impact rating based on position and stats
      const impactRating = this.calculateImpactRating(player);
      const positionImpacts = this.calculatePositionImpacts(player);

      await db.insert(playerImpactAnalysis).values({
        playerId: playerId,
        teamId: player.teamId,
        impactRating: impactRating,
        offensiveImpact: positionImpacts.offensive,
        defensiveImpact: positionImpacts.defensive,
        specialTeamsImpact: positionImpacts.specialTeams,
        replacementPlayerRating: this.calculateReplacementValue(player),
        keyStats: this.identifyKeyStats(player),
        weeklyTrend: 'Stable', // Would need historical data for real trend
        season: 2025
      });

      console.log(`   ✅ Impact analysis complete for ${player.name}`);
    } catch (error) {
      console.error(`❌ Impact calculation failed:`, error);
    }
  }

  private calculateImpactRating(player: any): number {
    // Position-based impact scoring
    const positionWeights: { [key: string]: number } = {
      'QB': 10, 'RB': 7, 'WR': 6, 'TE': 5,
      'OL': 6, 'DL': 6, 'LB': 7, 'DB': 6,
      'K': 3, 'P': 2
    };

    const baseRating = positionWeights[player.position] || 5;
    
    // Adjust based on stats performance
    let statModifier = 0;
    if (player.stats?.length > 0) {
      const latestStats = player.stats[0];
      
      // QB rating boost
      if (player.position === 'QB' && latestStats.passingYards > 3000) {
        statModifier += 2;
      }
      
      // RB rating boost  
      if (player.position === 'RB' && latestStats.rushingYards > 1000) {
        statModifier += 2;
      }
    }

    return Math.min(10, Math.max(1, baseRating + statModifier));
  }

  private calculatePositionImpacts(player: any): {
    offensive: number;
    defensive: number;
    specialTeams: number;
  } {
    const offensivePositions = ['QB', 'RB', 'WR', 'TE', 'OL'];
    const defensivePositions = ['DL', 'LB', 'DB'];
    const specialTeamsPositions = ['K', 'P'];

    return {
      offensive: offensivePositions.includes(player.position) ? 8 : 0,
      defensive: defensivePositions.includes(player.position) ? 8 : 0,
      specialTeams: specialTeamsPositions.includes(player.position) ? 8 : 1
    };
  }

  private calculateReplacementValue(player: any): number {
    // Simplified replacement value - would need depth chart data for accuracy
    const starterValue = 7;
    const backupValue = 4;
    
    return player.isStarter ? starterValue : backupValue;
  }

  private identifyKeyStats(player: any): string[] {
    const keyStats: string[] = [];
    
    if (player.position === 'QB') {
      keyStats.push('Passing Yards', 'Completion %', 'TD/INT Ratio');
    } else if (player.position === 'RB') {
      keyStats.push('Rushing Yards', 'YPC', 'Rushing TDs');
    } else if (player.position === 'WR') {
      keyStats.push('Receiving Yards', 'Receptions', 'YAC');
    }
    
    return keyStats;
  }
}

// Export singleton instance
export const playerDataCollector = new PlayerDataCollector();