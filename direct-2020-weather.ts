import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  precipitation: number;
  conditions: string;
  weatherImpact: number;
}

// Venue coordinates for major college football stadiums
const venueCoordinates: { [key: string]: { lat: number; lon: number } } = {
  'Jordan-Hare Stadium': { lat: 32.6025, lon: -85.4908 },
  'Bryant-Denny Stadium': { lat: 33.2080, lon: -87.5500 },
  'Tiger Stadium': { lat: 30.4118, lon: -91.1836 },
  'Kyle Field': { lat: 30.6100, lon: -96.3400 },
  'Neyland Stadium': { lat: 35.9550, lon: -83.9250 },
  'Ben Hill Griffin Stadium': { lat: 29.6500, lon: -82.3486 },
  'Sanford Stadium': { lat: 33.9500, lon: -83.3730 },
  'Williams-Brice Stadium': { lat: 34.0192, lon: -81.0192 },
  'Memorial Stadium': { lat: 34.6834, lon: -82.8374 },
  'Doak Campbell Stadium': { lat: 30.4378, lon: -84.3044 },
  'Hard Rock Stadium': { lat: 25.9580, lon: -80.2389 },
  'Michigan Stadium': { lat: 42.2658, lon: -83.7486 },
  'Ohio Stadium': { lat: 40.0017, lon: -83.0197 },
  'Beaver Stadium': { lat: 40.8122, lon: -77.8563 },
  'Camp Randall Stadium': { lat: 43.0700, lon: -89.4124 },
  'Kinnick Stadium': { lat: 41.6586, lon: -91.5517 },
  'Memorial Stadium (Lincoln)': { lat: 40.8200, lon: -96.7058 },
  'TCF Bank Stadium': { lat: 44.9762, lon: -93.2248 },
  'Northwestern Medicine Field': { lat: 42.0678, lon: -87.6921 },
  'Ross-Ade Stadium': { lat: 40.4267, lon: -86.9219 },
  'Spartan Stadium': { lat: 42.7281, lon: -84.4822 },
  'Memorial Stadium (Champaign)': { lat: 40.0953, lon: -88.2364 },
  'Ryan Field': { lat: 42.0678, lon: -87.6921 },
  'Notre Dame Stadium': { lat: 41.7001, lon: -86.2379 },
  'Los Angeles Memorial Coliseum': { lat: 34.0141, lon: -118.2879 },
  'Rose Bowl': { lat: 34.1611, lon: -118.1678 },
  'Autzen Stadium': { lat: 44.0583, lon: -123.0681 },
  'Husky Stadium': { lat: 47.6506, lon: -122.3016 },
  'Stanford Stadium': { lat: 37.4347, lon: -122.1597 },
  'California Memorial Stadium': { lat: 37.8719, lon: -122.2508 },
  'Arizona Stadium': { lat: 32.2300, lon: -110.9467 },
  'Sun Devil Stadium': { lat: 33.4267, lon: -111.9333 },
  'Folsom Field': { lat: 40.0097, lon: -105.2669 },
  'Rice-Eccles Stadium': { lat: 40.7608, lon: -111.8517 },
  'Darrell K Royal Stadium': { lat: 30.2830, lon: -97.7325 },
  'Gaylord Family Oklahoma Memorial Stadium': { lat: 35.2058, lon: -97.4422 },
  'Bill Snyder Family Stadium': { lat: 39.2100, lon: -96.5850 },
  'Jack Trice Stadium': { lat: 42.0139, lon: -93.6358 },
  'McLane Stadium': { lat: 31.5489, lon: -97.1142 },
  'TDECU Stadium': { lat: 29.7211, lon: -95.3425 }
};

function getVenueCoordinates(stadium: string): { lat: number; lon: number } | null {
  // Try exact match first
  if (venueCoordinates[stadium]) {
    return venueCoordinates[stadium];
  }
  
  // Try partial match
  for (const [key, coords] of Object.entries(venueCoordinates)) {
    if (stadium.includes(key.split(' ')[0]) || key.includes(stadium.split(' ')[0])) {
      return coords;
    }
  }
  
  // Default fallback coordinates for unknown venues (Columbus, OH)
  return { lat: 39.9612, lon: -82.9988 };
}

