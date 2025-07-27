/**
 * Rick's Picks Prediction Engine
 * Data-driven predictions based on comprehensive historical analysis of 28,431 games
 */

interface GamePredictionFactors {
  weatherFactor: number;
  conferenceFactor: number;
  bettingMarketFactor: number;
  eloFactor: number;
  travelFactor: number;
}

interface RicksPrediction {
  gameId: number;
  spreadPick: string;
  spreadConfidence: number;
  totalPick: string;
  totalConfidence: number;
  keyFactors: string[];
  rickNotes: string;
  expectedValue: number;
}

export class RicksPicksPredictionEngine {
  // Historical insights from comprehensive analysis
  private readonly insights = {
    weather: {
      domeAdvantage: 2.0,        // +2.0 points per game in domes
      coldPenalty: -3.0,         // Sub-40°F reduces scoring
      windPenalty: -2.3,         // >15 MPH wind penalty
      rainPenalty: -1.5,         // Precipitation impact
      heatPenalty: -1.1          // >85°F penalty
    },
    conferences: {
      secAdvantage: 13.4,        // 63.4% vs 50% = +13.4% edge
      bigTenDefensive: -2.9,     // Fewer points per game
      bigTenUnderBias: 3.0,      // Statistical UNDER edge
      accParity: 2.9,            // More close games
      g5UpsetRate: 11.1          // Lower than expected
    },
    betting: {
      homeAltsFavoritePenalty: -4.7,  // Home favorites struggle ATS
      awayBias: 3.0,             // Vegas 3% biased toward away
      underBias: 1.6,            // 50.8% vs 49.2% = +1.6% UNDER edge
      smallSpreadAdvantage: 13.6, // Small spreads more predictable
      rankedTeamPenalty: -2.8    // Ranked favorites overvalued
    }
  };

  calculateWeatherFactor(game: any): number {
    let weatherScore = 0;
    
    // Dome advantage (statistically significant)
    if (game.isDome) {
      weatherScore += this.insights.weather.domeAdvantage;
    }
    
    // Temperature effects
    if (game.temperature !== null) {
      if (game.temperature < 40) {
        weatherScore += this.insights.weather.coldPenalty;
      } else if (game.temperature > 85) {
        weatherScore += this.insights.weather.heatPenalty;
      }
    }
    
    // Wind effects
    if (game.windSpeed && game.windSpeed > 15) {
      weatherScore += this.insights.weather.windPenalty;
    }
    
    // Precipitation
    if (game.precipitation > 0 || (game.weatherCondition && game.weatherCondition.toLowerCase().includes('rain'))) {
      weatherScore += this.insights.weather.rainPenalty;
    }
    
    return weatherScore;
  }

  calculateConferenceFactor(game: any): number {
    let confScore = 0;
    
    // SEC cross-conference advantage
    if ((game.homeTeam.conference === 'SEC' && ['Big Ten', 'Big 12', 'ACC', 'Pac-12'].includes(game.awayTeam.conference)) ||
        (game.awayTeam.conference === 'SEC' && ['Big Ten', 'Big 12', 'ACC', 'Pac-12'].includes(game.homeTeam.conference))) {
      
      const secAdvantage = this.insights.conferences.secAdvantage * 0.1; // Convert % to points
      if (game.homeTeam.conference === 'SEC') {
        confScore += secAdvantage;
      } else {
        confScore -= secAdvantage;
      }
    }
    
    // Big Ten defensive adjustment (favor UNDERS)
    if (game.homeTeam.conference === 'Big Ten' || game.awayTeam.conference === 'Big Ten') {
      confScore += this.insights.conferences.bigTenDefensive * 0.3; // Negative for UNDER bias
    }
    
    return confScore;
  }

  calculateBettingMarketFactor(game: any): number {
    let marketScore = 0;
    
    // Home favorite penalty (documented -4.7% ATS performance)
    if (game.spread && game.spread < 0) { // Home favorite
      marketScore += this.insights.betting.homeAltsFavoritePenalty * 0.1;
    }
    
    // Away team bias (Vegas 3% biased toward away)
    marketScore += this.insights.betting.awayBias * 0.1;
    
    // Ranked team penalty
    if (game.homeTeam.rank && game.spread < 0) { // Ranked home favorite
      marketScore += this.insights.betting.rankedTeamPenalty * 0.1;
    } else if (game.awayTeam.rank && game.spread > 0) { // Ranked away favorite
      marketScore -= this.insights.betting.rankedTeamPenalty * 0.1;
    }
    
    return marketScore;
  }

