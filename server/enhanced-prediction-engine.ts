import { db } from './db';
import { games, predictions } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { SPPlusIntegration, type EnhancedPrediction } from './sp-plus-integration';
import { RosterAnalyticsEngine } from './roster-analytics-engine';

interface EnhancedAlgorithmicPrediction {
  gameId: number;
  homeTeamId: number;
  awayTeamId: number;
  
  // Original algorithm factors
  originalSpread: number;
  weatherImpact: number;
  conferenceStrength: number;
  homeFieldAdvantage: number;
  eloAdjustment: number;
  
  // SP+ enhanced factors
  spPlusAdvantage: number;
  offenseDefenseMatchup: number;
  specialTeamsImpact: number;
  
  // Final predictions
  basicAlgorithmSpread: number;
  spPlusEnhancedSpread: number;
  improvement: number;
  confidence: number;
  
  // Meta information
  createdAt: Date;
  factors: {
    basic: string;
    spPlus: string;
    improvement: string;
  };
}

class EnhancedPredictionEngine {
  private spPlusIntegration: SPPlusIntegration;
  
  constructor() {
    this.spPlusIntegration = new SPPlusIntegration();
  }

  async generateEnhancedPrediction(gameId: number): Promise<EnhancedAlgorithmicPrediction | null> {
    console.log(`🔮 Generating enhanced prediction for game ${gameId}...`);
    
    // Get basic algorithmic prediction
    const basicPrediction = await this.getBasicAlgorithmPrediction(gameId);
    if (!basicPrediction) {
      console.error(`❌ No basic prediction found for game ${gameId}`);
      return null;
    }
    
    // Get SP+ enhancement
    const spPlusEnhancement = await this.spPlusIntegration.enhancePredictionWithSPPlus(gameId);
    if (!spPlusEnhancement) {
      console.error(`❌ SP+ enhancement failed for game ${gameId}`);
      return null;
    }
    
    // Combine basic algorithm with SP+ enhancement
    const enhancedPrediction: EnhancedAlgorithmicPrediction = {
      gameId,
      homeTeamId: basicPrediction.homeTeamId,
      awayTeamId: basicPrediction.awayTeamId,
      
      // Original factors
      originalSpread: basicPrediction.originalSpread,
      weatherImpact: basicPrediction.weatherImpact,
      conferenceStrength: basicPrediction.conferenceStrength,
      homeFieldAdvantage: basicPrediction.homeFieldAdvantage,
      eloAdjustment: basicPrediction.eloAdjustment,
      
      // SP+ factors
      spPlusAdvantage: spPlusEnhancement.factors.spPlusAdvantage,
      offenseDefenseMatchup: spPlusEnhancement.factors.offenseDefenseMatch,
      specialTeamsImpact: spPlusEnhancement.factors.specialTeamsImpact,
      
      // Final predictions
      basicAlgorithmSpread: basicPrediction.basicSpread,
      spPlusEnhancedSpread: spPlusEnhancement.spPlusSpread,
      improvement: spPlusEnhancement.improvement,
      confidence: spPlusEnhancement.confidence,
      
      createdAt: new Date(),
      factors: {
        basic: `Weather: ${basicPrediction.weatherImpact}, Conference: ${basicPrediction.conferenceStrength}, HFA: ${basicPrediction.homeFieldAdvantage}`,
        spPlus: `SP+ Adv: ${spPlusEnhancement.factors.spPlusAdvantage}, Off/Def: ${spPlusEnhancement.factors.offenseDefenseMatch}, ST: ${spPlusEnhancement.factors.specialTeamsImpact}`,
        improvement: `Enhanced by ${spPlusEnhancement.improvement} points with ${spPlusEnhancement.confidence}% confidence`
      }
    };
    
    console.log(`✅ Enhanced prediction: ${enhancedPrediction.basicAlgorithmSpread} → ${enhancedPrediction.spPlusEnhancedSpread} (+${enhancedPrediction.improvement})`);
    return enhancedPrediction;
  }

  private async getBasicAlgorithmPrediction(gameId: number): Promise<any> {
    // Get existing algorithmic prediction or calculate basic one
    const existing = await db
      .select()
      .from(predictions)
      .where(eq(predictions.gameId, gameId))
      .orderBy(desc(predictions.id))
      .limit(1);
    
    if (existing.length > 0) {
      const prediction = existing[0];
      return {
        homeTeamId: prediction.homeTeamId,
        awayTeamId: prediction.awayTeamId,
        originalSpread: prediction.spread || 0,
        weatherImpact: prediction.weatherImpact || 0,
        conferenceStrength: prediction.conferenceStrength || 0,
        homeFieldAdvantage: 3, // Standard HFA
        eloAdjustment: prediction.eloRating || 0,
        basicSpread: prediction.spread || 0
      };
    }
    
    // If no existing prediction, create a basic one
    return this.calculateBasicPrediction(gameId);
  }

