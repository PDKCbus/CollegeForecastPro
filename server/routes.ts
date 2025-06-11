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

  // Fetch real college football data
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
        throw new Error(`Failed to fetch games: ${gamesResponse.statusText}`);
      }

      const games = await gamesResponse.json();
      
      // Fetch betting lines for these games
      const linesResponse = await fetch("https://api.collegefootballdata.com/lines?year=2025&week=1&seasonType=regular", {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const lines = linesResponse.ok ? await linesResponse.json() : [];

      // Process first 10 games
      const processedGames = [];
      const gamesToProcess = games.slice(0, 10);

      for (const game of gamesToProcess) {
        // Create or get teams
        let homeTeam = await storage.getTeamByName(game.home_team);
        if (!homeTeam) {
          homeTeam = await storage.createTeam({
            name: game.home_team,
            abbreviation: game.home_team.substring(0, 4).toUpperCase(),
            conference: game.home_conference || "Independent",
            logoUrl: `https://logos.sportslogos.net/logos/list_by_team/30/${game.home_team.replace(/\s+/g, '_')}/logo.gif`
          });
        }

        let awayTeam = await storage.getTeamByName(game.away_team);
        if (!awayTeam) {
          awayTeam = await storage.createTeam({
            name: game.away_team,
            abbreviation: game.away_team.substring(0, 4).toUpperCase(),
            conference: game.away_conference || "Independent",
            logoUrl: `https://logos.sportslogos.net/logos/list_by_team/30/${game.away_team.replace(/\s+/g, '_')}/logo.gif`
          });
        }

        // Find betting lines for this game
        const gameLines = lines.find((line: any) => 
          line.homeTeam === game.home_team && line.awayTeam === game.away_team
        );

        const spread = gameLines?.lines?.[0]?.spread;
        const overUnder = gameLines?.lines?.[0]?.overUnder;

        // Create game
        const newGame = await storage.createGame({
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startDate: new Date(game.start_date),
          stadium: game.venue,
          location: game.venue_id ? `${game.venue}` : undefined,
          spread: spread || null,
          overUnder: overUnder || null,
          season: 2025,
          week: 1,
          isConferenceGame: game.conference_game || false,
          completed: false,
          isFeatured: processedGames.length === 0 // Make first game featured
        });

        processedGames.push(newGame);
      }

      res.json({ 
        message: `Successfully synced ${processedGames.length} games`,
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
