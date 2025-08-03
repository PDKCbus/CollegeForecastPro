import fs from 'fs';
import path from 'path';

class DataSyncLogger {
  private logFilePath: string;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    this.logFilePath = path.join(logsDir, 'data_sync_log.txt');
    
    // Initialize log file if it doesn't exist
    if (!fs.existsSync(this.logFilePath)) {
      const initialContent = '# Rick\'s Picks Data Sync Log\n# Format: [TIMESTAMP] - EVENT_TYPE: Description\n\n';
      fs.writeFileSync(this.logFilePath, initialContent);
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private writeLogEntry(eventType: string, description: string): void {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] - ${eventType}: ${description}\n`;
    
    try {
      fs.appendFileSync(this.logFilePath, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  // Main data sync events
  logSyncStart(process: string, details: string = ''): void {
    this.writeLogEntry('SYNC_START', `${process} ${details}`.trim());
  }

  logSyncComplete(process: string, stats: string = ''): void {
    this.writeLogEntry('SYNC_COMPLETE', `${process} ${stats}`.trim());
  }

  logSyncError(process: string, error: string): void {
    this.writeLogEntry('SYNC_ERROR', `${process} - ${error}`);
  }

  // API requests
  logApiRequest(endpoint: string, params: string = ''): void {
    this.writeLogEntry('API_REQUEST', `${endpoint} ${params}`.trim());
  }

  logApiResponse(endpoint: string, count: number): void {
    this.writeLogEntry('API_RESPONSE', `${endpoint} - ${count} records`);
  }

  // Database operations
  logDbInsert(table: string, count: number): void {
    this.writeLogEntry('DB_INSERT', `${table} - ${count} records`);
  }

  logDbUpdate(table: string, count: number): void {
    this.writeLogEntry('DB_UPDATE', `${table} - ${count} records`);
  }

  // Progress tracking
  logProgress(process: string, current: number, total: number): void {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    this.writeLogEntry('PROGRESS', `${process} - ${current}/${total} (${percentage}%)`);
  }

  // Game collection specific
  logSeasonStart(season: number): void {
    this.writeLogEntry('SEASON_START', `Collecting data for ${season} season`);
  }

  logSeasonComplete(season: number, gamesProcessed: number): void {
    this.writeLogEntry('SEASON_COMPLETE', `${season} season - ${gamesProcessed} games processed`);
  }

  // Betting lines
  logBettingLinesStart(season: number): void {
    this.writeLogEntry('BETTING_START', `Collecting betting lines for ${season} season`);
  }

  logBettingLinesComplete(season: number, linesProcessed: number): void {
    this.writeLogEntry('BETTING_COMPLETE', `${season} season - ${linesProcessed} betting lines processed`);
  }

  // Weekly data sync
  logWeeklySync(week: number, season: number): void {
    this.writeLogEntry('WEEKLY_SYNC', `Week ${week} of ${season} season`);
  }

  // Auto-sync events
  logAutoSyncTrigger(reason: string): void {
    this.writeLogEntry('AUTO_SYNC', `Triggered - ${reason}`);
  }

  // General information
  logInfo(message: string): void {
    this.writeLogEntry('INFO', message);
  }

  // Read recent logs (for debugging)
  getRecentLogs(lines: number = 50): string[] {
    try {
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dataSyncLogger = new DataSyncLogger();