  calculateTravelFactor(game: any): number {
    // Travel distance penalties based on our analysis of 4,297 games
    if (!game.travelDistance) {
      return 0;
    }

    let travelPenalty = 0;
    
    // Coast-to-coast travel (>1500 miles): -6.5% ATS performance
    if (game.travelDistance > 1500) {
      travelPenalty = -2.5; // Away team penalty
    }
    // Cross-country travel (800-1500 miles): -2.3% ATS performance  
    else if (game.travelDistance > 800) {
      travelPenalty = -1.0;
    }
    // Regional travel (300-800 miles): -1.0% ATS performance
    else if (game.travelDistance > 300) {
      travelPenalty = -0.5;
    }
    
    // G5 teams actually perform better on road, so reduce penalty
    if (!this.isPower5(game.awayTeam.conference)) {
      travelPenalty *= 0.5; // G5 teams handle travel better
    }
    
    return travelPenalty;
  }

  private isPower5(conference: string): boolean {
    return ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12'].includes(conference);
  }

  calculateEloFactor(game: any): number {
    // CRITICAL: Only use ELO if BOTH teams have valid ratings
    // Never allow NULL/undefined ELO to be treated as 0 (terrible team)
    
    // Check for CFBD ELO data in game object first (authentic source)
    if (game.homePregameElo && game.awayPregameElo && 
        typeof game.homePregameElo === 'number' && typeof game.awayPregameElo === 'number') {
      const eloAdvantage = game.homePregameElo - game.awayPregameElo;
      return eloAdvantage / 25; // Convert to point spread
    }
    
    // Check for CFBD ELO data nested in cfbdEloData
    if (game.cfbdEloData && game.cfbdEloData.homePregameELO && game.cfbdEloData.awayPregameELO &&
        typeof game.cfbdEloData.homePregameELO === 'number' && typeof game.cfbdEloData.awayPregameELO === 'number') {
      const eloAdvantage = game.cfbdEloData.homePregameELO - game.cfbdEloData.awayPregameELO;
      return eloAdvantage / 25; // Convert to point spread
    }
    
    // Check for current ELO ratings in team objects - both must be valid
    if (game.homeTeam.currentEloRating && game.awayTeam.currentEloRating &&
        typeof game.homeTeam.currentEloRating === 'number' && typeof game.awayTeam.currentEloRating === 'number') {
      const eloAdvantage = (game.homeTeam.currentEloRating + 50) - game.awayTeam.currentEloRating; // +50 home advantage
      return eloAdvantage / 25;
    }
    
    // Fallback to our basic ELO if BOTH teams have valid ratings
    if (game.homeTeam.eloRating && game.awayTeam.eloRating &&
        typeof game.homeTeam.eloRating === 'number' && typeof game.awayTeam.eloRating === 'number') {
      const eloAdvantage = (game.homeTeam.eloRating + 50) - game.awayTeam.eloRating;
      return eloAdvantage / 25;
    }
    
    // NO ELO DATA AVAILABLE - return 0 (no ELO factor)
    return 0;
    
    // ELO-based spread with declining home field advantage (2.0 points modern era)
    const eloHomeAdvantage = 50; // Reduced from traditional 65
    const eloSpread = (game.homeTeam.eloRating + eloHomeAdvantage - game.awayTeam.eloRating) / 25;
    
    return eloSpread;
  }

