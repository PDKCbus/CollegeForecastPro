#!/usr/bin/env tsx

/**
 * Quick Player Data Collection Script
 * Collects essential player data needed for final algorithm improvements
 */

import { AdvancedAnalyticsDataPipeline } from './server/advanced-analytics-data-pipeline';

async function main() {
  console.log('🚀 Starting player data collection for algorithm improvements...');
  
  const pipeline = new AdvancedAnalyticsDataPipeline();
  
  try {
    // Focus on 2024 season for current year analysis
    console.log('📊 Collecting 2024 player statistics...');
    await pipeline.collectPlayerStats(2024);
    
    // Also collect 2023 for trend analysis
    console.log('📊 Collecting 2023 player statistics...');
    await pipeline.collectPlayerStats(2023);
    
    console.log('✅ Player data collection completed!');
    console.log('💡 Ready for final algorithm improvements:');
    console.log('   - Player Efficiency: +0.6 points');
    console.log('   - Team Efficiency: +0.4 points'); 
    console.log('   - Recent Momentum: +0.3 points');
    console.log('🎯 Target: 54.2% ATS (+1.3 total improvement)');
    
  } catch (error) {
    console.error('❌ Player data collection failed:', error);
  }
  
  process.exit(0);
}

// Run if this file is executed directly
main();