import { db } from './db';
import { games, ricksPicks, predictions } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface PickResult {
  correct: boolean;
  push: boolean;
  gameId: number;
  spreadResult?: 'win' | 'loss' | 'push';
  overUnderResult?: 'win' | 'loss' | 'push';
  units?: number;
}

interface WeeklyPerformanceUpdate {
  humanPicks: {
    spreadWins: number;
    spreadLosses: number;
    spreadPushes: number;
    overUnderWins: number;
    overUnderLosses: number;
    overUnderPushes: number;
    totalUnits: number;
  };
  algorithmPicks: {
    spreadWins: number;
    spreadLosses: number;
    spreadPushes: number;
    overUnderWins: number;
    overUnderLosses: number;
    overUnderPushes: number;
    totalUnits: number;
  };
}

export class PerformanceTracker {

  /**
   * Calculate the result of a spread pick
   */
  private calculateSpreadResult(
    gameSpread: number | null,
    homeScore: number,
    awayScore: number,
    pickedTeam: 'home' | 'away'
  ): 'win' | 'loss' | 'push' | 'no-bet' {
    if (!gameSpread) return 'no-bet';

    const scoreDiff = homeScore - awayScore; // Positive = home won by X

    // Apply the spread to determine cover
    const homeCoversSpread = scoreDiff > Math.abs(gameSpread);
    const awayCoversSpread = Math.abs(scoreDiff) > Math.abs(gameSpread) && scoreDiff < 0;
    const isPush = Math.abs(scoreDiff) === Math.abs(gameSpread);

    if (isPush) return 'push';

    if (pickedTeam === 'home') {
      return homeCoversSpread ? 'win' : 'loss';
    } else {
      return awayCoversSpread ? 'win' : 'loss';
    }
  }

  /**
   * Calculate the result of an over/under pick
   */
  private calculateOverUnderResult(
    gameTotal: number | null,
    homeScore: number,
    awayScore: number,
    pick: 'over' | 'under'
  ): 'win' | 'loss' | 'push' | 'no-bet' {
    if (!gameTotal) return 'no-bet';

    const actualTotal = homeScore + awayScore;

    if (actualTotal === gameTotal) return 'push';

    const wentOver = actualTotal > gameTotal;

    if (pick === 'over') {
      return wentOver ? 'win' : 'loss';
    } else {
      return wentOver ? 'loss' : 'win';
    }
  }

  /**
   * Parse Rick's pick notes to extract spread and over/under picks
   */
  private parseRicksPick(notes: string | null): {
    spreadPick?: 'home' | 'away';
    overUnderPick?: 'over' | 'under';
  } {
    if (!notes) return {};

    const result: { spreadPick?: 'home' | 'away'; overUnderPick?: 'over' | 'under' } = {};

    // Parse spread picks like "Take Kansas State -3.5" or "Take Iowa State +7"
    if (notes.includes('Take ') && (notes.includes(' -') || notes.includes(' +'))) {
      // Extract team name and determine if it's home or away
      // This would need game context to determine home/away
    }

    // Parse over/under picks like "Take Over 47.5" or "Take Under 52"
    if (notes.includes('Over ')) {
      result.overUnderPick = 'over';
    } else if (notes.includes('Under ')) {
      result.overUnderPick = 'under';
    }

    return result;
  }

