/**
 * Collect Single Season - Focus on missing years
 */

import { HistoricalCollection } from './historical-collection-2009-2024';

const season = parseInt(process.argv[2]);

if (!season || season < 2009 || season > 2024) {
  console.error('Please provide a valid season (2009-2024)');
  process.exit(1);
}

const collector = new HistoricalCollection();
collector.collectSeasonGames(season).then(() => {
  console.log(`\n✅ Season ${season} collection complete!`);
  process.exit(0);
}).catch((error) => {
  console.error(`❌ Error collecting season ${season}:`, error);
  process.exit(1);
});