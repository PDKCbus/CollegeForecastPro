import { 
  users, 
  teams, 
  games, 
  predictions, 
  type User, 
  type InsertUser, 
  type Team, 
  type InsertTeam, 
  type Game, 
  type InsertGame, 
  type Prediction, 
  type InsertPrediction, 
  type GameWithTeams
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  
  // Game operations
  getGame(id: number): Promise<Game | undefined>;
  getGameWithTeams(id: number): Promise<GameWithTeams | undefined>;
  getUpcomingGames(limit?: number, offset?: number): Promise<GameWithTeams[]>;
  getHistoricalGames(
    season?: number, 
    week?: number, 
    teamId?: number, 
    conference?: string
  ): Promise<GameWithTeams[]>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, game: Partial<Game>): Promise<Game | undefined>;
  
  // Prediction operations
  getPrediction(id: number): Promise<Prediction | undefined>;
  getPredictionsByGame(gameId: number): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  updatePrediction(id: number, prediction: Partial<Prediction>): Promise<Prediction | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teams: Map<number, Team>;
  private games: Map<number, Game>;
  private predictions: Map<number, Prediction>;
  private userCurrentId: number;
  private teamCurrentId: number;
  private gameCurrentId: number;
  private predictionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.games = new Map();
    this.predictions = new Map();
    this.userCurrentId = 1;
    this.teamCurrentId = 1;
    this.gameCurrentId = 1;
    this.predictionCurrentId = 1;
    
    // Initialize with some sample teams
    this.initializeTeams();
    // Initialize with some sample games
    this.initializeGames();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    if (!name) return undefined;
    return Array.from(this.teams.values()).find(
      (team) => team.name?.toLowerCase() === name.toLowerCase(),
    );
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamCurrentId++;
    const team: Team = { ...insertTeam, id };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, teamUpdate: Partial<Team>): Promise<Team | undefined> {
    const existingTeam = this.teams.get(id);
    if (!existingTeam) return undefined;
    
    const updatedTeam = { ...existingTeam, ...teamUpdate };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  // Game methods
  async getGame(id: number): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGameWithTeams(id: number): Promise<GameWithTeams | undefined> {
    const game = this.games.get(id);
    if (!game) return undefined;
    
    const homeTeam = this.teams.get(game.homeTeamId);
    const awayTeam = this.teams.get(game.awayTeamId);
    if (!homeTeam || !awayTeam) return undefined;
    
    const predictions = Array.from(this.predictions.values())
      .filter(p => p.gameId === id);
    
    return { 
      ...game, 
      homeTeam, 
      awayTeam, 
      prediction: predictions.length > 0 ? predictions[0] : undefined 
    };
  }

  async getUpcomingGames(limit = 10, offset = 0): Promise<GameWithTeams[]> {
    const now = new Date();
    const upcomingGames = Array.from(this.games.values())
      .filter(game => new Date(game.startDate) > now && !game.completed)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    const paginatedGames = upcomingGames.slice(offset, offset + limit);
    
    return Promise.all(paginatedGames.map(async game => {
      const homeTeam = await this.getTeam(game.homeTeamId);
      const awayTeam = await this.getTeam(game.awayTeamId);
      
      if (!homeTeam || !awayTeam) {
        throw new Error(`Missing team data for game ${game.id}`);
      }
      
      const predictions = Array.from(this.predictions.values())
        .filter(p => p.gameId === game.id);
      
      return {
        ...game,
        homeTeam,
        awayTeam,
        prediction: predictions.length > 0 ? predictions[0] : undefined
      };
    }));
  }

  async getHistoricalGames(
    season?: number, 
    week?: number, 
    teamId?: number, 
    conference?: string
  ): Promise<GameWithTeams[]> {
    let historicalGames = Array.from(this.games.values())
      .filter(game => game.completed);
    
    if (season) {
      historicalGames = historicalGames.filter(game => game.season === season);
    }
    
    if (week) {
      historicalGames = historicalGames.filter(game => game.week === week);
    }
    
    if (teamId) {
      historicalGames = historicalGames.filter(
        game => game.homeTeamId === teamId || game.awayTeamId === teamId
      );
    }
    
    if (conference) {
      const teamsInConference = Array.from(this.teams.values())
        .filter(team => team.conference === conference)
        .map(team => team.id);
      
      historicalGames = historicalGames.filter(game => 
        teamsInConference.includes(game.homeTeamId) && 
        teamsInConference.includes(game.awayTeamId)
      );
    }
    
    return Promise.all(historicalGames.map(async game => {
      const homeTeam = await this.getTeam(game.homeTeamId);
      const awayTeam = await this.getTeam(game.awayTeamId);
      
      if (!homeTeam || !awayTeam) {
        throw new Error(`Missing team data for game ${game.id}`);
      }
      
      const predictions = Array.from(this.predictions.values())
        .filter(p => p.gameId === game.id);
      
      return {
        ...game,
        homeTeam,
        awayTeam,
        prediction: predictions.length > 0 ? predictions[0] : undefined
      };
    }));
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameCurrentId++;
    const game: Game = { ...insertGame, id };
    this.games.set(id, game);
    return game;
  }

  async updateGame(id: number, gameUpdate: Partial<Game>): Promise<Game | undefined> {
    const existingGame = this.games.get(id);
    if (!existingGame) return undefined;
    
    const updatedGame = { ...existingGame, ...gameUpdate };
    this.games.set(id, updatedGame);
    return updatedGame;
  }

  // Prediction methods
  async getPrediction(id: number): Promise<Prediction | undefined> {
    return this.predictions.get(id);
  }

  async getPredictionsByGame(gameId: number): Promise<Prediction[]> {
    return Array.from(this.predictions.values())
      .filter(prediction => prediction.gameId === gameId);
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const id = this.predictionCurrentId++;
    const prediction: Prediction = { ...insertPrediction, id };
    this.predictions.set(id, prediction);
    return prediction;
  }

  async updatePrediction(id: number, predictionUpdate: Partial<Prediction>): Promise<Prediction | undefined> {
    const existingPrediction = this.predictions.get(id);
    if (!existingPrediction) return undefined;
    
    const updatedPrediction = { ...existingPrediction, ...predictionUpdate };
    this.predictions.set(id, updatedPrediction);
    return updatedPrediction;
  }

  // Helper methods to initialize sample data
  private initializeTeams() {
    const sampleTeams: InsertTeam[] = [
      { 
        name: "Ohio State",
        abbreviation: "OSU",
        mascot: "Buckeyes",
        conference: "Big Ten",
        division: "East",
        color: "#BB0000",
        altColor: "#666666",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/ohio-state-buckeyes-logo-png-transparent.png",
        rank: 2,
        wins: 9,
        losses: 0
      },
      { 
        name: "Michigan",
        abbreviation: "MICH",
        mascot: "Wolverines",
        conference: "Big Ten",
        division: "East",
        color: "#00274C",
        altColor: "#FFCB05",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/michigan-wolverines-logo-png-transparent.png",
        rank: 3,
        wins: 8,
        losses: 1
      },
      { 
        name: "Alabama",
        abbreviation: "ALA",
        mascot: "Crimson Tide",
        conference: "SEC",
        division: "West",
        color: "#9E1B32",
        altColor: "#FFFFFF",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/alabama-crimson-tide-logo-png-transparent.png",
        rank: 9,
        wins: 7,
        losses: 2
      },
      { 
        name: "Ole Miss",
        abbreviation: "MISS",
        mascot: "Rebels",
        conference: "SEC",
        division: "West",
        color: "#CE1126",
        altColor: "#14213D",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/ole-miss-rebels-logo-png-transparent.png",
        rank: 11,
        wins: 8,
        losses: 1
      },
      { 
        name: "LSU",
        abbreviation: "LSU",
        mascot: "Tigers",
        conference: "SEC",
        division: "West",
        color: "#461D7C",
        altColor: "#FDD023",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/lsu-tigers-logo-png-transparent.png",
        rank: 7,
        wins: 7,
        losses: 2
      },
      { 
        name: "Arkansas",
        abbreviation: "ARK",
        mascot: "Razorbacks",
        conference: "SEC",
        division: "West",
        color: "#9D2235",
        altColor: "#FFFFFF",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/arkansas-razorbacks-logo-png-transparent.png",
        rank: null,
        wins: 5,
        losses: 4
      },
      { 
        name: "Clemson",
        abbreviation: "CLEM",
        mascot: "Tigers",
        conference: "ACC",
        division: "Atlantic",
        color: "#F56600",
        altColor: "#522D80",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/clemson-tigers-logo-png-transparent.png",
        rank: 10,
        wins: 8,
        losses: 1
      },
      { 
        name: "Louisville",
        abbreviation: "LOU",
        mascot: "Cardinals",
        conference: "ACC",
        division: "Atlantic",
        color: "#AD0000",
        altColor: "#000000",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/louisville-cardinals-logo-png-transparent.png",
        rank: null,
        wins: 6,
        losses: 3
      },
      { 
        name: "Texas",
        abbreviation: "TEX",
        mascot: "Longhorns",
        conference: "Big 12",
        division: null,
        color: "#BF5700",
        altColor: "#FFFFFF",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/texas-longhorns-logo-png-transparent.png",
        rank: null,
        wins: 6,
        losses: 3
      },
      { 
        name: "TCU",
        abbreviation: "TCU",
        mascot: "Horned Frogs",
        conference: "Big 12",
        division: null,
        color: "#4D1979",
        altColor: "#A3A9AC",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/tcu-horned-frogs-logo-png-transparent.png",
        rank: 4,
        wins: 9,
        losses: 0
      },
      { 
        name: "Georgia",
        abbreviation: "UGA",
        mascot: "Bulldogs",
        conference: "SEC",
        division: "East",
        color: "#BA0C2F",
        altColor: "#000000",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/georgia-bulldogs-logo-png-transparent.png",
        rank: 1,
        wins: 9,
        losses: 0
      },
      { 
        name: "Mississippi State",
        abbreviation: "MSST",
        mascot: "Bulldogs",
        conference: "SEC",
        division: "West",
        color: "#660000",
        altColor: "#FFFFFF",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/mississippi-state-bulldogs-logo-png-transparent.png",
        rank: null,
        wins: 6,
        losses: 3
      },
      { 
        name: "Oregon",
        abbreviation: "ORE",
        mascot: "Ducks",
        conference: "Pac-12",
        division: "North",
        color: "#154733",
        altColor: "#FEE123",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/oregon-ducks-logo-png-transparent.png",
        rank: 6,
        wins: 8,
        losses: 1
      },
      { 
        name: "Washington",
        abbreviation: "WASH",
        mascot: "Huskies",
        conference: "Pac-12",
        division: "North",
        color: "#4B2E83",
        altColor: "#B7A57A",
        logoUrl: "https://cdn.freebiesupply.com/logos/large/2x/washington-huskies-logo-png-transparent.png",
        rank: null,
        wins: 7,
        losses: 2
      }
    ];

    sampleTeams.forEach(team => {
      const id = this.teamCurrentId++;
      this.teams.set(id, { ...team, id });
    });
  }

  private initializeGames() {
    // Get team IDs after initialization
    const getTeamIdByName = (name: string): number => {
      const team = Array.from(this.teams.values()).find(t => t.name === name);
      return team ? team.id : 0;
    };

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Get Monday
    
    const nextSaturday = new Date(startOfWeek);
    nextSaturday.setDate(startOfWeek.getDate() + 5); // Saturday
    
    // Featured game: Ohio State vs Michigan
    this.createGame({
      homeTeamId: getTeamIdByName("Ohio State"),
      awayTeamId: getTeamIdByName("Michigan"),
      startDate: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate() + 14, 12, 0), // 12:00 PM in 2 weeks
      stadium: "Ohio Stadium",
      location: "Columbus, OH",
      spread: -2.5,
      overUnder: 45.5,
      season: 2023,
      week: 12,
      isConferenceGame: true,
      isRivalryGame: true,
      isFeatured: true
    });

    // Regular upcoming games
    const upcomingGames = [
      {
        homeTeam: "Alabama",
        awayTeam: "Ole Miss",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 15, 30), // 3:30 PM
        spread: -2.5,
        overUnder: 64.5,
        stadium: "Bryant-Denny Stadium",
        location: "Tuscaloosa, AL",
        isConference: true
      },
      {
        homeTeam: "Arkansas",
        awayTeam: "LSU",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 19, 0), // 7:00 PM
        spread: 3.5,
        overUnder: 62.5,
        stadium: "Razorback Stadium",
        location: "Fayetteville, AR",
        isConference: true
      },
      {
        homeTeam: "Louisville",
        awayTeam: "Clemson",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 12, 0), // 12:00 PM
        spread: 7.0,
        overUnder: 51.5,
        stadium: "Cardinal Stadium",
        location: "Louisville, KY",
        isConference: true
      },
      {
        homeTeam: "TCU",
        awayTeam: "Texas",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 19, 30), // 7:30 PM
        spread: -7.0,
        overUnder: 64.5,
        stadium: "Amon G. Carter Stadium",
        location: "Fort Worth, TX",
        isConference: true
      },
      {
        homeTeam: "Mississippi State",
        awayTeam: "Georgia",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 16, 0), // 4:00 PM
        spread: 16.5,
        overUnder: 53.5,
        stadium: "Davis Wade Stadium",
        location: "Starkville, MS",
        isConference: true
      },
      {
        homeTeam: "Washington",
        awayTeam: "Oregon",
        date: new Date(nextSaturday.getFullYear(), nextSaturday.getMonth(), nextSaturday.getDate(), 15, 30), // 3:30 PM
        spread: 13.5,
        overUnder: 72.5,
        stadium: "Husky Stadium",
        location: "Seattle, WA",
        isConference: true
      }
    ];

    upcomingGames.forEach((game, index) => {
      this.createGame({
        homeTeamId: getTeamIdByName(game.homeTeam),
        awayTeamId: getTeamIdByName(game.awayTeam),
        startDate: game.date,
        stadium: game.stadium,
        location: game.location,
        spread: game.spread,
        overUnder: game.overUnder,
        season: 2023,
        week: 10,
        isConferenceGame: game.isConference,
        isRivalryGame: false,
        isFeatured: false
      });
    });

    // Create a prediction for the featured game
    const featuredGameId = 1; // The ID of the featured game
    this.createPrediction({
      gameId: featuredGameId,
      predictedWinnerId: getTeamIdByName("Michigan"),
      confidence: 0.65,
      predictedSpread: -2.5,
      predictedTotal: 45.5,
      notes: "Michigan's defense gives them the edge in this classic rivalry matchup."
    });
  }
}

export const storage = new MemStorage();
