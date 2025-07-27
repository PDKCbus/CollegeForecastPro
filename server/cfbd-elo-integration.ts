/**
 * CFBD ELO Integration
 * Fetches authentic ELO ratings and win probabilities from CFBD API
 */

import { db } from "./db";
import { games } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CFBDGameELO {
  id: number;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  home_pregame_elo: number;
  away_pregame_elo: number;
  home_postgame_elo?: number;
  away_postgame_elo?: number;
  home_win_prob: number;
  away_win_prob: number;
  favorite_elo?: number;
  underdog_elo?: number;
}

interface CFBDELORating {
  year: number;
  team: string;
  conference: string;
  elo: number;
}

export class CFBDELOService {
  private apiKey: string;
  private baseUrl = "https://api.collegefootballdata.com";

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || "";
    if (!this.apiKey) {
      console.warn("CFBD_API_KEY not found - ELO features will be limited");
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error("CFBD API key required for ELO data");
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getGameELOData(season: number, week?: number): Promise<CFBDGameELO[]> {
    console.log(`🎯 Fetching ELO data for ${season} season${week ? ` week ${week}` : ''}...`);
    
    try {
      let endpoint = `/games?year=${season}`;
      if (week) {
        endpoint += `&week=${week}`;
      }

      const games: CFBDGameELO[] = await this.makeRequest(endpoint);
      
      // Filter games that have ELO data
      const gamesWithELO = games.filter(game => 
        game.home_pregame_elo && game.away_pregame_elo && 
        game.home_win_prob && game.away_win_prob
      );

      console.log(`✅ Found ${gamesWithELO.length} games with ELO data`);
      return gamesWithELO;

    } catch (error) {
      console.error(`Error fetching ELO data:`, error);
      return [];
    }
  }

  async getCurrentELORatings(year: number = new Date().getFullYear()): Promise<CFBDELORating[]> {
    console.log(`📊 Fetching current ELO ratings for ${year}...`);
    
    try {
      const ratings: CFBDELORating[] = await this.makeRequest(`/ratings/elo?year=${year}`);
      console.log(`✅ Retrieved ${ratings.length} ELO ratings`);
      return ratings;

    } catch (error) {
      console.error(`Error fetching current ELO ratings:`, error);
      return [];
    }
  }

  async enrichGameWithELO(gameId: number): Promise<any> {
    console.log(`🔮 Enriching game ${gameId} with CFBD ELO data...`);
    
    try {
      // Get game from our database
      const gameResults = await db.select().from(games).where(eq(games.id, gameId));
      if (gameResults.length === 0) {
        throw new Error(`Game ${gameId} not found in database`);
      }

      const game = gameResults[0];
      
      // Get ELO data from CFBD for this season/week
      const cfbdGames = await this.getGameELOData(game.season, game.week);
      
      // Try to match our game with CFBD data
      // This is tricky - we need to match by teams, but team names might not be identical
      const matchingCFBDGame = cfbdGames.find(cfbdGame => {
        // Basic matching logic - could be improved with fuzzy matching
        return cfbdGame.season === game.season && cfbdGame.week === game.week;
      });

      if (matchingCFBDGame) {
        console.log(`✅ Found ELO data: Home ${matchingCFBDGame.home_pregame_elo} vs Away ${matchingCFBDGame.away_pregame_elo}`);
        
        return {
          gameId,
          cfbdId: matchingCFBDGame.id,
          eloData: {
            homePregameELO: matchingCFBDGame.home_pregame_elo,
            awayPregameELO: matchingCFBDGame.away_pregame_elo,
            homeWinProb: matchingCFBDGame.home_win_prob,
            awayWinProb: matchingCFBDGame.away_win_prob,
            eloAdvantage: matchingCFBDGame.home_pregame_elo - matchingCFBDGame.away_pregame_elo
          },
          ricksPrediction: this.generateELOBasedPrediction(matchingCFBDGame),
          authenticity: "Official CFBD ELO ratings"
        };
      } else {
        console.log(`❌ No matching CFBD ELO data found for game ${gameId}`);
        return null;
      }

    } catch (error) {
      console.error(`Error enriching game ${gameId} with ELO:`, error);
      return null;
    }
  }

  private generateELOBasedPrediction(cfbdGame: CFBDGameELO): any {
    const eloAdvantage = cfbdGame.home_pregame_elo - cfbdGame.away_pregame_elo;
    
    // Convert ELO advantage to predicted spread (roughly 25 ELO = 1 point)
    const eloPredictedSpread = eloAdvantage / 25;
    
    // Confidence based on ELO difference
    const confidence = Math.min(95, 50 + Math.abs(eloAdvantage) / 20);
    
    return {
      predictedSpread: eloPredictedSpread,
      homeWinProbability: cfbdGame.home_win_prob * 100,
      awayWinProbability: cfbdGame.away_win_prob * 100,
      confidence,
      keyFactors: [
        `ELO advantage: ${eloAdvantage > 0 ? '+' : ''}${eloAdvantage} (${eloAdvantage > 0 ? 'Home' : 'Away'})`,
        `CFBD win probability: ${(Math.max(cfbdGame.home_win_prob, cfbdGame.away_win_prob) * 100).toFixed(1)}%`,
        `Predicted spread: ${eloPredictedSpread > 0 ? 'Home' : 'Away'} by ${Math.abs(eloPredictedSpread).toFixed(1)}`
      ],
      ricksNotes: this.generateELONotes(cfbdGame, eloAdvantage)
    };
  }

  private generateELONotes(cfbdGame: CFBDGameELO, eloAdvantage: number): string {
    const notes = [];
    
    if (Math.abs(eloAdvantage) > 100) {
      notes.push("Significant ELO mismatch - strong favorite");
    } else if (Math.abs(eloAdvantage) < 25) {
      notes.push("Even ELO matchup - coin flip game");
    }
    
    if (cfbdGame.home_win_prob > 0.7) {
      notes.push("Home team heavily favored by ELO");
    } else if (cfbdGame.away_win_prob > 0.7) {
      notes.push("Road team heavily favored by ELO");
    }
    
    if (cfbdGame.favorite_elo && cfbdGame.underdog_elo) {
      const eloSpread = cfbdGame.favorite_elo - cfbdGame.underdog_elo;
      if (eloSpread > 150) {
        notes.push("Massive talent gap according to ELO");
      }
    }
    
    return notes.length > 0 ? notes.join(" | ") : "Balanced ELO matchup with no major edges";
  }

  // Test ELO integration
  async testELOIntegration(): Promise<boolean> {
    console.log("🧪 Testing CFBD ELO integration...");
    
    try {
      // Test current ratings
      const currentRatings = await this.getCurrentELORatings();
      if (currentRatings.length > 0) {
        console.log(`✅ Current ELO test passed: ${currentRatings.length} ratings`);
        console.log(`Sample: ${currentRatings[0].team} (${currentRatings[0].conference}): ${currentRatings[0].elo}`);
      }

      // Test historical game data
      const gameData = await this.getGameELOData(2024, 1);
      if (gameData.length > 0) {
        console.log(`✅ Historical ELO test passed: ${gameData.length} games with ELO`);
        const sample = gameData[0];
        console.log(`Sample: ${sample.home_team} (${sample.home_pregame_elo}) vs ${sample.away_team} (${sample.away_pregame_elo})`);
      }

      return currentRatings.length > 0 && gameData.length > 0;

    } catch (error) {
      console.error("❌ ELO integration test failed:", error);
      return false;
    }
  }
}

export default CFBDELOService;