#!/usr/bin/env tsx

/**
 * Universal Season Collection Script
 * 
 * Usage: tsx collect-season.ts <year>
 * Example: tsx collect-season.ts 2022
 */

import { RobustSeasonCollector } from './robust-season-collector';

async function main() {
  const year = parseInt(process.argv[2]);
  
  if (!year || year < 2009 || year > 2025) {
    console.error('❌ Please provide a valid year (2009-2025)');
    console.error('Usage: tsx collect-season.ts <year>');
    console.error('Example: tsx collect-season.ts 2022');
    process.exit(1);
  }
  
  if (!process.env.CFBD_API_KEY) {
    console.error('❌ CFBD_API_KEY environment variable required');
    process.exit(1);
  }
  
  console.log(`🏈 Starting collection for ${year} season using robust collector...`);
  
  const collector = new RobustSeasonCollector({
    year,
    maxGamesPerBatch: 25,        // Smaller batches to avoid timeouts
    delayBetweenBatches: 2000,   // 2 second delay between batches
    maxTimeoutRetries: 3         // Retry failed requests up to 3 times
  });
  
  try {
    await collector.collectSeason();
    console.log(`\n✅ ${year} season collection completed successfully!`);
  } catch (error) {
    console.error(`❌ ${year} season collection failed:`, error.message);
    process.exit(1);
  }
}

main();