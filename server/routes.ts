import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertGameSchema, insertTeamSchema, insertPredictionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working", timestamp: new Date().toISOString() });
  });

  // Teams API
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const team = await storage.getTeam(id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const result = insertTeamSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid team data", errors: result.error.format() });
      }

      const existingTeam = await storage.getTeamByName(result.data.name);
      if (existingTeam) {
        return res.status(409).json({ message: "Team with this name already exists" });
      }

      const team = await storage.createTeam(result.data);
      res.status(201).json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Games API
  app.get("/api/games/upcoming", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (isNaN(limit) || isNaN(offset)) {
        return res.status(400).json({ message: "Invalid limit or offset" });
      }

      const games = await storage.getUpcomingGames(limit, offset);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming games" });
    }
  });

  app.get("/api/games/historical", async (req, res) => {
    try {
      const season = req.query.season ? parseInt(req.query.season as string) : undefined;
      const week = req.query.week ? parseInt(req.query.week as string) : undefined;
      const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
      const conference = req.query.conference as string | undefined;

      const games = await storage.getHistoricalGames(season, week, teamId, conference);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch historical games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }

      const game = await storage.getGameWithTeams(id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const result = insertGameSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid game data", errors: result.error.format() });
      }

      const homeTeam = await storage.getTeam(result.data.homeTeamId);
      if (!homeTeam) {
        return res.status(400).json({ message: "Home team not found" });
      }

      const awayTeam = await storage.getTeam(result.data.awayTeamId);
      if (!awayTeam) {
        return res.status(400).json({ message: "Away team not found" });
      }

      const game = await storage.createGame(result.data);
      res.status(201).json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  // Predictions API
  app.get("/api/predictions/game/:gameId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }

      const predictions = await storage.getPredictionsByGame(gameId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  app.post("/api/predictions", async (req, res) => {
    try {
      const result = insertPredictionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid prediction data", errors: result.error.format() });
      }

      const game = await storage.getGame(result.data.gameId);
      if (!game) {
        return res.status(400).json({ message: "Game not found" });
      }

      const team = await storage.getTeam(result.data.predictedWinnerId);
      if (!team) {
        return res.status(400).json({ message: "Predicted winner team not found" });
      }

      const prediction = await storage.createPrediction(result.data);
      res.status(201).json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to create prediction" });
    }
  });

  // Fetch real college football data with betting lines and Rick's picks
  app.post("/api/sync-cfb-data", async (req, res) => {
    try {
      const apiKey = process.env.CFBD_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: "CFBD API key not configured" });
      }

      // Fetch 2025 Week 1 games
      const gamesResponse = await fetch("https://api.collegefootballdata.com/games?year=2025&week=1&seasonType=regular", {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (!gamesResponse.ok) {
        const errorText = await gamesResponse.text();
        console.log("Games API Error:", errorText);
        return res.status(500).json({ message: "Failed to fetch games from CFBD API", error: errorText });
      }

      const games = await gamesResponse.json();
      console.log(`Found ${games.length} games for 2025 Week 1`);
      
      // Fetch betting lines for these games
      const linesResponse = await fetch("https://api.collegefootballdata.com/lines?year=2025&week=1&seasonType=regular", {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      let lines = [];
      if (linesResponse.ok) {
        lines = await linesResponse.json();
        console.log(`Found ${lines.length} betting lines`);
      } else {
        console.log("Lines API Error:", await linesResponse.text());
      }

      // Process first 10 games with real data
      const processedGames = [];
      const gamesToProcess = games.slice(0, 10);
      console.log(`Processing ${gamesToProcess.length} games`);

      // Rick's specific picks for spread and over/under
      const ricksSpreadPicks = [
        "Take the favorite to cover - they're simply better",
        "Underdog gets the points - motivation edge",
        "Home team covers - crowd advantage",
        "Road favorite covers - statement game",
        "Take the dog - too many points",
        "Lay the points - talent gap too wide",
        "Underdog keeps it close - rivalry factor",
        "Favorite wins big - mismatch alert",
        "Take the points - value play",
        "Fade the public - contrarian value"
      ];

      const ricksOverUnderPicks = [
        "Take the OVER - both offenses clicking",
        "UNDER is the play - defense dominates",
        "OVER hits - shootout incoming",
        "UNDER - weather keeps scoring low",
        "OVER - pace of play favors points",
        "UNDER - grind-it-out game",
        "OVER - weak defenses can't stop",
        "UNDER - both teams run heavy",
        "OVER - desperate teams air it out",
        "UNDER - playoff-style defense"
      ];

      for (let i = 0; i < gamesToProcess.length; i++) {
        const game = gamesToProcess[i];
        
        // Create or get teams (safely handle undefined values)
        let homeTeam = null;
        let awayTeam = null;

        if (game.homeTeam) {
          homeTeam = await storage.getTeamByName(game.homeTeam);
          if (!homeTeam) {
            homeTeam = await storage.createTeam({
              name: game.homeTeam,
              abbreviation: game.homeTeam.substring(0, Math.min(4, game.homeTeam.length)).toUpperCase(),
              conference: game.homeConference || "Independent",
              logoUrl: `https://a.espncdn.com/i/teamlogos/ncaa/500/${game.homeId}.png`,
              mascot: null,
              division: null,
              color: null,
              altColor: null,
              rank: null,
              wins: 0,
              losses: 0
            });
          }
        }

        if (game.awayTeam) {
          awayTeam = await storage.getTeamByName(game.awayTeam);
          if (!awayTeam) {
            awayTeam = await storage.createTeam({
              name: game.awayTeam,
              abbreviation: game.awayTeam.substring(0, Math.min(4, game.awayTeam.length)).toUpperCase(),
              conference: game.awayConference || "Independent",
              logoUrl: `https://a.espncdn.com/i/teamlogos/ncaa/500/${game.awayId}.png`,
              mascot: null,
              division: null,
              color: null,
              altColor: null,
              rank: null,
              wins: 0,
              losses: 0
            });
          }
        }

        if (!homeTeam || !awayTeam) continue;

        // Find DraftKings betting lines for this game
        const gameLines = lines.find((line: any) => 
          line.homeTeam === game.homeTeam && line.awayTeam === game.awayTeam
        );

        let spread = null;
        let overUnder = null;

        if (gameLines && gameLines.lines) {
          // Prefer DraftKings, fallback to any available line
          const draftKingsLine = gameLines.lines.find((l: any) => l.provider === "DraftKings");
          const anyLine = gameLines.lines[0];
          
          const selectedLine = draftKingsLine || anyLine;
          spread = selectedLine?.spread || null;
          overUnder = selectedLine?.overUnder || null;
        }

        // Create game with real data
        const newGame = await storage.createGame({
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startDate: new Date(game.startDate || "2025-08-30T12:00:00Z"),
          stadium: game.venue || null,
          location: game.venue || null,
          spread: spread,
          overUnder: overUnder,
          season: 2025,
          week: 1,
          isConferenceGame: game.conferenceGame || false,
          completed: false,
          homeTeamScore: null,
          awayTeamScore: null,
          isRivalryGame: false,
          isFeatured: i === 0 // Make first game featured
        });

        // Create Rick's pick for this game
        const spreadPick = ricksSpreadPicks[i % ricksSpreadPicks.length];
        const overUnderPick = ricksOverUnderPicks[i % ricksOverUnderPicks.length];
        const combinedPick = `SPREAD: ${spreadPick} | O/U: ${overUnderPick}`;
        const favoredTeam = spread && spread < 0 ? homeTeam : awayTeam;
        
        await storage.createPrediction({
          gameId: newGame.id,
          predictedWinnerId: favoredTeam.id,
          confidence: 0.65 + (Math.random() * 0.25), // Random confidence between 65-90%
          predictedSpread: spread,
          predictedTotal: overUnder,
          notes: combinedPick
        });

        processedGames.push(newGame);
      }

      res.json({ 
        message: `Successfully synced ${processedGames.length} games with real betting lines and Rick's picks`,
        games: processedGames 
      });
    } catch (error) {
      console.error("Error syncing CFB data:", error);
      res.status(500).json({ message: "Failed to sync college football data", error: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
