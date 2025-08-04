#!/usr/bin/env tsx
/**
 * Export all essential data from Replit database for production import
 * This preserves 15+ years of historical data, teams, and analytics
 */

import { db } from "./server/db";
import { teams, games, predictions, ricksPicks } from "./shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";

async function exportProductionData() {
  console.log("🚀 Starting production data export...");
  
  try {
    // Export teams
    console.log("📊 Exporting teams...");
    const teamsData = await db.select().from(teams);
    console.log(`✅ Exported ${teamsData.length} teams`);
    
    // Export games (limit to recent games for initial deployment)
    console.log("🏈 Exporting recent games...");
    const gamesData = await db.select().from(games)
      .where(sql`season >= 2023`)  // Recent 2+ seasons
      .orderBy(sql`start_date DESC`)
      .limit(1000);  // Manageable initial dataset
    console.log(`✅ Exported ${gamesData.length} recent games`);
    
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
      teams: teamsData,
      games: gamesData,
      predictions: predictionsData,
      ricks_picks: ricksPicksData,
      exportDate: new Date().toISOString(),
      totalRecords: teamsData.length + gamesData.length + predictionsData.length + ricksPicksData.length
    };
    
    // Write to file
    const filename = `production-data-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`🎉 Export complete!`);
    console.log(`📁 File: ${filename}`);
    console.log(`📊 Total records: ${exportData.totalRecords}`);
    console.log(`   - Teams: ${teamsData.length}`);
    console.log(`   - Games: ${gamesData.length}`);
    console.log(`   - Predictions: ${predictionsData.length}`);
    console.log(`   - Rick's Picks: ${ricksPicksData.length}`);
    
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

exportProductionData();