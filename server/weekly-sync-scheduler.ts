import { getRankingsSync } from "./rankings-sync";
import { dataSyncLogger } from "./data-sync-logger";

export class WeeklySyncScheduler {
  private static instance: WeeklySyncScheduler | null = null;
  private isRunning: boolean = false;
  private rankingsSync = getRankingsSync();

  private constructor() {}

  static getInstance(): WeeklySyncScheduler {
    if (!WeeklySyncScheduler.instance) {
      WeeklySyncScheduler.instance = new WeeklySyncScheduler();
    }
    return WeeklySyncScheduler.instance;
  }

  async startScheduler(): Promise<void> {
    if (this.isRunning) {
      console.log('📅 Weekly sync scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('📅 Starting weekly sync scheduler...');

    // Initial sync on startup
    setTimeout(async () => {
      await this.performWeeklySync();
    }, 30000); // Wait 30 seconds after startup

    // Schedule daily rankings sync at 6 AM
    const dailyInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 6 && now.getMinutes() === 0) {
        await this.performWeeklySync();
      }
    }, 60000); // Check every minute

    // Sunday night comprehensive sync (9 PM)
    const sundayInterval = setInterval(async () => {
      const now = new Date();
      if (now.getDay() === 0 && now.getHours() === 21 && now.getMinutes() === 0) {
        await this.performComprehensiveSync();
      }
    }, 60000); // Check every minute

    console.log('✅ Weekly sync scheduler initialized');
  }

  private async performWeeklySync(): Promise<void> {
    try {
      console.log('🔄 Performing weekly sync...');
      dataSyncLogger.logWeeklySync(1, 2025);

      // Sync current rankings
      await this.rankingsSync.autoSyncCurrentWeekRankings();

      dataSyncLogger.logSyncComplete('WEEKLY_SYNC', 'Weekly rankings sync completed');
      console.log('✅ Weekly sync completed');
    } catch (error) {
      console.error('❌ Weekly sync failed:', error);
      dataSyncLogger.logSyncError('WEEKLY_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  private async performComprehensiveSync(): Promise<void> {
    try {
      console.log('🔄 Performing comprehensive Sunday sync...');
      dataSyncLogger.logAutoSyncTrigger('Sunday comprehensive sync');

      // Sync rankings
      await this.rankingsSync.autoSyncCurrentWeekRankings();

      // TODO: Add betting lines sync
      // TODO: Add games data sync
      // TODO: Add injury reports sync

      dataSyncLogger.logSyncComplete('COMPREHENSIVE_SYNC', 'Sunday comprehensive sync completed');
      console.log('✅ Comprehensive sync completed');
    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error);
      dataSyncLogger.logSyncError('COMPREHENSIVE_SYNC', error instanceof Error ? error.message : String(error));
    }
  }

  getCurrentWeek(): number {
    // For now, return week 1 as we're in preseason
    // This should be calculated based on current date and season start
    return 1;
  }

  stopScheduler(): void {
    this.isRunning = false;
    console.log('⏹️ Weekly sync scheduler stopped');
  }
}