async function getHistoricalWeather(lat: number, lon: number, gameDate: Date): Promise<WeatherData | null> {
  try {
    const timestamp = Math.floor(gameDate.getTime() / 1000);
    
    const response = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${timestamp}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`
    );
    
    if (!response.ok) {
      console.log(`Weather API error: ${response.status} for ${lat},${lon} on ${gameDate.toISOString()}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data[0]) {
      console.log(`No weather data for ${lat},${lon} on ${gameDate.toISOString()}`);
      return null;
    }
    
    const weather = data.data[0];
    
    const temperature = weather.temp || 70;
    const windSpeed = weather.wind_speed || 0;
    const windDirection = weather.wind_deg || 0;
    const humidity = weather.humidity || 50;
    const precipitation = weather.rain?.['1h'] || weather.snow?.['1h'] || 0;
    const conditions = weather.weather?.[0]?.main || 'Clear';
    
    // Calculate weather impact (0-10 scale)
    let impact = 0;
    
    // Temperature impact
    if (temperature < 32) impact += 3;
    else if (temperature < 45) impact += 2;
    else if (temperature > 90) impact += 2;
    
    // Wind impact
    if (windSpeed > 25) impact += 3;
    else if (windSpeed > 15) impact += 2;
    else if (windSpeed > 10) impact += 1;
    
    // Precipitation impact
    if (precipitation > 0.5) impact += 3;
    else if (precipitation > 0.1) impact += 2;
    
    // Humidity impact
    if (humidity > 85) impact += 1;
    
    return {
      temperature,
      windSpeed,
      windDirection,
      humidity,
      precipitation,
      conditions,
      weatherImpact: Math.min(impact, 10)
    };
    
  } catch (error) {
    console.log(`Weather fetch error: ${error.message}`);
    return null;
  }
}

async function collect2020Weather() {
  console.log('🌤️ Direct 2020 Weather Data Collection');
  
  try {
    // Get all 2020 games that need weather data
    const gamesResult = await pool.query(`
      SELECT id, start_date, stadium, location
      FROM games 
      WHERE season = 2020 
      AND temperature IS NULL
      ORDER BY start_date
    `);
    
    console.log(`Found ${gamesResult.rows.length} games needing weather data`);
    
    let updatedGames = 0;
    let weatherRequests = 0;
    
    for (const game of gamesResult.rows) {
      try {
        const coords = getVenueCoordinates(game.stadium || '');
        if (!coords) {
          console.log(`Skip: No coordinates for stadium ${game.stadium}`);
          continue;
        }
        
        const gameDate = new Date(game.start_date);
        
        // Rate limiting - wait between requests
        if (weatherRequests > 0) {
          await new Promise(resolve => setTimeout(resolve, 1100)); // OpenWeather free tier: 60 calls/min
        }
        
        const weatherData = await getHistoricalWeather(coords.lat, coords.lon, gameDate);
        weatherRequests++;
        
        if (weatherData) {
          await pool.query(`
            UPDATE games 
            SET 
              temperature = $1,
              wind_speed = $2,
              wind_direction = $3,
              humidity = $4,
              precipitation = $5,
              weather_condition = $6,
              weather_impact_score = $7
            WHERE id = $8
          `, [
            weatherData.temperature,
            weatherData.windSpeed,
            weatherData.windDirection,
            weatherData.humidity,
            weatherData.precipitation,
            weatherData.conditions,
            weatherData.weatherImpact,
            game.id
          ]);
          
          updatedGames++;
          if (updatedGames % 10 === 0) {
            console.log(`Updated ${updatedGames} games with weather data`);
          }
        }
        
        // Debug first few updates
        if (updatedGames <= 3) {
          console.log(`Game ${game.id}: ${game.stadium} - Temp: ${weatherData?.temperature}°F, Wind: ${weatherData?.windSpeed}mph, Conditions: ${weatherData?.conditions}`);
        }
        
      } catch (err) {
        console.log(`Skip game ${game.id}: ${err.message}`);
      }
    }
    
    console.log(`✅ Weather collection complete:`);
    console.log(`   Made ${weatherRequests} weather API requests`);
    console.log(`   Updated ${updatedGames} games with weather data`);
    
  } catch (error) {
    console.error('❌ Weather collection failed:', error);
  }
  
  await pool.end();
  process.exit(0);
}

collect2020Weather();