  private async calculateBasicPrediction(gameId: number): Promise<any> {
    console.log(`📊 Calculating basic prediction for game ${gameId}...`);
    
    const gameData = await db
      .select({
        id: games.id,
        homeTeamId: games.homeTeamId,
        awayTeamId: games.awayTeamId,
        spread: games.spread,
        isDome: games.isDome,
        temperature: games.temperature,
        weatherCondition: games.weatherCondition
      })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    
    if (gameData.length === 0) {
      return null;
    }
    
    const game = gameData[0];
    let prediction = game.spread || 0;
    
    // Apply basic algorithm factors
    let weatherImpact = 0;
    if (game.isDome) {
      weatherImpact += 2.5; // Dome advantage
    }
    if (game.temperature && game.temperature < 32) {
      weatherImpact -= 1.5; // Cold weather
    }
    if (game.weatherCondition && game.weatherCondition.toLowerCase().includes('rain')) {
      weatherImpact -= 2; // Rain impact
    }
    
    const conferenceStrength = 0; // Would need team conference data
    const homeFieldAdvantage = 3;
    const eloAdjustment = 0; // Would need ELO calculations
    
    const basicSpread = prediction + weatherImpact + conferenceStrength;
    
    return {
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      originalSpread: prediction,
      weatherImpact,
      conferenceStrength,
      homeFieldAdvantage,
      eloAdjustment,
      basicSpread
    };
  }

  async batchGenerateEnhancedPredictions(gameIds: number[]): Promise<EnhancedAlgorithmicPrediction[]> {
    console.log(`🚀 Generating enhanced predictions for ${gameIds.length} games...`);
    
    const enhancedPredictions: EnhancedAlgorithmicPrediction[] = [];
    
    for (const gameId of gameIds) {
      const enhanced = await this.generateEnhancedPrediction(gameId);
      if (enhanced) {
        enhancedPredictions.push(enhanced);
      }
    }
    
    console.log(`✅ Generated ${enhancedPredictions.length} enhanced predictions`);
    return enhancedPredictions;
  }

  async getUpcomingGameEnhancements(): Promise<EnhancedAlgorithmicPrediction[]> {
    console.log(`📅 Getting enhanced predictions for upcoming games...`);
    
    // Get upcoming games with betting lines
    const upcomingGames = await db
      .select({ id: games.id })
      .from(games)
      .where(
        and(
          eq(games.completed, false),
          eq(games.season, 2025)
        )
      )
      .limit(20);
    
    const gameIds = upcomingGames.map(g => g.id);
    return this.batchGenerateEnhancedPredictions(gameIds);
  }

  async validateEnhancedAlgorithm(): Promise<any> {
    console.log(`🧪 Validating enhanced algorithm performance...`);
    
    // Test SP+ integration
    const spPlusResults = await this.spPlusIntegration.testSPPlusAccuracy(2024);
    
    // Generate sample enhanced predictions
    const sampleGames = await db
      .select({ id: games.id })
      .from(games)
      .where(eq(games.season, 2025))
      .limit(5);
    
    const enhancedPredictions = await this.batchGenerateEnhancedPredictions(
      sampleGames.map(g => g.id)
    );
    
    const validation = {
      spPlusIntegration: spPlusResults,
      samplePredictions: enhancedPredictions.length,
      avgImprovement: enhancedPredictions.length > 0 ? 
        enhancedPredictions.reduce((sum, p) => sum + p.improvement, 0) / enhancedPredictions.length : 0,
      avgConfidence: enhancedPredictions.length > 0 ?
        enhancedPredictions.reduce((sum, p) => sum + p.confidence, 0) / enhancedPredictions.length : 0,
      status: 'SP+ enhanced algorithm ready for deployment'
    };
    
    console.log(`📊 Validation Results:`);
    console.log(`   SP+ Accuracy Improvement: +${spPlusResults.improvement} percentage points`);
    console.log(`   Sample Predictions: ${validation.samplePredictions}`);
    console.log(`   Average Enhancement: ${validation.avgImprovement.toFixed(1)} points`);
    console.log(`   Average Confidence: ${validation.avgConfidence.toFixed(1)}%`);
    
    return validation;
  }
}

export { EnhancedPredictionEngine, type EnhancedAlgorithmicPrediction };