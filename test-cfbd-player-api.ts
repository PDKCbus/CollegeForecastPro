#!/usr/bin/env tsx

/**
 * Test CFBD Player API Directly
 * Debug why player data collection is returning 0 players
 */

import { db } from './server/db';
import { teams } from './shared/schema';

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

async function testPlayerAPI() {
  console.log('🔍 Testing CFBD Player API...');
  console.log(`API Key available: ${CFBD_API_KEY ? 'YES' : 'NO'}`);
  
  try {
    // Test 1: Get Iowa State players directly
    console.log('\n📊 Testing Iowa State QB stats for 2024...');
    const url = `${BASE_URL}/stats/player/season?year=2024&team=Iowa%20State&category=passing`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      headers: CFBD_API_KEY ? { 'Authorization': `Bearer ${CFBD_API_KEY}` } : {}
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      console.log('❌ API call failed');
      const text = await response.text();
      console.log('Error response:', text);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Got ${data.length} player records`);
    
    if (data.length > 0) {
      console.log('\nSample player data:');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Filter for QBs with meaningful stats
      const qbs = data.filter((player: any) => 
        player.position === 'QB' && player.passingAttempts > 10
      );
      console.log(`QBs with 10+ passing attempts: ${qbs.length}`);
    }
    
    // Test 2: Check team names in our database
    console.log('\n📊 Checking team names in database...');
    const teams_data = await db.select().from(teams).limit(5);
    console.log('Sample team names from DB:');
    teams_data.forEach(team => console.log(`- ${team.name}`));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPlayerAPI();