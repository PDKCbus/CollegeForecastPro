/**
 * Apply Rick's Picks real predictions to all upcoming games
 * Replaces fake predictions with data-driven algorithm results
 */

import { storage } from './storage';
import { ricksPicksEngine } from './prediction-engine';

export async function applyRicksPicksToUpcomingGames(): Promise<void> {
  console.log('🎯 Starting Rick\'s Picks prediction generation for all upcoming games...');
  
  try {
    // Get all upcoming games
    const upcomingGames = await storage.getUpcomingGames(50, 0);
    console.log(`📊 Found ${upcomingGames.length} upcoming games to analyze`);
    
    let predictionsGenerated = 0;
    
    for (const game of upcomingGames) {
      try {
        // Get team details
        const homeTeam = await storage.getTeam(game.homeTeamId);
        const awayTeam = await storage.getTeam(game.awayTeamId);
        
        if (!homeTeam || !awayTeam) {
          console.log(`⚠️ Missing team data for game ${game.id}, skipping`);
          continue;
        }
        
        // Generate prediction using Rick's algorithm
        const prediction = await ricksPicksEngine.generatePrediction(
          homeTeam.name,
          awayTeam.name,
          homeTeam.conference || 'Independent',
          awayTeam.conference || 'Independent',
          {
            temperature: game.temperature,
            windSpeed: game.windSpeed,
            isDome: game.isDome || false,
            precipitation: game.precipitation,
            weatherCondition: game.weatherCondition
          },
          game.spread,
          false // assuming not neutral site
        );
        
        // Create/update prediction record
        try {
          await storage.createPrediction({
            gameId: game.id,
            prediction: prediction.prediction,
            confidence: prediction.confidence === 'High' ? 85 : prediction.confidence === 'Medium' ? 70 : 55,
            keyFactors: prediction.keyFactors,
            spread: prediction.spread,
            total: game.overUnder || 48.5,
            recommendedBet: prediction.recommendedBet || null,
            reasoning: `Data-driven analysis: ${prediction.keyFactors.slice(0, 2).join('. ')}`
          });
          
          predictionsGenerated++;
          
          if (prediction.recommendedBet) {
            console.log(`✅ ${homeTeam.name} vs ${awayTeam.name}: ${prediction.prediction} (${prediction.confidence}) - ${prediction.recommendedBet}`);
          } else {
            console.log(`✅ ${homeTeam.name} vs ${awayTeam.name}: ${prediction.prediction} (${prediction.confidence})`);
          }
          
        } catch (predictionError) {
          console.log(`⚠️ Failed to save prediction for game ${game.id}:`, predictionError);
        }
        
      } catch (gameError) {
        console.log(`⚠️ Error processing game ${game.id}:`, gameError);
      }
    }
    
    console.log(`🎯 Rick's Picks generation complete: ${predictionsGenerated} predictions generated`);
    
  } catch (error) {
    console.error('❌ Failed to apply Rick\'s Picks:', error);
    throw error;
  }
}

// Run if called directly  
if (import.meta.url === `file://${process.argv[1]}`) {
  applyRicksPicksToUpcomingGames()
    .then(() => {
      console.log('✅ Rick\'s Picks application completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Rick\'s Picks application failed:', error);
      process.exit(1);
    });
}