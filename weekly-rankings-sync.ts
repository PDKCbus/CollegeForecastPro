#!/usr/bin/env tsx
/**
 * Weekly College Football Rankings Sync
 *
 * This script syncs the latest AP Top 25 rankings from the College Football Data API
 * and should be run every Tuesday/Wednesday when new rankings are released.
 *
 * Usage:
 *   npm run sync-rankings
 *   or directly: tsx scripts/weekly-rankings-sync.ts
 *
 * Production Usage:
 *   curl -X POST "https://ricks-picks.football/api/admin/sync-rankings" \
 *     -H "Authorization: Bearer $ADMIN_API_KEY"
 */

import { syncRankingsToProduction } from './server/simple-rankings-sync';

async function runWeeklyRankingsSync() {
  try {
    console.log('🚀 Starting weekly AP Top 25 rankings sync...');
    console.log('📅 This should be run every Tuesday/Wednesday after games');

    const result = await syncRankingsToProduction();

    console.log('\n✅ Weekly Rankings Sync Complete!');
    console.log(`📊 Week ${result.weekUsed}: ${result.teamsUpdated} teams updated`);
    console.log(`⏰ Next sync: Tuesday/Wednesday after week ${result.weekUsed + 1} games`);
    console.log(`🔗 Production endpoint: POST /api/admin/sync-rankings`);

  } catch (error) {
    console.error('❌ Weekly rankings sync failed:', error);
    process.exit(1);
  }
}

// Run the sync if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWeeklyRankingsSync();
}

export { runWeeklyRankingsSync };