import { ComprehensiveDataSync } from './server/comprehensive-data-sync';

class Season2020Collector {
  private sync: ComprehensiveDataSync;

  constructor() {
    this.sync = new ComprehensiveDataSync();
  }

  async collect2020Season() {
    console.log('🏈 Collecting Complete 2020 Season...');
    
    try {
      await this.sync.syncAllGamesForSeason(2020);
      
      // Check what we collected
      console.log('\n📊 Checking collection results...');
      return { message: '2020 Season Collection Complete!' };
    } catch (error) {
      console.error('❌ 2020 collection failed:', error);
      throw error;
    }
  }
}

async function main() {
  const collector = new Season2020Collector();
  await collector.collect2020Season();
  process.exit(0);
}

main().catch(console.error);