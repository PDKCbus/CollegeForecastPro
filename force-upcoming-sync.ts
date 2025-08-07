#!/usr/bin/env npx tsx

// Force sync upcoming games for production
import { comprehensiveDataSync } from './server/comprehensive-data-sync';

async function forceUpcomingSync() {
  try {
    console.log('🚀 Force syncing upcoming games for 2025 season...');
    
    // Sync current season games (2025)
    await comprehensiveDataSync.syncAllGamesForSeason(2025);
    console.log('✅ 2025 upcoming games synced');
    
    // Also sync team stats for context
    await comprehensiveDataSync.syncTeamSeasonStats(2025);
    console.log('✅ 2025 team stats synced');
    
    console.log('🎯 Upcoming games force sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Force sync failed:', error);
    process.exit(1);
  }
}

forceUpcomingSync();