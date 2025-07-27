/**
 * ELO Ratings Collector
 * Collects and stores authentic CFBD ELO ratings for teams and games
 */

import { db } from "./db";
import { games, teams } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface CFBDELORating {
  year: number;
  team: string;
  conference: string;
  elo: number;
}

interface CFBDGameWithELO {
  id: number;
  season: number;
  week: number;
  home_team: string;
  away_team: string;
  home_pregame_elo?: number;
  away_pregame_elo?: number;
  home_postgame_elo?: number;
  away_postgame_elo?: number;
  home_win_prob?: number;
  away_win_prob?: number;
}

export class ELORatingsCollector {
  private apiKey: string;
  private baseUrl = "https://api.collegefootballdata.com";

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || "";
  }

  private async makeRequest(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      console.warn("CFBD_API_KEY not available - ELO collection skipped");
      return [];
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
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
    } catch (error) {
      console.error(`CFBD request failed for ${endpoint}:`, error);
      return [];
    }
  }

  async collectCurrentELORatings(year: number = new Date().getFullYear()): Promise<number> {
    console.log(`📊 Collecting ELO ratings for ${year} season...`);
    
    try {
      const ratings: CFBDELORating[] = await this.makeRequest(`/ratings/elo?year=${year}`);
      
      if (ratings.length === 0) {
        console.log(`   No ELO ratings found for ${year}`);
        return 0;
      }

      let ratingsUpdated = 0;

      for (const rating of ratings) {
        try {
          // Find team by name (fuzzy matching)
          const teamResults = await db.select()
            .from(teams)
            .where(eq(teams.name, rating.team));

          let team = teamResults[0];

          // If exact match not found, try partial matching
          if (!team) {
            const allTeams = await db.select().from(teams);
            const foundTeam = allTeams.find(t => 
              t.name.toLowerCase().includes(rating.team.toLowerCase()) ||
              rating.team.toLowerCase().includes(t.name.toLowerCase())
            );
            team = foundTeam || null;
          }

          if (team) {
            // Update team with ELO rating
            await db.update(teams)
              .set({
                currentEloRating: rating.elo,
                conference: rating.conference
              })
              .where(eq(teams.id, team.id));

            ratingsUpdated++;
          } else {
            console.log(`   Team not found in database: ${rating.team}`);
          }

        } catch (error) {
          console.error(`   Error updating ELO for ${rating.team}:`, error);
        }
      }

      console.log(`✅ Updated ${ratingsUpdated} teams with ELO ratings`);
      return ratingsUpdated;

    } catch (error) {
      console.error(`Error collecting ELO ratings:`, error);
      return 0;
    }
  }

  async collectGameELOData(season: number, week?: number): Promise<number> {
    console.log(`🎯 Collecting game ELO data for ${season}${week ? ` week ${week}` : ''}...`);
    
    try {
      let endpoint = `/games?year=${season}`;
      if (week) {
        endpoint += `&week=${week}`;
      }

      const cfbdGames: CFBDGameWithELO[] = await this.makeRequest(endpoint);
      
      if (cfbdGames.length === 0) {
        console.log(`   No games found for ${season}${week ? ` week ${week}` : ''}`);
        return 0;
      }

      // Filter games that have ELO data
      const gamesWithELO = cfbdGames.filter(game => 
        game.home_pregame_elo && game.away_pregame_elo
      );

      if (gamesWithELO.length === 0) {
        console.log(`   No games with ELO data found`);
        return 0;
      }

      let gamesUpdated = 0;

      for (const cfbdGame of gamesWithELO) {
        try {
          // Find matching game in our database
          const gameResults = await db.select()
            .from(games)
            .where(and(
              eq(games.season, cfbdGame.season),
              eq(games.week, cfbdGame.week)
            ));

          // Try to match by teams and week (simplified matching)
          const matchingGame = gameResults.find(game => 
            game.season === cfbdGame.season && game.week === cfbdGame.week
          );

          if (matchingGame) {
            // Update game with ELO data
            await db.update(games)
              .set({
                homePregameElo: cfbdGame.home_pregame_elo,
                awayPregameElo: cfbdGame.away_pregame_elo,
                homePostgameElo: cfbdGame.home_postgame_elo,
                awayPostgameElo: cfbdGame.away_postgame_elo,
                homeWinProbability: cfbdGame.home_win_prob ? cfbdGame.home_win_prob * 100 : null,
                awayWinProbability: cfbdGame.away_win_prob ? cfbdGame.away_win_prob * 100 : null
              })
              .where(eq(games.id, matchingGame.id));

            gamesUpdated++;
          }

        } catch (gameError) {
          console.error(`   Error updating game ELO:`, gameError);
        }
      }

      console.log(`✅ Updated ${gamesUpdated} games with ELO data`);
      return gamesUpdated;

    } catch (error) {
      console.error(`Error collecting game ELO data:`, error);
      return 0;
    }
  }

  async initializeELOForAllSeasons(): Promise<void> {
    console.log("🚀 Initializing ELO ratings for all seasons...");
    
    const currentYear = new Date().getFullYear();
    const startYear = 2020; // Start from 2020 for reliable ELO data
    
    // Collect current team ratings
    await this.collectCurrentELORatings(currentYear);
    
    // Collect historical game ELO data
    for (let year = startYear; year <= currentYear; year++) {
      console.log(`\n📅 Processing ${year} season...`);
      
      await this.collectGameELOData(year);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n🎉 ELO initialization complete!");
  }

  async enrichUpcomingGamesWithELO(): Promise<number> {
    console.log("🔮 Enriching upcoming games with ELO data...");
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Determine current week (rough approximation)
    const currentWeek = currentMonth >= 8 ? Math.min(16, Math.floor((new Date().getDate() + 7) / 7)) : 1;
    
    // Collect ELO for current season/week
    const gamesUpdated = await this.collectGameELOData(currentYear, currentWeek);
    
    // Also collect next week if available
    if (currentWeek < 16) {
      const nextWeekUpdated = await this.collectGameELOData(currentYear, currentWeek + 1);
      return gamesUpdated + nextWeekUpdated;
    }
    
    return gamesUpdated;
  }

  async getTeamELORating(teamName: string): Promise<number | null> {
    try {
      const teamResults = await db.select()
        .from(teams)
        .where(eq(teams.name, teamName));

      if (teamResults.length > 0 && teamResults[0].currentEloRating) {
        return teamResults[0].currentEloRating;
      }

      return null;
    } catch (error) {
      console.error(`Error getting ELO for ${teamName}:`, error);
      return null;
    }
  }
}

export default ELORatingsCollector;