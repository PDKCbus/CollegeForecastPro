/**
 * Fill in missing scores for existing games in database
 * Use CFBD API to get scores for games that already have home/away team IDs
 */
import { storage } from './storage';

interface CFBDGameWithScores {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  home_points?: number;
  away_team: string;
  away_points?: number;
  completed?: boolean;
}

export class ScoreFiller {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('CFBD_API_KEY environment variable is required');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(endpoint, this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fill scores for all games missing scores in a specific season
   */
  async fillScoresForSeason(season: number): Promise<void> {
    console.log(`🔍 Filling scores for ${season} season...`);

    // Get all games from CFBD for this season
    const cfbdGames = await this.makeRequest<CFBDGameWithScores>('/games', {
      year: season,
      seasonType: 'regular'
    });

    console.log(`📊 Found ${cfbdGames.length} games from CFBD for ${season}`);

    // Filter to only completed games with scores
    const completedGames = cfbdGames.filter(game => 
      game.home_points !== null && 
      game.away_points !== null &&
      game.home_points !== undefined && 
      game.away_points !== undefined &&
      typeof game.home_points === 'number' &&
      typeof game.away_points === 'number'
    );

    console.log(`🏈 Found ${completedGames.length} completed games with scores`);

    let updated = 0;
    let errors = 0;

    for (const game of completedGames) {
      try {
        // Check if we have this game in our database
        const existingGame = await storage.getGame(game.id);
        
        if (existingGame) {
          // Update the game with scores and completion status
          const needsUpdate = 
            existingGame.homeTeamScore === null || 
            existingGame.awayTeamScore === null || 
            !existingGame.completed;
            
          if (needsUpdate) {
            await storage.updateGame(game.id, {
              homeTeamScore: game.home_points,
              awayTeamScore: game.away_points,
              completed: true
            });
            updated++;
            
            if (updated % 50 === 0) {
              console.log(`📈 Updated ${updated} games with scores and completion status...`);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error updating game ${game.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ ${season} season completed: ${updated} games updated, ${errors} errors`);
  }

  /**
   * Fill scores for all historical seasons
   */
  async fillAllHistoricalScores(): Promise<void> {
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    
    console.log(`🚀 Starting score fill for ${seasons.length} seasons...`);
    
    for (const season of seasons) {
      try {
        await this.fillScoresForSeason(season);
      } catch (error) {
        console.error(`❌ Error filling scores for ${season}:`, error);
      }
    }
    
    console.log(`🎉 All seasons completed!`);
  }

  /**
   * Mark all historical games with scores as completed
   * This helps populate the historical games section properly
   */
  async markHistoricalGamesCompleted(): Promise<void> {
    console.log(`🔄 Marking all games with scores as completed...`);
    
    const seasons = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    let totalUpdated = 0;
    
    for (const season of seasons) {
      try {
        console.log(`📅 Processing ${season} season...`);
        
        // Get all games from CFBD for this season to check completion status
        const cfbdGames = await this.makeRequest<CFBDGameWithScores>('/games', {
          year: season,
          seasonType: 'regular'
        });

        const completedCfbdGames = cfbdGames.filter(game => 
          game.home_points !== null && 
          game.away_points !== null &&
          typeof game.home_points === 'number' &&
          typeof game.away_points === 'number'
        );

        let seasonUpdated = 0;

        for (const game of completedCfbdGames) {
          try {
            const existingGame = await storage.getGame(game.id);
            
            if (existingGame && !existingGame.completed) {
              await storage.updateGame(game.id, {
                completed: true,
                homeTeamScore: game.home_points,
                awayTeamScore: game.away_points
              });
              seasonUpdated++;
              totalUpdated++;
            }
          } catch (error) {
            console.error(`❌ Error updating game ${game.id}:`, error);
          }
        }

        console.log(`✅ ${season}: ${seasonUpdated} games marked as completed`);
      } catch (error) {
        console.error(`❌ Error processing ${season}:`, error);
      }
    }
    
    console.log(`🎉 Completion update finished: ${totalUpdated} total games marked as completed!`);
  }
}

export const scoreFiller = new ScoreFiller();