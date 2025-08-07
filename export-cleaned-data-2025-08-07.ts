#!/usr/bin/env tsx
/**
 * Export cleaned production data after duplicate removal
 * Created: August 7, 2025 - Post cleanup with 28,478 clean games
 */

import { db } from "./server/db";
import { teams, games, predictions, ricksPicks } from "./shared/schema";
import * as fs from "fs";

async function exportCleanedData() {
  console.log("🚀 Starting cleaned data export...");
  
  try {
    // Export teams
    console.log("📊 Exporting teams...");
    const teamsData = await db.select().from(teams);
    console.log(`✅ Exported ${teamsData.length} teams`);
    
    // Export games (cleaned dataset)
    console.log("🏈 Exporting games...");
    const gamesData = await db.select().from(games);
    console.log(`✅ Exported ${gamesData.length} games`);
    
    // Export predictions
    console.log("🔮 Exporting predictions...");
    const predictionsData = await db.select().from(predictions);
    console.log(`✅ Exported ${predictionsData.length} predictions`);
    
    // Export Rick's picks
    console.log("🎯 Exporting Rick's picks...");
    const ricksPicksData = await db.select().from(ricksPicks);
    console.log(`✅ Exported ${ricksPicksData.length} Rick's picks`);
    
    // Create export object
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "cleaned-2025-08-07",
      totalRecords: teamsData.length + gamesData.length + predictionsData.length + ricksPicksData.length,
      teams: teamsData,
      games: gamesData,
      predictions: predictionsData,
      ricksPicks: ricksPicksData,
      notes: "Cleaned dataset - removed 3,178 duplicate and invalid entries"
    };
    
    // Write to file
    const filename = `production-data-cleaned-2025-08-07.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`🎉 Export completed successfully!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Total records exported: ${exportData.totalRecords}`);
    console.log(`🧹 Clean games count: ${gamesData.length}`);
    
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

exportCleanedData();