  generateGamePrediction(game: any): RicksPrediction {
    const factors: GamePredictionFactors = {
      weatherFactor: this.calculateWeatherFactor(game),
      conferenceFactor: this.calculateConferenceFactor(game),
      bettingMarketFactor: this.calculateBettingMarketFactor(game),
      eloFactor: this.calculateEloFactor(game),
      travelFactor: this.calculateTravelFactor(game)
    };

    const prediction: RicksPrediction = {
      gameId: game.id,
      spreadPick: "NO PLAY",
      spreadConfidence: 50,
      totalPick: "NO PLAY", 
      totalConfidence: 50,
      keyFactors: [],
      rickNotes: "",
      expectedValue: 0
    };

    // SPREAD ANALYSIS
    if (game.spread !== null) {
      const adjustedSpread = game.spread + factors.weatherFactor + factors.conferenceFactor + factors.bettingMarketFactor + factors.travelFactor;
      const spreadEdge = Math.abs(adjustedSpread - game.spread);
      
      if (spreadEdge >= 2.0) { // Minimum 2-point edge for play
        if (adjustedSpread > game.spread) {
          prediction.spreadPick = `TAKE ${game.awayTeam.name} +${Math.abs(game.spread)}`;
        } else {
          prediction.spreadPick = `TAKE ${game.homeTeam.name} ${game.spread}`;
        }
        prediction.spreadConfidence = Math.min(85, 60 + (spreadEdge * 4));
        prediction.expectedValue = spreadEdge * 2; // Expected value calculation
      }
    }

    // TOTAL ANALYSIS
    if (game.overUnder !== null) {
      const totalAdjustment = factors.weatherFactor + (factors.conferenceFactor * 0.7);
      const totalEdge = Math.abs(totalAdjustment);
      
      // Add Big Ten UNDER bias
      let underBias = 0;
      if (game.homeTeam.conference === 'Big Ten' || game.awayTeam.conference === 'Big Ten') {
        underBias = this.insights.conferences.bigTenUnderBias;
      }
      
      // General UNDER edge from historical analysis
      const generalUnderEdge = this.insights.betting.underBias;
      
      if (totalEdge >= 2.5 || underBias > 2) {
        if (totalAdjustment > 0) {
          prediction.totalPick = `OVER ${game.overUnder}`;
          prediction.totalConfidence = Math.min(80, 55 + (totalEdge * 4));
        } else {
          prediction.totalPick = `UNDER ${game.overUnder}`;
          prediction.totalConfidence = Math.min(85, 55 + (totalEdge * 4) + underBias);
        }
      }
    }

    // KEY FACTORS
    const keyFactors = [];
    
    // CFBD ELO factors (highest priority - authentic data)
    let eloAdvantage = 0;
    let hasEloData = false;
    
    // Check for ELO data in game object first (both teams must have valid ELO)
    if (game.homePregameElo && game.awayPregameElo && 
        typeof game.homePregameElo === 'number' && typeof game.awayPregameElo === 'number') {
      eloAdvantage = game.homePregameElo - game.awayPregameElo;
      hasEloData = true;
    }
    // Check for nested CFBD ELO data (both teams must have valid ELO)
    else if (game.cfbdEloData && game.cfbdEloData.homePregameELO && game.cfbdEloData.awayPregameELO &&
             typeof game.cfbdEloData.homePregameELO === 'number' && typeof game.cfbdEloData.awayPregameELO === 'number') {
      eloAdvantage = game.cfbdEloData.homePregameELO - game.cfbdEloData.awayPregameELO;
      hasEloData = true;
    }
    // Check for current team ELO ratings (both teams must have valid ELO)
    else if (game.homeTeam.currentEloRating && game.awayTeam.currentEloRating &&
             typeof game.homeTeam.currentEloRating === 'number' && typeof game.awayTeam.currentEloRating === 'number') {
      eloAdvantage = game.homeTeam.currentEloRating - game.awayTeam.currentEloRating;
      hasEloData = true;
    }
    
    if (hasEloData && Math.abs(eloAdvantage) > 50) {
      keyFactors.push(`ELO edge: ${eloAdvantage > 0 ? 'Home' : 'Away'} ${Math.abs(eloAdvantage)} points`);
    }
    
    // Win probability from CFBD or calculated from ELO
    if (game.homeWinProbability && game.awayWinProbability) {
      const winProb = Math.max(game.homeWinProbability, game.awayWinProbability);
      if (winProb > 65) {
        keyFactors.push(`High win probability: ${winProb.toFixed(1)}%`);
      }
    } else if (game.cfbdEloData && game.cfbdEloData.homeWinProb) {
      const winProb = Math.max(game.cfbdEloData.homeWinProb, game.cfbdEloData.awayWinProb);
      if (winProb > 0.65) {
        keyFactors.push(`High win probability: ${(winProb * 100).toFixed(1)}%`);
      }
    }
    
    // Ranking factors (official AP/Coaches Poll rankings)
    const homeRank = game.homeTeamRank || game.homeTeam.rank;
    const awayRank = game.awayTeamRank || game.awayTeam.rank;
    
    if (homeRank && awayRank) {
      // Both teams ranked - analyze ranking differential
      const rankDiff = awayRank - homeRank; // Positive means home team ranked higher
      if (Math.abs(rankDiff) >= 10) {
        const favoredTeam = rankDiff > 0 ? 'Home' : 'Away';
        keyFactors.push(`Ranking edge: ${favoredTeam} ranked ${Math.abs(rankDiff)} spots higher`);
      }
    } else if (homeRank && !awayRank) {
      // Only home team ranked
      if (homeRank <= 15) {
        keyFactors.push(`Ranked home team (#${homeRank}) vs unranked`);
      }
    } else if (awayRank && !homeRank) {
      // Only away team ranked
      if (awayRank <= 15) {
        keyFactors.push(`Ranked away team (#${awayRank}) vs unranked`);
      }
    }
    
    // Top 5 vs Top 25 special cases
    if (homeRank && homeRank <= 5 && awayRank && awayRank > 15) {
      keyFactors.push(`Elite home team (#${homeRank}) vs lower-ranked (#${awayRank})`);
    } else if (awayRank && awayRank <= 5 && homeRank && homeRank > 15) {
      keyFactors.push(`Elite away team (#${awayRank}) vs lower-ranked (#${homeRank})`);
    }
    
    // Travel distance factors
    if (game.travelDistance && game.travelDistance > 800) {
      if (game.travelDistance > 1500) {
        keyFactors.push("Coast-to-coast travel penalty (-6.5% ATS)");
      } else {
        keyFactors.push("Cross-country travel factor");
      }
    }
    
    if (Math.abs(factors.weatherFactor) > 1) {
      keyFactors.push(`Weather: ${factors.weatherFactor > 0 ? '+' : ''}${factors.weatherFactor.toFixed(1)}`);
    }
    if (Math.abs(factors.conferenceFactor) > 1) {
      keyFactors.push(`Conference: ${factors.conferenceFactor > 0 ? '+' : ''}${factors.conferenceFactor.toFixed(1)}`);
    }
    if (Math.abs(factors.bettingMarketFactor) > 0.5) {
      keyFactors.push(`Market inefficiency`);
    }
    if (Math.abs(factors.eloFactor) > 2 && !game.cfbdEloData) {
      keyFactors.push(`ELO edge: ${factors.eloFactor > 0 ? '+' : ''}${factors.eloFactor.toFixed(1)}`);
    }
    
    prediction.keyFactors = keyFactors.length > 0 ? keyFactors : ["Balanced matchup"];

    // RICK'S NOTES
    prediction.rickNotes = this.generateRickNotes(game, factors, prediction);

    return prediction;
  }

