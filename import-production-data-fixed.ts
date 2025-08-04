#!/usr/bin/env tsx
/**
 * FIXED: Import data into production database with proper date handling
 * Run this script on the production server after copying the export file
 */

import { db } from "./server/db";
import { teams, games, predictions, ricksPicks } from "./shared/schema";
import * as fs from "fs";
import { sql } from "drizzle-orm";

async function importProductionData(filename: string) {
  console.log(`🚀 Starting production data import from ${filename}...`);
  
  try {
    // Read export file
    if (!fs.existsSync(filename)) {
      console.error(`❌ File ${filename} not found`);
      process.exit(1);
    }
    
    const exportData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    console.log(`📊 Import data from ${exportData.exportDate}`);
    console.log(`📈 Total records to import: ${exportData.totalRecords}`);
    
    // Import teams first (other tables reference teams)
    console.log("📊 Importing teams...");
    if (exportData.teams && exportData.teams.length > 0) {
      // Clean teams data - only include fields that exist in the schema
      const cleanTeamsData = exportData.teams.map((team: any) => {
        const cleanTeam = { ...team };
        // Remove any timestamp fields that might cause issues
        delete cleanTeam.createdAt;
        delete cleanTeam.updatedAt;
        // Set lastUpdated if it exists
        if (cleanTeam.lastUpdated) {
          cleanTeam.lastUpdated = new Date(cleanTeam.lastUpdated);
        }
        return cleanTeam;
      });
      
      await db.insert(teams).values(cleanTeamsData).onConflictDoNothing();
      console.log(`✅ Imported ${exportData.teams.length} teams`);
    }
    
    // Import games
    console.log("🏈 Importing games...");
    if (exportData.games && exportData.games.length > 0) {
      // Convert startDate strings back to Date objects
      const gamesWithDates = exportData.games.map((game: any) => ({
        ...game,
        startDate: new Date(game.startDate)
      }));
      
      await db.insert(games).values(gamesWithDates).onConflictDoNothing();
      console.log(`✅ Imported ${exportData.games.length} games`);
    }
    
    // Import predictions
    console.log("🔮 Importing predictions...");
    if (exportData.predictions && exportData.predictions.length > 0) {
      // Clean predictions data
      const cleanPredictionsData = exportData.predictions.map((prediction: any) => {
        const cleanPrediction = { ...prediction };
        // Remove any timestamp fields that might cause issues
        delete cleanPrediction.createdAt;
        delete cleanPrediction.updatedAt;
        return cleanPrediction;
      });
      
      await db.insert(predictions).values(cleanPredictionsData).onConflictDoNothing();
      console.log(`✅ Imported ${exportData.predictions.length} predictions`);
    }
    
    // Import Rick's picks
    console.log("🎯 Importing Rick's picks...");
    if (exportData.ricks_picks && exportData.ricks_picks.length > 0) {
      const picksWithDates = exportData.ricks_picks.map((pick: any) => ({
        ...pick,
        createdAt: new Date(pick.createdAt),
        updatedAt: pick.updatedAt ? new Date(pick.updatedAt) : null
      }));
      
      await db.insert(ricksPicks).values(picksWithDates).onConflictDoNothing();
      console.log(`✅ Imported ${exportData.ricks_picks.length} Rick's picks`);
    }
    
    // Verify import
    console.log("🔍 Verifying import...");
    const teamCount = await db.select({ count: sql<number>`count(*)` }).from(teams);
    const gameCount = await db.select({ count: sql<number>`count(*)` }).from(games);
    const predictionCount = await db.select({ count: sql<number>`count(*)` }).from(predictions);
    const ricksPickCount = await db.select({ count: sql<number>`count(*)` }).from(ricksPicks);
    
    console.log(`🎉 Import complete!`);
    console.log(`📊 Database now contains:`);
    console.log(`   - Teams: ${teamCount[0].count}`);
    console.log(`   - Games: ${gameCount[0].count}`);
    console.log(`   - Predictions: ${predictionCount[0].count}`);
    console.log(`   - Rick's Picks: ${ricksPickCount[0].count}`);
    
  } catch (error) {
    console.error("❌ Import failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

// Get filename from command line argument
const filename = process.argv[2];
if (!filename) {
  console.error("❌ Usage: tsx import-production-data-fixed.ts <export-file.json>");
  process.exit(1);
}

importProductionData(filename);