#!/usr/bin/env tsx
/**
 * Test Reddit Sentiment Integration
 * Show how sentiment could enhance our prediction algorithm
 */

import { sentimentService } from './server/sentiment';
import { storage } from './server/storage';

async function testSentimentIntegration() {
  console.log('🔮 Testing Reddit Sentiment Integration...\n');
  
  try {
    // Get a sample upcoming game
    const upcomingGames = await storage.getUpcomingGames(5, 0);
    
    if (upcomingGames.length === 0) {
      console.log('No upcoming games found for testing');
      return;
    }
    
    const game = upcomingGames[0];
    console.log(`🏈 Testing sentiment for: ${game.homeTeam.name} vs ${game.awayTeam.name}\n`);
    
    // Analyze sentiment for both teams
    console.log('📊 Analyzing Reddit r/CFB sentiment...');
    await sentimentService.analyzeTeamSentiment(game.homeTeam.id);
    await sentimentService.analyzeTeamSentiment(game.awayTeam.id);
    
    // Get sentiment results
    const homeSentiment = await storage.getSentimentByTeam(game.homeTeam.id);
    const awaySentiment = await storage.getSentimentByTeam(game.awayTeam.id);
    
    console.log(`\n🏠 ${game.homeTeam.name} Sentiment:`);
    if (homeSentiment.length > 0) {
      const sentiment = homeSentiment[0];
      console.log(`   Score: ${(sentiment.sentimentScore * 100).toFixed(1)}%`);
      console.log(`   Posts: ${sentiment.positiveCount} positive, ${sentiment.negativeCount} negative`);
      console.log(`   Keywords: ${sentiment.keywords?.slice(0, 3).join(', ')}`);
    }
    
    console.log(`\n✈️ ${game.awayTeam.name} Sentiment:`);
    if (awaySentiment.length > 0) {
      const sentiment = awaySentiment[0];
      console.log(`   Score: ${(sentiment.sentimentScore * 100).toFixed(1)}%`);
      console.log(`   Posts: ${sentiment.positiveCount} positive, ${sentiment.negativeCount} negative`);
      console.log(`   Keywords: ${sentiment.keywords?.slice(0, 3).join(', ')}`);
    }
    
    // Calculate potential sentiment factor
    if (homeSentiment.length > 0 && awaySentiment.length > 0) {
      const homeSent = homeSentiment[0].sentimentScore;
      const awaySent = awaySentiment[0].sentimentScore;
      const sentimentDifferential = homeSent - awaySent;
      
      console.log(`\n🧠 SENTIMENT ANALYSIS:`);
      console.log(`   Home Sentiment: ${(homeSent * 100).toFixed(1)}%`);
      console.log(`   Away Sentiment: ${(awaySent * 100).toFixed(1)}%`);
      console.log(`   Differential: ${(sentimentDifferential * 100).toFixed(1)}%`);
      
      // Potential sentiment factor for betting
      let sentimentFactor = 0;
      let sentimentImpact = '';
      
      if (Math.abs(sentimentDifferential) > 0.2) {
        sentimentFactor = sentimentDifferential * 2.5; // Scale to meaningful points
        if (sentimentDifferential > 0) {
          sentimentImpact = `Strong home team buzz (+${sentimentFactor.toFixed(1)} pts)`;
        } else {
          sentimentImpact = `Strong away team buzz (${sentimentFactor.toFixed(1)} pts)`;
        }
      } else if (Math.abs(sentimentDifferential) > 0.1) {
        sentimentFactor = sentimentDifferential * 1.5;
        sentimentImpact = `Moderate sentiment edge (${sentimentFactor > 0 ? '+' : ''}${sentimentFactor.toFixed(1)} pts)`;
      } else {
        sentimentImpact = 'Neutral sentiment, no edge';
      }
      
      console.log(`   🎯 Potential Betting Factor: ${sentimentImpact}`);
      
      // Show how this would integrate
      console.log(`\n🔧 INTEGRATION EXAMPLE:`);
      console.log(`   Current Algorithm: Weather + Conference + Home Field + Betting Value`);
      console.log(`   + Large Favorite Risk + Seasonal Patterns + Weather Interactions`);
      console.log(`   + NEW: Reddit Sentiment Factor: ${sentimentFactor > 0 ? '+' : ''}${sentimentFactor.toFixed(1)} points`);
      console.log(`   📈 This could push our 55.3% accuracy higher!`);
    }
    
  } catch (error) {
    console.error('❌ Sentiment integration test failed:', error);
  }
}

// Run the test
testSentimentIntegration().catch(console.error);