  private generateRickNotes(game: any, factors: GamePredictionFactors, prediction: RicksPrediction): string {
    const notes = [];
    
    // CFBD ELO commentary (highest priority)
    if (game.cfbdEloData) {
      const eloAdvantage = game.cfbdEloData.homePregameELO - game.cfbdEloData.awayPregameELO;
      if (Math.abs(eloAdvantage) > 100) {
        notes.push("Major talent gap according to CFBD ELO ratings");
      } else if (Math.abs(eloAdvantage) < 25) {
        notes.push("Even matchup per CFBD ELO - expect tight game");
      }
    }
    
    // Travel commentary
    if (game.travelDistance && game.travelDistance > 1500) {
      notes.push("Cross-country travel historically favors home team");
    } else if (game.travelDistance && game.travelDistance > 800) {
      notes.push("Long travel distance could impact away team performance");
    }
    
    // Weather commentary
    if (game.isDome) {
      notes.push("Dome advantage creates scoring boost");
    } else if (game.temperature && game.temperature < 40) {
      notes.push("Cold weather limits offensive production");
    } else if (game.windSpeed > 15) {
      notes.push("High winds hurt passing games");
    }
    
    // Conference commentary
    if (game.homeTeam.conference === 'SEC' && ['Big Ten', 'Big 12', 'ACC', 'Pac-12'].includes(game.awayTeam.conference)) {
      notes.push("SEC home field advantage in cross-conference play");
    } else if (game.homeTeam.conference === 'Big Ten' || game.awayTeam.conference === 'Big Ten') {
      notes.push("Big Ten defensive style favors UNDER");
    }
    
    // Market commentary
    if (game.spread < 0 && game.homeTeam.rank) {
      notes.push("Ranked home favorites historically struggle ATS");
    } else if (game.spread < 0) {
      notes.push("Home favorites underperform by 4.7% ATS");
    }
    
    // Confidence level
    if (prediction.spreadConfidence > 75 || prediction.totalConfidence > 75) {
      notes.push("High-confidence play based on historical edges");
    }
    
    return notes.length > 0 ? notes.join(" | ") : "Solid fundamental matchup - no major edges identified";
  }

  // Generate predictions for multiple games
  generatePredictions(games: any[]): RicksPrediction[] {
    return games.map(game => this.generateGamePrediction(game));
  }

  // Get top confidence plays
  getTopPlays(predictions: RicksPrediction[], minConfidence: number = 65): RicksPrediction[] {
    return predictions.filter(p => 
      p.spreadConfidence >= minConfidence || p.totalConfidence >= minConfidence
    ).sort((a, b) => Math.max(b.spreadConfidence, b.totalConfidence) - Math.max(a.spreadConfidence, a.totalConfidence));
  }
}

export default RicksPicksPredictionEngine;