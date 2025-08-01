import { db } from './db';
import { games } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Venue Data Enhancement Service
 * Cleans up venue names and ensures proper dome detection
 */

const KNOWN_DOMES = new Set([
  'Mercedes-Benz Stadium',
  'Ford Field',
  'Carrier Dome',
  'Georgia Dome',
  'Alamodome',
  'Metrodome',
  'Tropicana Field',
  'Idaho Central Credit Union Arena',
  'UNI-Dome',
  'Allegiant Stadium',
  'AT&T Stadium',
  'Lucas Oil Stadium',
  'NRG Stadium',
  'U.S. Bank Stadium',
  'State Farm Stadium',
  'Mercedes-Benz Superdome',
  'Caesars Superdome'
]);

const VENUE_LOCATIONS = new Map([
  ['Mercedes-Benz Stadium', 'Atlanta, GA'],
  ['Ford Field', 'Detroit, MI'],
  ['Carrier Dome', 'Syracuse, NY'],
  ['Alamodome', 'San Antonio, TX'],
  ['Allegiant Stadium', 'Las Vegas, NV'],
  ['AT&T Stadium', 'Arlington, TX'],
  ['Lucas Oil Stadium', 'Indianapolis, IN'],
  ['NRG Stadium', 'Houston, TX'],
  ['U.S. Bank Stadium', 'Minneapolis, MN'],
  ['State Farm Stadium', 'Glendale, AZ'],
  ['Caesars Superdome', 'New Orleans, LA'],
  ['Michigan Stadium', 'Ann Arbor, MI'],
  ['Ohio Stadium', 'Columbus, OH'],
  ['Beaver Stadium', 'University Park, PA'],
  ['Neyland Stadium', 'Knoxville, TN'],
  ['Tiger Stadium', 'Baton Rouge, LA'],
  ['Jordan-Hare Stadium', 'Auburn, AL'],
  ['Kinnick Stadium', 'Iowa City, IA'],
  ['Memorial Stadium', 'Lincoln, NE'],
  ['Kroger Field', 'Lexington, KY'],
  ['Vaught-Hemingway Stadium', 'Oxford, MS'],
  // International venues
  ['Aviva Stadium', 'Dublin, Ireland'],
  ['Wembley Stadium', 'London, England'],
  ['Tottenham Hotspur Stadium', 'London, England'],
  ['Allianz Arena', 'Munich, Germany'],
  ['Estadio Azteca', 'Mexico City, Mexico']
]);

