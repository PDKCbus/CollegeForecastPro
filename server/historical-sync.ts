import { storage } from './storage';
import type { InsertGame, InsertTeam } from '../shared/schema';
import { cleanGameData, cleanTeamData } from './data-cleaner';

interface CFBDGame {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  neutral_site: boolean;
  conference_game: boolean;
  attendance?: number;
  venue_id?: number;
  venue?: string;
  home_team: string;
  home_conference?: string;
  home_division?: string;
  home_points?: number;
  home_line_scores?: number[];
  home_post_win_prob?: number;
  home_pregame_elo?: number;
  home_postgame_elo?: number;
  away_team: string;
  away_conference?: string;
  away_division?: string;
  away_points?: number;
  away_line_scores?: number[];
  away_post_win_prob?: number;
  away_pregame_elo?: number;
  away_postgame_elo?: number;
  excitement_index?: number;
  highlights?: string;
  notes?: string;
}

interface CFBDTeam {
  id: number;
  school: string;
  mascot: string;
  abbreviation: string;
  alt_name_1?: string;
  alt_name_2?: string;
  alt_name_3?: string;
  conference: string;
  division?: string;
  color: string;
  alt_color: string;
  logos: string[];
}

interface CFBDBettingLine {
  id: number;
  season: number;
  week: number;
  season_type: string;
  start_date: string;
  home_team: string;
  home_conference: string;
  home_score?: number;
  away_team: string;
  away_conference: string;
  away_score?: number;
  lines: Array<{
    provider: string;
    spread?: number;
    formatted_spread?: string;
    spread_open?: number;
    over_under?: number;
    over_under_open?: number;
    home_moneyline?: number;
    away_moneyline?: number;
  }>;
}

