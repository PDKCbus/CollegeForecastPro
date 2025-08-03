#!/usr/bin/env tsx

/**
 * Check Historical Roster Data Availability
 * Determine what CFBD data we can use for backtesting algorithm improvements
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

async function checkHistoricalData() {
  console.log('🔍 Checking CFBD Historical Data Availability for Backtesting...');
  console.log('');
  
  const testYears = [2020, 2021, 2022, 2023];
  const testTeams = ['Alabama', 'Georgia', 'Iowa State', 'Kansas State'];
  
  for (const year of testYears) {
    console.log(`📅 YEAR ${year}:`);
    
    // 1. Recruiting Data
    try {
      const recruitingResponse = await fetch(`${BASE_URL}/recruiting/players?year=${year}&team=Alabama`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
      });
      
      if (recruitingResponse.ok) {
        const recruitingData = await recruitingResponse.json();
        console.log(`   ✅ Recruiting: ${recruitingData.length} players (${year} class)`);
      } else {
        console.log(`   ❌ Recruiting: No data available for ${year}`);
      }
    } catch (error) {
      console.log(`   ❌ Recruiting: API error for ${year}`);
    }
    
    // 2. Player Usage Data
    try {
      const usageResponse = await fetch(`${BASE_URL}/player/usage?year=${year}&team=Alabama`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
      });
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        console.log(`   ✅ Player Usage: ${usageData.length} active players`);
      } else {
        console.log(`   ❌ Player Usage: No data for ${year}`);
      }
    } catch (error) {
      console.log(`   ❌ Player Usage: API error for ${year}`);
    }
    
    // 3. Player Stats
    try {
      const statsResponse = await fetch(`${BASE_URL}/stats/player/category?year=${year}&category=passing&team=Alabama`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log(`   ✅ Player Stats: ${statsData.length} passing stats`);
      } else {
        console.log(`   ❌ Player Stats: No data for ${year}`);
      }
    } catch (error) {
      console.log(`   ❌ Player Stats: API error for ${year}`);
    }
    
    // 4. Team Talent Composite
    try {
      const talentResponse = await fetch(`${BASE_URL}/teams/talent?year=${year}`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
      });
      
      if (talentResponse.ok) {
        const talentData = await talentResponse.json();
        const alabamaTalent = talentData.find((t: any) => t.school === 'Alabama');
        if (alabamaTalent) {
          console.log(`   ✅ Team Talent: Alabama rated ${alabamaTalent.talent} (${year})`);
        } else {
          console.log(`   ⚠️  Team Talent: Data available but Alabama not found`);
        }
      } else {
        console.log(`   ❌ Team Talent: No data for ${year}`);
      }
    } catch (error) {
      console.log(`   ❌ Team Talent: API error for ${year}`);
    }
    
    // 5. Roster Data (what we tested before)
    try {
      const rosterResponse = await fetch(`${BASE_URL}/roster?year=${year}&team=Alabama`, {
        headers: { 'Authorization': `Bearer ${CFBD_API_KEY}` }
      });
      
      if (rosterResponse.ok) {
        const rosterData = await rosterResponse.json();
        console.log(`   ${rosterData.length > 0 ? '✅' : '❌'} Roster: ${rosterData.length} players`);
      } else {
        console.log(`   ❌ Roster: No data for ${year}`);
      }
    } catch (error) {
      console.log(`   ❌ Roster: API error for ${year}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 BACKTESTING DATA ANALYSIS:');
  console.log('');
  
  // Test what years have complete data for our algorithm
  console.log('📊 For Player Efficiency (+0.6 pts):');
  console.log('   - Need: Recruiting data + Usage data + Stats');
  console.log('   - Best bet: 2022-2024 recruiting + 2023-2024 usage');
  console.log('');
  
  console.log('📊 For Team Efficiency (+0.4 pts):');
  console.log('   - Need: Team talent ratings or recruiting composites');
  console.log('   - Available: Team talent endpoint (if working)');
  console.log('');
  
  console.log('📊 For Momentum Analysis (+0.3 pts):');
  console.log('   - Need: Historical game results (we already have)');
  console.log('   - Available: Our 15-year games database (2009-2024)');
  console.log('');
  
  console.log('🚀 RECOMMENDATION:');
  console.log('   1. Use recruiting data (2020-2024) for player ratings');
  console.log('   2. Use team talent API for roster strength if available');
  console.log('   3. Use our games database for momentum calculations');
  console.log('   4. Backtest against 2022-2023 seasons with complete data');
}

checkHistoricalData();