  /**
   * Process completed games from a specific week and calculate performance
   */
  async updateWeeklyPerformance(season: number, week: number): Promise<WeeklyPerformanceUpdate> {
    console.log(`📊 Processing performance for ${season} Week ${week}...`);

    // Get all completed games for the week
    const completedGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.season, season),
          eq(games.week, week),
          eq(games.completed, true)
        )
      );

    console.log(`Found ${completedGames.length} completed games for Week ${week}`);

    const weeklyUpdate: WeeklyPerformanceUpdate = {
      humanPicks: {
        spreadWins: 0, spreadLosses: 0, spreadPushes: 0,
        overUnderWins: 0, overUnderLosses: 0, overUnderPushes: 0,
        totalUnits: 0
      },
      algorithmPicks: {
        spreadWins: 0, spreadLosses: 0, spreadPushes: 0,
        overUnderWins: 0, overUnderLosses: 0, overUnderPushes: 0,
        totalUnits: 0
      }
    };

    for (const game of completedGames) {
      if (!game.homeTeamScore || !game.awayTeamScore) continue;

      // Process Rick's human picks
      const rickPicks = await db
        .select()
        .from(ricksPicks)
        .where(eq(ricksPicks.gameId, game.id));

      if (rickPicks.length > 0) {
        const pick = rickPicks[0];
        const parsed = this.parseRicksPick(pick.personalNotes);

        // Calculate spread result for Rick's pick
        if (parsed.spreadPick && game.spread) {
          const result = this.calculateSpreadResult(
            game.spread,
            game.homeTeamScore,
            game.awayTeamScore,
            parsed.spreadPick
          );

          switch (result) {
            case 'win':
              weeklyUpdate.humanPicks.spreadWins++;
              weeklyUpdate.humanPicks.totalUnits += 1;
              break;
            case 'loss':
              weeklyUpdate.humanPicks.spreadLosses++;
              weeklyUpdate.humanPicks.totalUnits -= 1.1; // Include juice
              break;
            case 'push':
              weeklyUpdate.humanPicks.spreadPushes++;
              break;
          }
        }

        // Calculate over/under result for Rick's pick
        if (parsed.overUnderPick && game.overUnder) {
          const result = this.calculateOverUnderResult(
            game.overUnder,
            game.homeTeamScore,
            game.awayTeamScore,
            parsed.overUnderPick
          );

          switch (result) {
            case 'win': weeklyUpdate.humanPicks.overUnderWins++; break;
            case 'loss': weeklyUpdate.humanPicks.overUnderLosses++; break;
            case 'push': weeklyUpdate.humanPicks.overUnderPushes++; break;
          }
        }
      }

      // Process algorithm picks (predictions table)
      const algorithmPicks = await db
        .select()
        .from(predictions)
        .where(eq(predictions.gameId, game.id));

      if (algorithmPicks.length > 0) {
        const prediction = algorithmPicks[0];

        // Determine if algorithm picked correctly based on predicted winner
        if (prediction.predictedWinnerId) {
          const predictedHome = prediction.predictedWinnerId === game.homeTeamId;
          const homeWon = game.homeTeamScore > game.awayTeamScore;

          if (predictedHome === homeWon) {
            weeklyUpdate.algorithmPicks.spreadWins++;
            weeklyUpdate.algorithmPicks.totalUnits += 1;
          } else {
            weeklyUpdate.algorithmPicks.spreadLosses++;
            weeklyUpdate.algorithmPicks.totalUnits -= 1.1;
          }
        }

        // Check predicted total vs actual total
        if (prediction.predictedTotal && game.overUnder) {
          const actualTotal = game.homeTeamScore + game.awayTeamScore;
          const predictedOver = prediction.predictedTotal > game.overUnder;
          const actualOver = actualTotal > game.overUnder;

          if (predictedOver === actualOver) {
            weeklyUpdate.algorithmPicks.overUnderWins++;
          } else {
            weeklyUpdate.algorithmPicks.overUnderLosses++;
          }

          if (actualTotal === game.overUnder) {
            weeklyUpdate.algorithmPicks.overUnderPushes++;
          }
        }
      }
    }

    console.log(`📈 Week ${week} Performance Summary:`);
    console.log(`Rick's Picks: ${weeklyUpdate.humanPicks.spreadWins}W-${weeklyUpdate.humanPicks.spreadLosses}L (${weeklyUpdate.humanPicks.totalUnits > 0 ? '+' : ''}${weeklyUpdate.humanPicks.totalUnits.toFixed(1)} units)`);
    console.log(`Algorithm: ${weeklyUpdate.algorithmPicks.spreadWins}W-${weeklyUpdate.algorithmPicks.spreadLosses}L (${weeklyUpdate.algorithmPicks.totalUnits > 0 ? '+' : ''}${weeklyUpdate.algorithmPicks.totalUnits.toFixed(1)} units)`);

    return weeklyUpdate;
  }

  /**
   * Get cumulative season performance stats
   */
  async getSeasonPerformance(season: number): Promise<{
    humanPicks: any;
    algorithmPicks: any;
  }> {
    // This would aggregate all weekly updates for the season
    // For now, return current season structure with zeros
    return {
      humanPicks: {
        spread: { wins: 0, losses: 0, pushes: 0, total: 0, percentage: 0.0 },
        overUnder: { wins: 0, losses: 0, pushes: 0, total: 0, percentage: 0.0 },
        totalGames: 0, currentStreak: 0, longestStreak: 0,
        roi: 0.0, units: 0.0, bestTeam: "Ohio State", bestTeamRecord: "0-0"
      },
      algorithmPicks: {
        spread: { wins: 0, losses: 0, pushes: 0, total: 0, percentage: 0.0 },
        overUnder: { wins: 0, losses: 0, pushes: 0, total: 0, percentage: 0.0 },
        totalGames: 0, currentStreak: 0, longestStreak: 0,
        roi: 0.0, units: 0.0, bestTeam: "Analysis Pending", bestTeamRecord: "0-0",
        accuracy: { overall: 0.0, spread: 0.0, overUnder: 0.0, confidence: "Building dataset" }
      }
    };
  }

  /**
   * Run weekly performance update (called by scheduler)
   */
  async runWeeklyUpdate(): Promise<void> {
    const currentSeason = 2025;

    // Determine current week or process all weeks with completed games
    for (let week = 1; week <= 15; week++) {
      const weekUpdate = await this.updateWeeklyPerformance(currentSeason, week);

      // In a full implementation, these results would be stored in a performance_tracking table
      // For now, they're logged and available for the API endpoint
    }
  }
}

export const performanceTracker = new PerformanceTracker();