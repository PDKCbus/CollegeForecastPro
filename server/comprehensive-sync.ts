import { syncRankingsToProduction } from './simple-rankings-sync';
import { dataSyncLogger } from './data-sync-logger';

export async function runComprehensiveSync() {
  try {
    console.log('🚀 Starting comprehensive multi-weekly sync...');
    dataSyncLogger.logAutoSyncTrigger('Comprehensive sync started');

    // 1. Sync current team rankings
    console.log('📊 Step 1: Syncing team rankings...');
    await syncRankingsToProduction();

    // 2. Sync current 2025 season games
    console.log('🏈 Step 2: Syncing 2025 season games...');
    const { sync2025Games } = await import('./sync-2025-games');
    await sync2025Games();

    // 3. Sync current week betting lines
    console.log('💰 Step 3: Syncing betting lines...');
    const { syncBettingLines } = await import('./betting-lines-sync');
    await syncBettingLines();

    // 4. Sync weather data for upcoming games
    console.log('🌤️ Step 4: Syncing weather data...');
    const { syncWeatherData } = await import('./weather-sync');
    await syncWeatherData();

    // 5. TODO: Sync injury reports (placeholder for future)
    console.log('🏥 Step 5: Injury reports sync (TODO - requires injury data API)');
    // await syncInjuryReports();

    dataSyncLogger.logSyncComplete('COMPREHENSIVE_SYNC', 'Multi-weekly comprehensive sync completed');
    console.log('✅ Comprehensive sync completed successfully!');

    return {
      success: true,
      timestamp: new Date().toISOString(),
      steps: [
        { name: 'Team Rankings', status: 'completed' },
        { name: '2025 Season Games', status: 'completed' },
        { name: 'Betting Lines', status: 'completed' },
        { name: 'Weather Data', status: 'completed' },
        { name: 'Injury Reports', status: 'pending' }
      ]
    };

  } catch (error) {
    console.error('❌ Comprehensive sync failed:', error);
    dataSyncLogger.logSyncError('COMPREHENSIVE_SYNC', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Manual execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveSync()
    .then(result => console.log('Sync result:', result))
    .catch(error => console.error('Sync failed:', error));
}