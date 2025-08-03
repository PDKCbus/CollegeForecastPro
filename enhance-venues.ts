import { venueEnhancer } from './server/venue-data-enhancer';

async function main() {
  try {
    console.log('🏟️ Starting venue data enhancement process...');
    
    // Show current summary
    await venueEnhancer.getVenueSummary();
    
    // Enhance the data
    await venueEnhancer.enhanceVenueData();
    
    // Show updated summary
    console.log('\n📊 Updated venue data:');
    await venueEnhancer.getVenueSummary();
    
    console.log('\n✅ Venue enhancement complete!');
  } catch (error) {
    console.error('❌ Venue enhancement failed:', error);
    process.exit(1);
  }
}

main();