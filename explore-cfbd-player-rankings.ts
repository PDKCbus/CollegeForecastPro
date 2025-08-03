#!/usr/bin/env tsx

/**
 * Explore CFBD Player Ranking Systems
 * Research recruiting rankings, player usage rates, and any available rating systems
 * for final algorithm improvements targeting 54%+ ATS
 */

const CFBD_API_KEY = process.env.CFBD_API_KEY;
const BASE_URL = 'https://api.collegefootballdata.com';

interface RecruitingPlayer {
  id: string;
  athleteId: string;
  recruitType: string;
  year: number;
  ranking: number;
  rating: number;
  stars: number;
  position: string;
  hometownInfo: {
    city: string;
    state: string;
  };
  school: string;
  committedTo: string;
}

interface PlayerUsage {
  season: number;
  id: string;
  name: string;
  position: string;
  team: string;
  conference: string;
  usage: {
    overall: number;
    pass: number;
    rush: number;
    firstDown: number;
    secondDown: number;
    thirdDown: number;
  };
}

async function explorePlayerRankings() {
  console.log('🔍 Exploring CFBD Player Ranking Systems...');
  
  const endpoints = [
    { name: 'Recruiting Rankings', url: '/recruiting/players?year=2024&team=Iowa%20State' },
    { name: 'Player Usage Rates', url: '/player/usage?year=2024&team=Iowa%20State' },
    { name: 'Player Transfer Portal', url: '/player/portal?year=2024' },
    { name: 'Player Search', url: '/player/search?searchTerm=quarterback' },
    { name: 'Returning Production', url: '/teams/talent?year=2024' },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📊 Testing: ${endpoint.name}`);
    console.log(`URL: ${BASE_URL}${endpoint.url}`);
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint.url}`, {
        headers: CFBD_API_KEY ? { 'Authorization': `Bearer ${CFBD_API_KEY}` } : {}
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Records: ${Array.isArray(data) ? data.length : 'Single object'}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Sample data:');
          console.log(JSON.stringify(data[0], null, 2));
        } else if (!Array.isArray(data)) {
          console.log('Data structure:');
          console.log(JSON.stringify(data, null, 2));
        }
      } else {
        const error = await response.text();
        console.log(`Error: ${error}`);
      }
      
    } catch (error) {
      console.log(`Failed: ${error}`);
    }
  }
  
  // Test team talent rankings (composite team ratings)
  console.log(`\n📊 Testing: Team Talent Composite Rankings`);
  try {
    const response = await fetch(`${BASE_URL}/teams/talent?year=2024`, {
      headers: CFBD_API_KEY ? { 'Authorization': `Bearer ${CFBD_API_KEY}` } : {}
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Team talent data: ${data.length} teams`);
      
      // Look for teams with high talent ratings
      const topTalent = data.filter((team: any) => team.talent > 800).slice(0, 5);
      console.log('Top talent teams:');
      topTalent.forEach((team: any) => {
        console.log(`${team.school}: ${team.talent} talent points`);
      });
    }
  } catch (error) {
    console.log(`Team talent failed: ${error}`);
  }
}

explorePlayerRankings();