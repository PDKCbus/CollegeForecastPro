import { refreshMidWeekBettingLines } from './mid-week-line-refresh';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Betting Lines Scheduler
 * 
 * This system manages the automated betting line refresh schedule:
 * - Tuesday morning: Full weekly collection (new games + weather + lines)
 * - Thursday morning: Mid-week line refresh (capture early week movement)  
 * - Saturday morning: Pre-game line refresh (capture late week movement)
 */

export class BettingLinesScheduler {
  private static instance: BettingLinesScheduler;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): BettingLinesScheduler {
    if (!BettingLinesScheduler.instance) {
      BettingLinesScheduler.instance = new BettingLinesScheduler();
    }
    return BettingLinesScheduler.instance;
  }

  startScheduler(): void {
    if (this.isRunning) {
      console.log('📊 Betting lines scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting betting lines scheduler...');
    console.log('   📅 Tuesday: Full weekly collection');
    console.log('   📈 Thursday: Mid-week line refresh');
    console.log('   🏈 Saturday: Pre-game line refresh');

    // Check every hour for scheduled tasks
    this.intervalId = setInterval(() => {
      this.checkScheduledTasks();
    }, 60 * 60 * 1000); // Every hour

    // Run initial check
    this.checkScheduledTasks();
  }

  stopScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Betting lines scheduler stopped');
  }

  private async checkScheduledTasks(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Tuesday morning: Full weekly collection (7:00 AM)
    if (dayOfWeek === 2 && hour === 7 && minute < 10) {
      await this.runTuesdayCollection();
    }
    
    // Thursday morning: Mid-week line refresh (8:00 AM)
    else if (dayOfWeek === 4 && hour === 8 && minute < 10) {
      await this.runThursdayLineRefresh();
    }
    
    // Saturday morning: Pre-game line refresh (9:00 AM)
    else if (dayOfWeek === 6 && hour === 9 && minute < 10) {
      await this.runSaturdayLineRefresh();
    }
  }

  private async runTuesdayCollection(): Promise<void> {
    console.log('📅 TUESDAY COLLECTION: Starting full weekly data sync...');
    
    try {
      // Run the weekly collector
      console.log('   🏈 Collecting new games and schedules...');
      await execAsync('tsx weekly-2025-collector.ts');
      
      console.log('✅ Tuesday collection completed successfully');
      console.log('   ✓ New games added to schedule');
      console.log('   ✓ Weather data updated for upcoming games');
      console.log('   ✓ Betting lines refreshed from CFBD API');
      console.log('   ✓ Completed games marked as finished');

    } catch (error) {
      console.error('❌ Tuesday collection failed:', error);
    }
  }

  private async runThursdayLineRefresh(): Promise<void> {
    console.log('📈 THURSDAY REFRESH: Updating mid-week betting lines...');
    
    try {
      await refreshMidWeekBettingLines();
      
      console.log('✅ Thursday line refresh completed');
      console.log('   ✓ Captured early week line movement');
      console.log('   ✓ Updated spreads and totals from sportsbooks');
      console.log('   ✓ Rick\'s picks now use latest betting data');

    } catch (error) {
      console.error('❌ Thursday line refresh failed:', error);
    }
  }

  private async runSaturdayLineRefresh(): Promise<void> {
    console.log('🏈 SATURDAY REFRESH: Final pre-game line updates...');
    
    try {
      await refreshMidWeekBettingLines();
      
      console.log('✅ Saturday line refresh completed');
      console.log('   ✓ Captured final line movement before games');
      console.log('   ✓ Fresh betting data for weekend predictions');
      console.log('   ✓ Ready for game day with accurate lines');

    } catch (error) {
      console.error('❌ Saturday line refresh failed:', error);
    }
  }

  // Manual triggers for testing/maintenance
  async manualTuesdayCollection(): Promise<void> {
    console.log('🔧 Manual Tuesday collection triggered...');
    await this.runTuesdayCollection();
  }  

  async manualThursdayRefresh(): Promise<void> {
    console.log('🔧 Manual Thursday refresh triggered...');
    await this.runThursdayLineRefresh();
  }

  async manualSaturdayRefresh(): Promise<void> {
    console.log('🔧 Manual Saturday refresh triggered...');
    await this.runSaturdayLineRefresh();
  }

  getStatus(): any {
    return {
      running: this.isRunning,
      nextTuesday: this.getNextScheduledTime(2, 7), // Tuesday 7 AM
      nextThursday: this.getNextScheduledTime(4, 8), // Thursday 8 AM  
      nextSaturday: this.getNextScheduledTime(6, 9), // Saturday 9 AM
      schedule: {
        tuesday: "7:00 AM - Full weekly collection (games + weather + lines)",
        thursday: "8:00 AM - Mid-week line refresh (capture movement)",
        saturday: "9:00 AM - Pre-game line refresh (final updates)"
      }
    };
  }

  private getNextScheduledTime(dayOfWeek: number, hour: number): string {
    const now = new Date();
    const next = new Date();
    
    // Calculate days until next occurrence
    const daysUntilNext = (dayOfWeek + 7 - now.getDay()) % 7;
    const isToday = daysUntilNext === 0;
    const hasPassedToday = isToday && now.getHours() >= hour;
    
    if (hasPassedToday) {
      next.setDate(now.getDate() + 7); // Next week
    } else {
      next.setDate(now.getDate() + daysUntilNext);
    }
    
    next.setHours(hour, 0, 0, 0);
    
    return next.toISOString();
  }
}

// CLI execution for manual testing
if (import.meta.main) {
  const scheduler = BettingLinesScheduler.getInstance();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      scheduler.startScheduler();
      break;
    case 'stop':
      scheduler.stopScheduler();
      break;
    case 'status':
      console.log(JSON.stringify(scheduler.getStatus(), null, 2));
      break;
    case 'tuesday':
      scheduler.manualTuesdayCollection();
      break;
    case 'thursday':
      scheduler.manualThursdayRefresh();        
      break;
    case 'saturday':
      scheduler.manualSaturdayRefresh();
      break;
    default:
      console.log('Usage: tsx betting-lines-scheduler.ts [start|stop|status|tuesday|thursday|saturday]');
      break;
  }
}

export default BettingLinesScheduler;