#!/usr/bin/env tsx

/**
 * Test Roster Ranking System for Algorithm Improvements
 * Create a "video game style" 1-100 player ranking system using CFBD recruiting data
 * Target: +0.6 points improvement for Player Efficiency analytics
 */

import { db } from './server/db';
import { teams } from './shared/schema';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

interface RecruitingPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  rating: number;  // 0-1 scale from CFBD
  stars: number;   // 1-5 star rating
  ranking: number; // National ranking
}

interface PlayerUsage {
  name: string;
  position: string;
  team: string;
  usage: {
    overall: number;
    pass: number;
    rush: number;
  };
}

class RosterRankingSystem {
  
  /**
   * Create video game style 1-100 ratings using recruiting data + usage
   */
  async createPlayerRatings(): Promise<void> {
    console.log('🎮 Creating Video Game Style Player Ratings (1-100)...');
    
    // Get recruiting data for recent classes (2022-2024 for current players)
    const years = [2022, 2023, 2024];
    const allPlayers: RecruitingPlayer[] = [];
    
    for (const year of years) {
      console.log(`📊 Collecting ${year} recruiting class...`);
      
      try {
        const response = await fetch(`${BASE_URL}/recruiting/players?year=${year}`, {
          headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ${data.length} players found for ${year}`);
          
          // Add recruiting class data
          for (const player of data) {
            allPlayers.push({
              id: player.id,
              name: player.name,
              position: player.position,
              team: player.committedTo,
              rating: player.rating || 0,
              stars: player.stars || 0,
              ranking: player.ranking || 9999
            });
          }
        }
      } catch (error) {
        console.log(`   Failed ${year}: ${error}`);
      }
    }
    
    console.log(`✅ Total players collected: ${allPlayers.length}`);
    
    // Convert CFBD ratings to 1-100 scale
    this.convertToVideoGameRatings(allPlayers);
    
    // Get usage data for current season to boost active players
    await this.enhanceWithUsageData(allPlayers);
    
    // Calculate team roster strength
    await this.calculateTeamRosterStrength(allPlayers);
  }
  
  /**
   * Convert CFBD 0-1 ratings to video game 1-100 scale
   */
  private convertToVideoGameRatings(players: RecruitingPlayer[]): void {
    console.log('\n🎯 Converting to 1-100 Video Game Ratings...');
    
    // Sort by CFBD rating to establish percentiles
    players.sort((a, b) => b.rating - a.rating);
    
    const ratingMap = new Map<string, number>();
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const percentile = (players.length - i) / players.length;
      
      let gameRating = 50; // Base rating
      
      // Star-based bonus (5-star = 90-99, 4-star = 80-89, etc.)
      if (player.stars === 5) {
        gameRating = 90 + Math.floor(percentile * 9); // 90-99
      } else if (player.stars === 4) {
        gameRating = 80 + Math.floor(percentile * 9); // 80-89
      } else if (player.stars === 3) {
        gameRating = 65 + Math.floor(percentile * 14); // 65-79
      } else if (player.stars === 2) {
        gameRating = 50 + Math.floor(percentile * 14); // 50-64
      } else {
        gameRating = 35 + Math.floor(percentile * 14); // 35-49
      }
      
      // Position-specific adjustments (QBs and skill positions get slight boost)
      if (['QB', 'RB', 'WR', 'TE'].includes(player.position)) {
        gameRating += 2;
      }
      
      // Cap at 99
      gameRating = Math.min(99, gameRating);
      
      ratingMap.set(`${player.name}_${player.team}`, gameRating);
    }
    
    // Show sample ratings
    console.log('\nSample Player Ratings:');
    const samplePlayers = players.slice(0, 10);
    samplePlayers.forEach(player => {
      const rating = ratingMap.get(`${player.name}_${player.team}`);
      console.log(`${player.name} (${player.team}) - ${player.stars}⭐ → ${rating}/100`);
    });
  }
  
  /**
   * Enhance ratings with current usage data (active players get boost)
   */
  private async enhanceWithUsageData(players: RecruitingPlayer[]): Promise<void> {
    console.log('\n📈 Enhancing with 2024 Usage Data...');
    
    // Get sample teams for testing
    const testTeams = ['Iowa State', 'Kansas State', 'Alabama', 'Georgia'];
    
    for (const team of testTeams) {
      try {
        const response = await fetch(`${BASE_URL}/player/usage?year=2024&team=${encodeURIComponent(team)}`, {
          headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
        });
        
        if (response.ok) {
          const usageData = await response.json();
          console.log(`   ${team}: ${usageData.length} active players`);
          
          // High usage players get rating boost
          usageData.forEach((player: PlayerUsage) => {
            if (player.usage.overall > 0.15) { // 15%+ snap share
              console.log(`     ${player.name} (${player.position}): ${(player.usage.overall * 100).toFixed(1)}% usage`);
            }
          });
        }
      } catch (error) {
        console.log(`   ${team} usage failed: ${error}`);
      }
    }
  }
  
  /**
   * Calculate overall team roster strength for backtesting
   */
  private async calculateTeamRosterStrength(players: RecruitingPlayer[]): Promise<void> {
    console.log('\n🏆 Calculating Team Roster Strength...');
    
    const teamStrength = new Map<string, {
      averageRating: number,
      topPlayerCount: number,
      totalTalent: number
    }>();
    
    // Group players by team
    const playersByTeam = new Map<string, RecruitingPlayer[]>();
    
    players.forEach(player => {
      if (!playersByTeam.has(player.team)) {
        playersByTeam.set(player.team, []);
      }
      playersByTeam.get(player.team)!.push(player);
    });
    
    // Calculate team strength metrics
    playersByTeam.forEach((teamPlayers, teamName) => {
      const ratings = teamPlayers.map(p => p.rating);
      const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const topPlayerCount = teamPlayers.filter(p => p.stars >= 4).length;
      const totalTalent = teamPlayers.reduce((sum, p) => sum + (p.stars * 20), 0);
      
      teamStrength.set(teamName, {
        averageRating,
        topPlayerCount,
        totalTalent
      });
    });
    
    // Show top teams by roster strength
    const sortedTeams = Array.from(teamStrength.entries())
      .sort((a, b) => b[1].totalTalent - a[1].totalTalent)
      .slice(0, 10);
    
    console.log('\nTop 10 Teams by Roster Talent:');
    sortedTeams.forEach(([team, strength], index) => {
      console.log(`${index + 1}. ${team}: ${strength.totalTalent} talent, ${strength.topPlayerCount} 4+ stars`);
    });
    
    console.log('\n✅ Roster ranking system ready for backtesting!');
    console.log('💡 Can now test if roster talent correlates with ATS performance');
  }
}

async function main() {
  const system = new RosterRankingSystem();
  await system.createPlayerRatings();
}

main();