const INTERNATIONAL_VENUES = new Map([
  ['Aviva Stadium', { country: 'Ireland', flag: '🇮🇪', city: 'Dublin' }],
  ['Wembley Stadium', { country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', city: 'London' }],
  ['Tottenham Hotspur Stadium', { country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', city: 'London' }],
  ['Allianz Arena', { country: 'Germany', flag: '🇩🇪', city: 'Munich' }],
  ['Estadio Azteca', { country: 'Mexico', flag: '🇲🇽', city: 'Mexico City' }]
]);

export class VenueDataEnhancer {
  
  /**
   * Clean up venue names by removing duplicate quotes and standardizing format
   */
  private cleanVenueName(venue: string): string {
    if (!venue) return venue;
    
    // Remove duplicate quotes
    let cleaned = venue.replace(/""""/g, '"');
    cleaned = cleaned.replace(/"""/g, '"');
    cleaned = cleaned.replace(/""/g, '"');
    
    return cleaned.trim();
  }
  
  /**
   * Check if a venue is a dome based on name patterns
   */
  private isDomeVenue(venue: string): boolean {
    if (!venue) return false;
    
    const cleanedVenue = this.cleanVenueName(venue);
    
    // Check known domes
    if (KNOWN_DOMES.has(cleanedVenue)) return true;
    
    // Check name patterns
    const lowerVenue = cleanedVenue.toLowerCase();
    return lowerVenue.includes('dome') || 
           lowerVenue.includes('indoor') ||
           lowerVenue.includes('superdome');
  }
  
  /**
   * Get venue location if available
   */
  private getVenueLocation(venue: string): string | null {
    if (!venue) return null;
    
    const cleanedVenue = this.cleanVenueName(venue);
    return VENUE_LOCATIONS.get(cleanedVenue) || null;
  }
  
  /**
   * Get international venue information
   */
  getInternationalVenueInfo(venue: string): { country: string; flag: string; city: string } | null {
    if (!venue) return null;
    
    const cleanedVenue = this.cleanVenueName(venue);
    return INTERNATIONAL_VENUES.get(cleanedVenue) || null;
  }
  
  /**
   * Fix venue data for all games
   */
  async enhanceVenueData(): Promise<void> {
    console.log('🏟️ Starting venue data enhancement...');
    
    try {
      // Get all games with venue data that needs cleaning
      const gamesWithVenues = await db
        .select({
          id: games.id,
          stadium: games.stadium,
          location: games.location,
          isDome: games.isDome
        })
        .from(games)
        .where(sql`stadium IS NOT NULL AND stadium != 'TBD'`);
        
      console.log(`Found ${gamesWithVenues.length} games with venue data to enhance`);
      
      let updatedCount = 0;
      let domeUpdatesCount = 0;
      
      for (const game of gamesWithVenues) {
        const originalStadium = game.stadium;
        const cleanedStadium = originalStadium ? this.cleanVenueName(originalStadium) : null;
        const isDome = cleanedStadium ? this.isDomeVenue(cleanedStadium) : false;
        const location = cleanedStadium ? this.getVenueLocation(cleanedStadium) : null;
        
        // Check if we need to update anything
        const needsUpdate = 
          (cleanedStadium !== originalStadium) ||
          (isDome !== game.isDome) ||
          (location && location !== game.location);
          
        if (needsUpdate) {
          await db.update(games)
            .set({
              stadium: cleanedStadium,
              location: location || cleanedStadium, // Use location if available, otherwise use stadium name
              isDome: isDome
            })
            .where(sql`id = ${game.id}`);
            
          updatedCount++;
          
          if (isDome !== game.isDome) {
            domeUpdatesCount++;
            console.log(`🏟️ Updated dome status for ${cleanedStadium}: ${isDome}`);
          }
          
          if (cleanedStadium !== originalStadium) {
            console.log(`🏟️ Cleaned venue name: "${originalStadium}" → "${cleanedStadium}"`);
          }
        }
      }
      
      console.log(`✅ Venue enhancement complete:`);
      console.log(`   - ${updatedCount} games updated`);
      console.log(`   - ${domeUpdatesCount} dome statuses corrected`);
      
    } catch (error) {
      console.error('❌ Error enhancing venue data:', error);
      throw error;
    }
  }
  
  /**
   * Get summary of current venue data
   */
  async getVenueSummary(): Promise<void> {
    console.log('📊 Venue Data Summary:');
    
    // Count games by venue type
    const venueStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN is_dome = true THEN 1 END) as dome_games,
        COUNT(CASE WHEN stadium = 'TBD' OR stadium IS NULL THEN 1 END) as tbd_venues,
        COUNT(DISTINCT stadium) as unique_stadiums
      FROM games 
      WHERE season >= 2024
    `);
    
    console.log('   Venue Statistics (2024+):');
    console.log(`   - Total games: ${venueStats[0].total_games}`);
    console.log(`   - Dome games: ${venueStats[0].dome_games}`);
    console.log(`   - TBD venues: ${venueStats[0].tbd_venues}`);
    console.log(`   - Unique stadiums: ${venueStats[0].unique_stadiums}`);
    
    // Top venues
    const topVenues = await db.execute(sql`
      SELECT stadium, COUNT(*) as game_count, is_dome
      FROM games 
      WHERE stadium IS NOT NULL AND stadium != 'TBD' AND season >= 2024
      GROUP BY stadium, is_dome
      ORDER BY game_count DESC
      LIMIT 10
    `);
    
    console.log('   Top Venues (2024+):');
    topVenues.forEach((venue, index) => {
      const domeStatus = venue.is_dome ? ' 🏟️' : '';
      console.log(`   ${index + 1}. ${venue.stadium}${domeStatus} (${venue.game_count} games)`);
    });
  }
}

// Export for use
export const venueEnhancer = new VenueDataEnhancer();