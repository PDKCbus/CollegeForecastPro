import { syncRankingsToProduction } from './simple-rankings-sync';
import { getBettingLinesSync } from './betting-lines-sync';
import { getWeatherSync } from './weather-sync';
import { dataSyncLogger } from './data-sync-logger';

export class WeeklyScheduleSync {
  private static instance: WeeklyScheduleSync | null = null;
  private isRunning: boolean = false;
  private bettingSync = getBettingLinesManager();
  private weatherSync = getWeatherSync();

  private constructor() {}

  static getInstance(): WeeklyScheduleSync {
    if (!WeeklyScheduleSync.instance) {
      WeeklyScheduleSync.instance = new WeeklyScheduleSync();
    }
    return WeeklyScheduleSync.instance;
  }

  async startWeeklyScheduler(): Promise<void> {
    if (this.isRunning) {
      console.log('📅 Weekly schedule sync already running');
      return;
    }

    this.isRunning = true;
    console.log('📅 Starting weekly schedule sync system...');

    // Check every hour for scheduled syncs
    const checkInterval = setInterval(async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Only run at the top of specific hours to avoid multiple triggers
      if (minute !== 0) return;

      try {
        switch (dayOfWeek) {
          case 1: // Monday
            if (hour === 6) { // 6 AM Monday
              await this.mondaySync();
            }
            break;

          case 4: // Thursday
            if (hour === 18) { // 6 PM Thursday
              await this.thursdaySync();
            }
            break;

          case 5: // Friday
            if (hour === 12) { // 12 PM Friday
              await this.fridaySync();
            }
            break;

          case 6: // Saturday
            if (hour === 8) { // 8 AM Saturday
              await this.saturdaySync();
            }
            break;

          case 0: // Sunday
            if (hour === 21) { // 9 PM Sunday
              await this.sundayComprehensiveSync();
            }
            break;
        }
      } catch (error) {
        console.error('❌ Weekly schedule sync error:', error);
        dataSyncLogger.logSyncError('WEEKLY_SCHEDULE', error instanceof Error ? error.message : String(error));
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('✅ Weekly schedule sync system initialized');
    console.log('📅 Schedule:');
    console.log('   Monday 6 AM: Update Historical Games + Collect New Week + Rankings + Betting Lines');
    console.log('   Thursday 6 PM: Mid-week Betting Adjustments');
    console.log('   Friday 12 PM: Final Lines + Weather');
    console.log('   Saturday 8 AM: Game Day Updates');
    console.log('   Sunday 9 PM: Comprehensive Weekly Sync');
  }

  private async mondaySync(): Promise<void> {
    try {
      console.log('📅 MONDAY SYNC: Post-Weekend Comprehensive Update');
      dataSyncLogger.logAutoSyncTrigger('Monday weekly sync started');

      // 1. Update completed games from weekend to historical status
      console.log('🏁 Monday: Updating completed games to historical status...');
      const { updateCompletedGames } = await import('../weekly-2025-collector');
      const completedCount = await updateCompletedGames();
      console.log(`   ✅ Marked ${completedCount} games as completed/historical`);

      // 2. Collect new week games (Week 2, 3, etc.)
      console.log('🏈 Monday: Collecting new week games...');
      const { collectWeeklyGames } = await import('../weekly-2025-collector');
      await collectWeeklyGames();
      console.log('   ✅ New week games collected');

      // 3. Sync current rankings
      console.log('🏆 Monday: Syncing current rankings...');
      await syncRankingsToProduction();

      // 4. Get opening betting lines for the week
      console.log('💰 Monday: Syncing opening betting lines...');
      await this.bettingSync.mondayBettingLinesRefresh();

      dataSyncLogger.logSyncComplete('MONDAY_SYNC', 'Monday sync completed: games updated + new week collected + rankings + opening lines');
      console.log('✅ Monday comprehensive sync completed successfully');

    } catch (error) {
      console.error('❌ Monday sync failed:', error);
      dataSyncLogger.logSyncError('MONDAY_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  private async thursdaySync(): Promise<void> {
    try {
      console.log('📅 THURSDAY SYNC: Mid-week Betting Adjustments');
      dataSyncLogger.logAutoSyncTrigger('Thursday mid-week sync started');

      // Update betting lines with mid-week adjustments
      console.log('💰 Thursday: Syncing mid-week betting adjustments...');
      await this.bettingSync.thursdayBettingLinesRefresh();

      dataSyncLogger.logSyncComplete('THURSDAY_SYNC', 'Thursday sync completed: mid-week betting adjustments');
      console.log('✅ Thursday sync completed successfully');

    } catch (error) {
      console.error('❌ Thursday sync failed:', error);
      dataSyncLogger.logSyncError('THURSDAY_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  private async fridaySync(): Promise<void> {
    try {
      console.log('📅 FRIDAY SYNC: Final Lines + Weather');
      dataSyncLogger.logAutoSyncTrigger('Friday final prep sync started');

      // 1. Get final betting lines before weekend
      console.log('💰 Friday: Syncing final betting lines...');
      await this.bettingSync.fridayBettingLinesRefresh();

      // 2. Get weather forecasts for weekend games
      console.log('🌤️ Friday: Syncing weather forecasts...');
      await this.weatherSync.fridayWeatherSync();

      dataSyncLogger.logSyncComplete('FRIDAY_SYNC', 'Friday sync completed: final lines + weather forecasts');
      console.log('✅ Friday sync completed successfully');

    } catch (error) {
      console.error('❌ Friday sync failed:', error);
      dataSyncLogger.logSyncError('FRIDAY_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  private async saturdaySync(): Promise<void> {
    try {
      console.log('📅 SATURDAY SYNC: Game Day Updates');
      dataSyncLogger.logAutoSyncTrigger('Saturday game day sync started');

      // 1. Final betting line updates
      console.log('💰 Saturday: Game day betting updates...');
      await this.bettingSync.saturdayBettingLinesRefresh();

      // 2. Current weather conditions
      console.log('🌤️ Saturday: Game day weather updates...');
      await this.weatherSync.saturdayWeatherSync();

      dataSyncLogger.logSyncComplete('SATURDAY_SYNC', 'Saturday sync completed: game day updates');
      console.log('✅ Saturday sync completed successfully');

    } catch (error) {
      console.error('❌ Saturday sync failed:', error);
      dataSyncLogger.logSyncError('SATURDAY_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  private async sundayComprehensiveSync(): Promise<void> {
    try {
      console.log('📅 SUNDAY SYNC: Comprehensive Weekly Review');
      dataSyncLogger.logAutoSyncTrigger('Sunday comprehensive sync started');

      // Run full comprehensive sync to clean up and prepare for next week
      const { runComprehensiveSync } = await import('./comprehensive-sync');
      await runComprehensiveSync();

      dataSyncLogger.logSyncComplete('SUNDAY_COMPREHENSIVE', 'Sunday comprehensive sync completed');
      console.log('✅ Sunday comprehensive sync completed successfully');

    } catch (error) {
      console.error('❌ Sunday comprehensive sync failed:', error);
      dataSyncLogger.logSyncError('SUNDAY_COMPREHENSIVE', error instanceof Error ? error.message : String(error));
    }
  }

  stopScheduler(): void {
    this.isRunning = false;
    console.log('⏹️ Weekly schedule sync stopped');
  }

  // Manual trigger methods for admin endpoints
  async triggerMondaySync(): Promise<void> {
    console.log('🔧 Manual trigger: Monday sync');
    await this.mondaySync();
  }

  async triggerThursdaySync(): Promise<void> {
    console.log('🔧 Manual trigger: Thursday sync');
    await this.thursdaySync();
  }

  async triggerFridaySync(): Promise<void> {
    console.log('🔧 Manual trigger: Friday sync');
    await this.fridaySync();
  }

  async triggerSaturdaySync(): Promise<void> {
    console.log('🔧 Manual trigger: Saturday sync');
    await this.saturdaySync();
  }
}

export function getWeeklyScheduleSync(): WeeklyScheduleSync {
  return WeeklyScheduleSync.getInstance();
}