export class HistoricalDataSync {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private teamCache = new Map<string, number>();

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
    if (!this.apiKey) {
      console.warn('CFBD_API_KEY not found - historical sync will not work');
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    if (!this.apiKey) {
      throw new Error('CFBD API key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async ensureTeamExists(teamName: string, teamData?: Partial<CFBDTeam>): Promise<number> {
    if (this.teamCache.has(teamName)) {
      return this.teamCache.get(teamName)!;
    }

    // Try to find existing team
    const existingTeam = await storage.getTeamByName(teamName);
    if (existingTeam) {
      this.teamCache.set(teamName, existingTeam.id);
      return existingTeam.id;
    }

    // Create new team
    const newTeam: InsertTeam = {
      name: teamName,
      abbreviation: teamData?.abbreviation ?? teamName.substring(0, 4).toUpperCase(),
      mascot: teamData?.mascot ?? null,
      conference: teamData?.conference ?? null,
      division: teamData?.division ?? null,
      color: teamData?.color ?? null,
      altColor: teamData?.alt_color ?? null,
      logoUrl: teamData?.logos?.[0] ?? null,
      rank: null,
      wins: null,
      losses: null,
    };

    const createdTeam = await storage.createTeam(newTeam);
    this.teamCache.set(teamName, createdTeam.id);
    return createdTeam.id;
  }

  async syncAllTeams(): Promise<void> {
    console.log('Fetching all FBS teams...');
    
    try {
      const teams = await this.makeRequest<CFBDTeam>('/teams/fbs');
      console.log(`Found ${teams.length} FBS teams`);

      for (const team of teams) {
        await this.ensureTeamExists(team.school, team);
      }

      console.log('Team sync completed');
    } catch (error) {
      console.error('Error syncing teams:', error);
      throw error;
    }
  }

  async syncGamesForSeason(season: number): Promise<void> {
    console.log(`Syncing games for ${season} season...`);

    try {
      // Fetch games for all weeks in the season
      const games = await this.makeRequest<CFBDGame>('/games', {
        year: season,
        seasonType: 'regular'
      });

      console.log(`Found ${games.length} games for ${season}`);

      // Fetch betting lines for the season
      let bettingLines: CFBDBettingLine[] = [];
      try {
        bettingLines = await this.makeRequest<CFBDBettingLine>('/lines', {
          year: season,
          seasonType: 'regular'
        });
        console.log(`Found ${bettingLines.length} betting lines for ${season}`);
      } catch (error) {
        console.warn(`Could not fetch betting lines for ${season}:`, error);
      }

      // Create a map for quick betting line lookup
      const bettingMap = new Map<string, CFBDBettingLine>();
      bettingLines.forEach(line => {
        const key = `${line.home_team}-${line.away_team}-${line.week}`;
        bettingMap.set(key, line);
      });

      let processedCount = 0;
      for (const game of games) {
        try {
          const homeTeamId = await this.ensureTeamExists(game.home_team);
          const awayTeamId = await this.ensureTeamExists(game.away_team);

          // Look for betting line
          const bettingKey = `${game.home_team}-${game.away_team}-${game.week}`;
          const bettingLine = bettingMap.get(bettingKey);
          
          // Get consensus spread and over/under from betting lines
          let spread: number | null = null;
          let overUnder: number | null = null;
          
          if (bettingLine?.lines && bettingLine.lines.length > 0) {
            // Use the first available line (could be improved to get consensus)
            const line = bettingLine.lines[0];
            spread = line.spread ?? null;
            overUnder = line.over_under ?? null;
          }

          const gameData: InsertGame = {
            homeTeamId,
            awayTeamId,
            startDate: new Date(game.start_date),
            season: game.season,
            week: game.week,
            stadium: game.venue || null,
            location: game.venue || null,
            spread: spread || null,
            overUnder: overUnder || null,
            homeTeamScore: game.home_points || null,
            awayTeamScore: game.away_points || null,
            completed: Boolean(game.home_points !== undefined && game.away_points !== undefined),
            isFeatured: false,
            isConferenceGame: Boolean(game.conference_game),
            isRivalryGame: false,
          };

          try {
            console.log(`Processing game ${game.id}: ${game.away_team} @ ${game.home_team}`);
            const cleanedGameData = cleanGameData(gameData);
            
            // Additional validation before insertion
            if (!cleanedGameData.homeTeamId || !cleanedGameData.awayTeamId) {
              throw new Error(`Invalid team IDs: home=${cleanedGameData.homeTeamId}, away=${cleanedGameData.awayTeamId}`);
            }
            
            await storage.createGame(cleanedGameData);
          } catch (gameError) {
            console.error(`Error processing game ${game.id}:`, {
              error: gameError,
              gameData: JSON.stringify(gameData, null, 2),
              cleanedData: JSON.stringify(cleanGameData, null, 2)
            });
            continue; // Skip this game and continue with others
          }
          processedCount++;

          if (processedCount % 100 === 0) {
            console.log(`Processed ${processedCount}/${games.length} games for ${season}`);
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
        }
      }

      console.log(`Completed ${season}: processed ${processedCount} games`);
    } catch (error) {
      console.error(`Error syncing ${season} season:`, error);
      throw error;
    }
  }

  async syncHistoricalData(startYear: number = 2009, endYear: number = 2024): Promise<void> {
    console.log(`Starting historical data sync: ${startYear}-${endYear}`);
    
    try {
      // First, sync all teams
      await this.syncAllTeams();

      // Then sync games year by year
      for (let year = startYear; year <= endYear; year++) {
        console.log(`\n=== Processing ${year} season ===`);
        await this.syncGamesForSeason(year);
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`\n🎉 Historical data sync complete! Processed ${endYear - startYear + 1} seasons.`);
    } catch (error) {
      console.error('Historical data sync failed:', error);
      throw error;
    }
  }

  async getProgress(): Promise<{
    totalGames: number;
    gamesBySeason: Record<number, number>;
    totalTeams: number;
  }> {
    const teams = await storage.getTeams();
    
    // Get games grouped by season
    const gamesBySeason: Record<number, number> = {};
    let totalGames = 0;

    // This is a simplified version - in a real implementation,
    // you'd want to add a method to storage to get counts by season
    for (let year = 2009; year <= 2024; year++) {
      const games = await storage.getHistoricalGames(year);
      gamesBySeason[year] = games.length;
      totalGames += games.length;
    }

    return {
      totalGames,
      gamesBySeason,
      totalTeams: teams.length,
    };
  }
}

export const historicalSync = new HistoricalDataSync();