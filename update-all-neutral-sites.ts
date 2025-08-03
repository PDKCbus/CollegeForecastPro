#!/usr/bin/env tsx

/**
 * Comprehensive Neutral Site Detection and Update Script
 * Updates ALL games in the database to properly identify neutral sites
 */

import { db } from './server/db';
import { games } from './shared/schema';
import { eq, isNull, or } from 'drizzle-orm';

interface NeutralSitePattern {
  keywords: string[];
  venue?: string;
  city?: string;
  country?: string;
}

// Comprehensive neutral site detection patterns
const NEUTRAL_SITE_PATTERNS: NeutralSitePattern[] = [
  // Bowl Games & Playoffs
  { keywords: ['bowl', 'championship', 'playoff', 'national championship'], venue: 'Various Bowl Venues', country: 'USA' },
  
  // International Games
  { keywords: ['dublin', 'ireland'], venue: 'Aviva Stadium', city: 'Dublin', country: 'Ireland' },
  { keywords: ['london', 'england', 'uk'], venue: 'Wembley Stadium', city: 'London', country: 'England' },
  { keywords: ['munich', 'germany'], venue: 'Allianz Arena', city: 'Munich', country: 'Germany' },
  { keywords: ['mexico city', 'mexico'], venue: 'Foro Sol', city: 'Mexico City', country: 'Mexico' },
  
  // Major Neutral Site Games
  { keywords: ['kickoff classic', 'kickoff game'], venue: 'Various Neutral Venues', country: 'USA' },
  { keywords: ['vs.', ' vs ', 'neutral site'], venue: 'Neutral Site', country: 'USA' },
  
  // Conference Championship Games
  { keywords: ['conference championship', 'championship game'], venue: 'Conference Championship Venue', country: 'USA' },
  
  // Military Bowl Games
  { keywords: ['armed forces bowl', 'military bowl'], venue: 'Amon G. Carter Stadium', city: 'Fort Worth', country: 'USA' },
  
  // Specific Stadiums Known for Neutral Games
  { keywords: ['mercedes-benz stadium', 'atlanta'], venue: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA' },
  { keywords: ['allegiant stadium', 'las vegas'], venue: 'Allegiant Stadium', city: 'Las Vegas', country: 'USA' },
  { keywords: ['arlington', 'cowboys stadium', 'at&t stadium'], venue: 'AT&T Stadium', city: 'Arlington', country: 'USA' },
];

class NeutralSiteDetector {
  
  /**
   * Check if a game is likely a neutral site based on various indicators
   */
  private isNeutralSite(game: any): { isNeutral: boolean; venue?: string; city?: string; country?: string } {
    const gameText = `${game.stadium || ''} ${game.location || ''}`.toLowerCase();
    
    // Check against known patterns
    for (const pattern of NEUTRAL_SITE_PATTERNS) {
      for (const keyword of pattern.keywords) {
        if (gameText.includes(keyword.toLowerCase())) {
          return {
            isNeutral: true,
            venue: pattern.venue,
            city: pattern.city,
            country: pattern.country || 'USA'
          };
        }
      }
    }
    
    // Check for common neutral site indicators
    if (gameText.includes('neutral') || 
        gameText.includes('bowl') ||
        gameText.includes('championship') ||
        gameText.includes('vs.') ||
        gameText.includes(' vs ')) {
      return {
        isNeutral: true,
        venue: game.stadium || 'Neutral Site',
        city: this.extractCityFromLocation(game.location),
        country: this.detectCountryFromLocation(game.location)
      };
    }
    
    return { isNeutral: false };
  }
  
  /**
   * Extract city from location string
   */
  private extractCityFromLocation(location: string | null): string | undefined {
    if (!location) return undefined;
    
    // Common patterns: "City, State" or "City, Country"
    const parts = location.split(',');
    if (parts.length >= 1) {
      return parts[0].trim();
    }
    
    return undefined;
  }
  
  /**
   * Detect country from location indicators
   */
  private detectCountryFromLocation(location: string | null): string {
    if (!location) return 'USA';
    
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('ireland') || locationLower.includes('dublin')) return 'Ireland';
    if (locationLower.includes('england') || locationLower.includes('london')) return 'England';
    if (locationLower.includes('germany') || locationLower.includes('munich')) return 'Germany';
    if (locationLower.includes('mexico')) return 'Mexico';
    
    return 'USA';
  }
  
  /**
   * Update all games in database with neutral site detection
   */
  async updateAllNeutralSites(): Promise<void> {
    try {
      console.log('🔍 Starting comprehensive neutral site detection...');
      
      // Get all games that haven't been checked for neutral sites
      const allGames = await db
        .select()
        .from(games)
        .where(or(
          isNull(games.isNeutralSite),
          eq(games.isNeutralSite, false)
        ));
      
      console.log(`📊 Found ${allGames.length} games to analyze for neutral sites`);
      
      let neutralSitesFound = 0;
      let internationalGamesFound = 0;
      
      for (const game of allGames) {
        const detection = this.isNeutralSite(game);
        
        if (detection.isNeutral) {
          neutralSitesFound++;
          
          if (detection.country !== 'USA') {
            internationalGamesFound++;
          }
          
          // Update the game with neutral site information
          await db
            .update(games)
            .set({
              isNeutralSite: true,
              venue: detection.venue || game.stadium,
              city: detection.city,
              country: detection.country || 'USA'
            })
            .where(eq(games.id, game.id));
          
          console.log(`✅ Updated Game ${game.id}: ${game.homeTeam || 'Home'} vs ${game.awayTeam || 'Away'} - ${detection.venue || 'Neutral Site'} (${detection.country})`);
        }
      }
      
      // Update remaining games as domestic home games
      const remainingGames = await db
        .select()
        .from(games)
        .where(isNull(games.isNeutralSite));
      
      for (const game of remainingGames) {
        await db
          .update(games)
          .set({
            isNeutralSite: false,
            country: 'USA'
          })
          .where(eq(games.id, game.id));
      }
      
      console.log(`🎯 NEUTRAL SITE DETECTION COMPLETE:`);
      console.log(`✅ Total games analyzed: ${allGames.length}`);
      console.log(`🏟️  Neutral sites found: ${neutralSitesFound}`);
      console.log(`🌍 International games: ${internationalGamesFound}`);
      console.log(`🏠 Home games: ${allGames.length - neutralSitesFound}`);
      
    } catch (error) {
      console.error('❌ Neutral site detection failed:', error);
      throw error;
    }
  }
}

// Execute the script
const detector = new NeutralSiteDetector();
detector.updateAllNeutralSites()
  .then(() => {
    console.log('✅ Neutral site detection completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Neutral site detection failed:', error);
    process.exit(1);
  });

export { NeutralSiteDetector };