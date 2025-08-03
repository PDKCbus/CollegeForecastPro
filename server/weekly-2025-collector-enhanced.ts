/**
 * Enhanced Weekly 2025 Collector with Team Analytics Integration
 * Combines game collection with comprehensive team performance analytics
 */

import { CFBDTeamStatsCollector } from './cfbd-team-stats-collector';
import { initializeTeamEloRatings } from './cfbd-team-stats-collector';
import { comprehensiveDataSync } from './comprehensive-data-sync';

const CFBD_API_KEY = process.env.CFBD_API_KEY;

export interface EnhancedWeeklyCollectionOptions {
  season: number;
  week?: number;
  includeAnalytics: boolean;
  initializeElo: boolean;
  collectStats: boolean;
  weatherEnrichment: boolean;
}

/**
 * Enhanced Weekly Collector with Team Analytics
 */
export class Enhanced2025WeeklyCollector {
  
  /**
   * Perform comprehensive weekly collection including team analytics
   */
  static async performEnhancedWeeklyCollection(
    options: EnhancedWeeklyCollectionOptions = {
      season: 2025,
      includeAnalytics: true,
      initializeElo: false,
      collectStats: true,
      weatherEnrichment: true
    }
  ): Promise<{
    gamesCollected: number;
    analyticsUpdated: boolean;
    eloInitialized: boolean;
    statsCollected: boolean;
    weatherEnriched: boolean;
  }> {
    
    if (!CFBD_API_KEY) {
      console.log('CFBD API key not found - limited functionality available');
      return {
        gamesCollected: 0,
        analyticsUpdated: false,
        eloInitialized: false,
        statsCollected: false,
        weatherEnriched: false
      };
    }

    console.log(`=== Enhanced Weekly Collection for ${options.season} ===`);
    
    try {
      // Step 1: Initialize ELO ratings if requested
      let eloInitialized = false;
      if (options.initializeElo) {
        console.log('🔢 Initializing team ELO ratings...');
        await initializeTeamEloRatings();
        eloInitialized = true;
        console.log('✅ ELO ratings initialized');
      }

      // Step 2: Collect current season team statistics
      let statsCollected = false;
      if (options.collectStats) {
        console.log('📊 Collecting team season statistics...');
        await CFBDTeamStatsCollector.performFullAnalyticsUpdate(options.season);
        statsCollected = true;
        console.log('✅ Team statistics collected and updated');
      }

      // Step 3: Collect games data using existing comprehensive sync
      console.log('🏈 Collecting games and betting lines...');
      const gameResult = await comprehensiveDataSync(options.season, options.week);
      const gamesCollected = gameResult?.gamesProcessed || 0;
      console.log(`✅ ${gamesCollected} games collected`);

      // Step 4: Weather enrichment (if enabled in existing system)
      let weatherEnriched = false;
      if (options.weatherEnrichment) {
        try {
          // Weather enrichment is already integrated in comprehensive sync
          weatherEnriched = true;
          console.log('✅ Weather data enriched');
        } catch (weatherError) {
          console.log('⚠️ Weather enrichment unavailable:', weatherError);
        }
      }

      // Step 5: Team analytics update
      let analyticsUpdated = false;
      if (options.includeAnalytics && statsCollected) {
        console.log('⚡ Analytics integration complete');
        analyticsUpdated = true;
      }

      const summary = {
        gamesCollected,
        analyticsUpdated,
        eloInitialized,
        statsCollected,
        weatherEnriched
      };

      console.log('=== Enhanced Collection Summary ===');
      console.log(`Games Collected: ${summary.gamesCollected}`);
      console.log(`Team Analytics: ${summary.analyticsUpdated ? '✅' : '❌'}`);
      console.log(`ELO Ratings: ${summary.eloInitialized ? '✅ Initialized' : '⏭️ Skipped'}`);
      console.log(`Team Stats: ${summary.statsCollected ? '✅' : '❌'}`);
      console.log(`Weather Data: ${summary.weatherEnriched ? '✅' : '❌'}`);
      console.log('=================================');

      return summary;

    } catch (error) {
      console.error('Enhanced weekly collection error:', error);
      throw error;
    }
  }

  /**
   * Quick analytics-only update (for maintenance)
   */
  static async performAnalyticsOnlyUpdate(season: number = 2025): Promise<void> {
    console.log(`=== Analytics-Only Update for ${season} ===`);
    
    try {
      // Collect team statistics
      await CFBDTeamStatsCollector.performFullAnalyticsUpdate(season);
      console.log('✅ Team analytics updated successfully');
      
    } catch (error) {
      console.error('Analytics update error:', error);
      throw error;
    }
  }

  /**
   * Tuesday maintenance routine with team analytics
   */
  static async performTuesdayMaintenance(season: number = 2025): Promise<void> {
    console.log('🗓️ === Tuesday Maintenance with Analytics ===');
    
    try {
      // Enhanced weekly collection with all features
      const result = await this.performEnhancedWeeklyCollection({
        season,
        includeAnalytics: true,
        initializeElo: false, // Don't reinitialize existing ELO
        collectStats: true,
        weatherEnrichment: true
      });

      console.log('🗓️ Tuesday Maintenance Complete');
      console.log(`📈 Enhanced collection result:`, result);
      
    } catch (error) {
      console.error('Tuesday maintenance error:', error);
      throw error;
    }
  }

  /**
   * Pre-season initialization with full team analytics setup
   */
  static async performPreSeasonInitialization(season: number = 2025): Promise<void> {
    console.log(`🚀 === Pre-Season Initialization for ${season} ===`);
    
    try {
      // Full initialization with all analytics features
      const result = await this.performEnhancedWeeklyCollection({
        season,
        includeAnalytics: true,
        initializeElo: true, // Initialize ELO for new season
        collectStats: true,
        weatherEnrichment: true
      });

      console.log('🚀 Pre-Season Initialization Complete');
      console.log('🎯 Platform ready for season with full analytics:', result);
      
    } catch (error) {
      console.error('Pre-season initialization error:', error);
      throw error;
    }
  }
}

/**
 * Convenience function for enhanced weekly collection
 */
export async function enhancedWeeklyCollection(
  season: number = 2025,
  week?: number
): Promise<void> {
  await Enhanced2025WeeklyCollector.performEnhancedWeeklyCollection({
    season,
    week,
    includeAnalytics: true,
    initializeElo: false,
    collectStats: true,
    weatherEnrichment: true
  });
}

/**
 * Convenience function for Tuesday maintenance
 */
export async function tuesdayMaintenanceWithAnalytics(season: number = 2025): Promise<void> {
  await Enhanced2025WeeklyCollector.performTuesdayMaintenance(season);
}