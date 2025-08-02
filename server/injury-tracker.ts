import { db } from './db';
import { injuries, players, teams, depthChart } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface InjuryReport {
  playerName: string;
  teamName: string;
  position: string;
  injuryType: string;
  bodyPart: string;
  severity: 'Questionable' | 'Doubtful' | 'Out' | 'Day-to-Day';
  status: 'Active' | 'Recovered' | 'Season-Ending';
  expectedReturnWeeks?: number;
  impactScore: number; // 1-10 scale
}

export class InjuryTracker {
  
  async addInjuryReport(injuryData: InjuryReport): Promise<void> {
    console.log(`🏥 Adding injury report: ${injuryData.playerName} (${injuryData.injuryType})`);

    try {
      // Find player and team
      const team = await db.query.teams.findFirst({
        where: (teams, { eq }) => eq(teams.name, injuryData.teamName)
      });

      if (!team) {
        throw new Error(`Team ${injuryData.teamName} not found`);
      }

      const player = await db.query.players.findFirst({
        where: (players, { and, eq }) => and(
          eq(players.name, injuryData.playerName),
          eq(players.teamId, team.id)
        )
      });

      if (!player) {
        throw new Error(`Player ${injuryData.playerName} not found`);
      }

      // Calculate expected return date
      let expectedReturn = null;
      if (injuryData.expectedReturnWeeks) {
        expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + (injuryData.expectedReturnWeeks * 7));
      }

      // Add injury record
      await db.insert(injuries).values({
        playerId: player.id,
        teamId: team.id,
        injuryType: injuryData.injuryType,
        bodyPart: injuryData.bodyPart,
        severity: injuryData.severity,
        status: injuryData.status,
        expectedReturn: expectedReturn,
        impactScore: injuryData.impactScore,
        injuryDate: new Date(),
        season: 2025,
        week: this.getCurrentWeek()
      });

      // Update depth chart if player is injured
      if (injuryData.severity === 'Out' || injuryData.status === 'Season-Ending') {
        await this.updateDepthChart(player.id, team.id, true);
      }

      console.log(`   ✅ Injury report added for ${injuryData.playerName}`);
    } catch (error) {
      console.error(`❌ Failed to add injury report:`, error);
    }
  }

  async getTeamInjuryReport(teamId: number): Promise<any[]> {
    try {
      const injuryReport = await db.query.injuries.findMany({
        where: (injuries, { and, eq }) => and(
          eq(injuries.teamId, teamId),
          eq(injuries.status, 'Active')
        ),
        with: {
          player: true,
          team: true
        },
        orderBy: (injuries, { desc }) => [desc(injuries.impactScore)]
      });

      return injuryReport.map(injury => ({
        id: injury.id,
        playerName: injury.player.name,
        position: injury.player.position,
        injuryType: injury.injuryType,
        bodyPart: injury.bodyPart,
        severity: injury.severity,
        status: injury.status,
        gamesMissed: injury.gamesMissed,
        impactScore: injury.impactScore,
        expectedReturn: injury.expectedReturn,
        injuryDate: injury.injuryDate
      }));
    } catch (error) {
      console.error(`❌ Failed to get injury report:`, error);
      return [];
    }
  }

  async updateInjuryStatus(injuryId: number, newStatus: string, newSeverity?: string): Promise<void> {
    try {
      const updateData: any = { 
        status: newStatus,
        lastUpdated: new Date()
      };
      
      if (newSeverity) {
        updateData.severity = newSeverity;
      }

      await db.update(injuries)
        .set(updateData)
        .where(eq(injuries.id, injuryId));

      // If player recovered, update depth chart
      if (newStatus === 'Recovered') {
        const injury = await db.query.injuries.findFirst({
          where: (injuries, { eq }) => eq(injuries.id, injuryId)
        });

        if (injury) {
          await this.updateDepthChart(injury.playerId, injury.teamId, false);
        }
      }

      console.log(`   ✅ Updated injury status for injury ID ${injuryId}`);
    } catch (error) {
      console.error(`❌ Failed to update injury status:`, error);
    }
  }

  async calculateTeamInjuryImpact(teamId: number): Promise<{
    totalImpact: number;
    keyPlayersOut: number;
    positionGroups: { [key: string]: number };
    overallHealthScore: number;
  }> {
    try {
      const activeInjuries = await db.query.injuries.findMany({
        where: (injuries, { and, eq }) => and(
          eq(injuries.teamId, teamId),
          eq(injuries.status, 'Active')
        ),
        with: {
          player: true
        }
      });

      let totalImpact = 0;
      let keyPlayersOut = 0;
      const positionGroups: { [key: string]: number } = {
        'Offense': 0,
        'Defense': 0,
        'Special Teams': 0
      };

      for (const injury of activeInjuries) {
        totalImpact += injury.impactScore;
        
        if (injury.impactScore >= 7) {
          keyPlayersOut++;
        }

        // Categorize by position group
        const position = injury.player.position;
        if (['QB', 'RB', 'WR', 'TE', 'OL'].includes(position)) {
          positionGroups['Offense'] += injury.impactScore;
        } else if (['DL', 'LB', 'DB'].includes(position)) {
          positionGroups['Defense'] += injury.impactScore;
        } else {
          positionGroups['Special Teams'] += injury.impactScore;
        }
      }

      // Calculate overall health score (10 = fully healthy, 0 = decimated)
      const maxPossibleImpact = 100; // Theoretical maximum
      const overallHealthScore = Math.max(0, 10 - (totalImpact / maxPossibleImpact * 10));

      return {
        totalImpact,
        keyPlayersOut,
        positionGroups,
        overallHealthScore: Math.round(overallHealthScore * 10) / 10
      };
    } catch (error) {
      console.error(`❌ Failed to calculate injury impact:`, error);
      return {
        totalImpact: 0,
        keyPlayersOut: 0,
        positionGroups: { 'Offense': 0, 'Defense': 0, 'Special Teams': 0 },
        overallHealthScore: 10
      };
    }
  }

  private async updateDepthChart(playerId: number, teamId: number, isInjured: boolean): Promise<void> {
    try {
      await db.update(depthChart)
        .set({ 
          isInjured: isInjured,
          updatedAt: new Date()
        })
        .where(and(
          eq(depthChart.playerId, playerId),
          eq(depthChart.teamId, teamId)
        ));
    } catch (error) {
      console.error(`❌ Failed to update depth chart:`, error);
    }
  }

  private getCurrentWeek(): number {
    // Simple week calculation - would need more sophisticated logic for real season
    const seasonStart = new Date('2025-08-28'); // Approximate season start
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - seasonStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }

  // Predefined injury reports for common scenarios
  async addCommonInjuries(): Promise<void> {
    console.log(`🏥 Adding common injury scenarios for testing`);

    const commonInjuries: InjuryReport[] = [
      {
        playerName: "Sample QB",
        teamName: "Iowa State",
        position: "QB",
        injuryType: "Shoulder",
        bodyPart: "Right Shoulder",
        severity: "Questionable",
        status: "Active",
        expectedReturnWeeks: 1,
        impactScore: 9
      },
      {
        playerName: "Sample RB",
        teamName: "Kansas State", 
        position: "RB",
        injuryType: "Ankle",
        bodyPart: "Left Ankle",
        severity: "Doubtful",
        status: "Active",
        expectedReturnWeeks: 2,
        impactScore: 7
      }
    ];

    for (const injury of commonInjuries) {
      try {
        await this.addInjuryReport(injury);
      } catch (error) {
        console.log(`   Skip injury: ${error.message}`);
      }
    }
  }
}

// Export singleton instance
export const injuryTracker = new InjuryTracker();