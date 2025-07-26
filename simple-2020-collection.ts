import { storage } from './server/storage';

class Simple2020Collector {
  
  async collect2020Season() {
    console.log('🏈 Collecting 2020 Season with Proper Team Mapping...');
    
    try {
      // Fetch 2020 games from CFBD API
      const response = await fetch(
        `https://api.collegefootballdata.com/games?year=2020&seasonType=regular`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CFBD_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CFBD API error: ${response.status}`);
      }

      const games = await response.json();
      console.log(`📊 Found ${games.length} games for 2020`);

      let processedCount = 0;
      let skippedCount = 0;

      for (const game of games) {
        try {
          // Get or create teams using storage interface (handles team mapping correctly)
          const homeTeam = await storage.getOrCreateTeam({
            name: game.home_team,
            abbreviation: game.home_team.substring(0, 3).toUpperCase(),
            conference: game.home_conference || 'Unknown',
            division: null,
            logoUrl: null,
            color: '#000000',
            altColor: '#FFFFFF',
            wins: 0,
            losses: 0
          });

          const awayTeam = await storage.getOrCreateTeam({
            name: game.away_team,
            abbreviation: game.away_team.substring(0, 3).toUpperCase(),
            conference: game.away_conference || 'Unknown',
            division: null,
            logoUrl: null,
            color: '#000000', 
            altColor: '#FFFFFF',
            wins: 0,
            losses: 0
          });

          // Create game with proper team IDs
          const gameData = {
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            startDate: new Date(game.start_date),
            season: 2020,
            week: game.week || 1,
            stadium: game.venue || null,
            location: game.venue || null,
            spread: null, // 2020 had limited betting lines
            overUnder: null,
            homeTeamScore: game.home_points || null,
            awayTeamScore: game.away_points || null,
            completed: Boolean(game.home_points != null && game.away_points != null),
            isFeatured: false,
            isConferenceGame: Boolean(game.conference_game),
            isRivalryGame: false
          };

          await storage.createGame(gameData);
          processedCount++;

          if (processedCount % 50 === 0) {
            console.log(`✅ Processed ${processedCount}/${games.length} games`);
          }

        } catch (error) {
          console.log(`❌ Skipped game ${game.id}: ${error.message}`);
          skippedCount++;
        }
      }

      console.log(`\n✅ 2020 Season Collection Complete!`);
      console.log(`   Games processed: ${processedCount}`);
      console.log(`   Games skipped: ${skippedCount}`);
      console.log(`   Success rate: ${((processedCount / games.length) * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ 2020 collection failed:', error);
      throw error;
    }
  }
}

async function main() {
  const collector = new Simple2020Collector();
  await collector.collect2020Season();
  process.exit(0);
}

main().catch(console.error);