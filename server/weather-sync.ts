import { db } from "./db";
import { games } from "@shared/schema";
import { eq, and, gte, isNull } from "drizzle-orm";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  weatherCondition: string;
  isDome: boolean;
  weatherImpactScore: number;
}

export class WeatherSync {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENWEATHER_API_KEY environment variable is required for weather sync');
    }
  }

  private async getWeatherForLocation(city: string, state: string): Promise<WeatherData | null> {
    try {
      const geocodeUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city},${state},US&limit=1&appid=${this.apiKey}`;

      const geocodeResponse = await fetch(geocodeUrl);
      if (!geocodeResponse.ok) return null;

      const geoData = await geocodeResponse.json();
      if (!geoData || geoData.length === 0) return null;

      const { lat, lon } = geoData[0];

      const weatherUrl = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;

      const weatherResponse = await fetch(weatherUrl);
      if (!weatherResponse.ok) return null;

      const weather = await weatherResponse.json();

      // Calculate weather impact score (0-10, higher = worse conditions)
      let impactScore = 0;

      // Temperature impact
      if (weather.main.temp < 32 || weather.main.temp > 95) impactScore += 2;
      else if (weather.main.temp < 40 || weather.main.temp > 85) impactScore += 1;

      // Wind impact
      if (weather.wind.speed > 20) impactScore += 3;
      else if (weather.wind.speed > 15) impactScore += 2;
      else if (weather.wind.speed > 10) impactScore += 1;

      // Precipitation impact
      if (weather.rain?.['1h'] > 0.5 || weather.snow?.['1h'] > 0.5) impactScore += 3;
      else if (weather.rain?.['1h'] > 0.1 || weather.snow?.['1h'] > 0.1) impactScore += 1;

      // Weather condition impact
      const condition = weather.weather[0].main.toLowerCase();
      if (condition.includes('thunderstorm') || condition.includes('snow')) impactScore += 2;
      else if (condition.includes('rain') || condition.includes('drizzle')) impactScore += 1;

      return {
        temperature: Math.round(weather.main.temp),
        humidity: weather.main.humidity,
        windSpeed: Math.round(weather.wind.speed),
        windDirection: this.getWindDirection(weather.wind.deg),
        precipitation: (weather.rain?.['1h'] || weather.snow?.['1h'] || 0),
        weatherCondition: weather.weather[0].main,
        isDome: false, // Will be determined by venue
        weatherImpactScore: Math.min(impactScore, 10)
      };

    } catch (error) {
      console.error(`❌ Error fetching weather for ${city}, ${state}:`, error);
      return null;
    }
  }

  private getWindDirection(degrees: number): string {
    if (!degrees) return 'N';

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private isDomeVenue(stadium: string): boolean {
    const domeVenues = [
      'Mercedes-Benz Superdome',
      'NRG Stadium',
      'Ford Field',
      'Lucas Oil Stadium',
      'Georgia Dome',
      'Edward Jones Dome',
      'Alamodome',
      'Carrier Dome',
      'Caesars Superdome',
      'Mercedes-Benz Stadium',
      'Allegiant Stadium',
      'SoFi Stadium',
      'AT&T Stadium',
      'University of Phoenix Stadium',
      'State Farm Stadium'
    ];

    return domeVenues.some(dome => stadium.toLowerCase().includes(dome.toLowerCase()));
  }

  private extractCityState(location: string): { city: string; state: string } | null {
    try {
      // Common patterns: "City, ST" or "Stadium Name, City, ST"
      const parts = location.split(',').map(p => p.trim());

      if (parts.length >= 2) {
        const state = parts[parts.length - 1];
        const city = parts[parts.length - 2];

        // Validate state code (2 letters)
        if (state.length === 2 && /^[A-Z]{2}$/.test(state)) {
          return { city, state };
        }
      }

      // Fallback: try to extract from common formats
      const stateMatch = location.match(/\b([A-Z]{2})\b/);
      if (stateMatch) {
        const state = stateMatch[1];
        const beforeState = location.substring(0, stateMatch.index).trim();
        const cityMatch = beforeState.match(/\b([A-Za-z\s]+)$/);
        if (cityMatch) {
          return { city: cityMatch[1].trim(), state };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async syncWeatherForUpcomingGames(): Promise<void> {
    try {
      console.log('🌤️ Syncing weather data for upcoming games...');

      // Get upcoming games without weather data
      const upcomingGames = await db.select({
        id: games.id,
        stadium: games.stadium,
        location: games.location,
        startDate: games.startDate
      })
      .from(games)
      .where(and(
        gte(games.startDate, new Date()),
        eq(games.completed, false),
        isNull(games.temperature)
      ))
      .limit(20);

      console.log(`🌡️ Found ${upcomingGames.length} games needing weather data`);

      let updated = 0;
      let errors = 0;

      for (const game of upcomingGames) {
        try {
          const isDome = this.isDomeVenue(game.stadium || '');

          let weatherData: WeatherData | null = null;

          if (!isDome) {
            const locationInfo = this.extractCityState(game.location || game.stadium || '');

            if (locationInfo) {
              weatherData = await this.getWeatherForLocation(locationInfo.city, locationInfo.state);

              if (weatherData) {
                weatherData.isDome = false;
              }
            }
          } else {
            // For dome games, set controlled environment data
            weatherData = {
              temperature: 72,
              humidity: 45,
              windSpeed: 0,
              windDirection: 'N',
              precipitation: 0,
              weatherCondition: 'Clear',
              isDome: true,
              weatherImpactScore: 0
            };
          }

          if (weatherData) {
            await db.update(games)
              .set({
                temperature: weatherData.temperature,
                humidity: weatherData.humidity,
                windSpeed: weatherData.windSpeed,
                windDirection: weatherData.windDirection,
                precipitation: weatherData.precipitation,
                weatherCondition: weatherData.weatherCondition,
                isDome: weatherData.isDome,
                weatherImpactScore: weatherData.weatherImpactScore,
                lastUpdated: new Date()
              })
              .where(eq(games.id, game.id));

            console.log(`✅ Updated weather for game ${game.id}: ${weatherData.temperature}°F, ${weatherData.weatherCondition}, Impact: ${weatherData.weatherImpactScore}`);
            updated++;
          }

          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error updating weather for game ${game.id}:`, error);
          errors++;
        }
      }

      console.log(`🌤️ Weather sync completed: ${updated} updated, ${errors} errors`);

    } catch (error) {
      console.error('❌ Weather sync failed:', error);
      throw error;
    }
  }

  // Friday sync: Get weather forecasts before weekend games
  async fridayWeatherSync(): Promise<void> {
    console.log('📅 Friday weather sync - weekend game forecasts');
    await this.syncWeatherForUpcomingGames();
  }

  // Saturday sync: Update weather conditions for game day
  async saturdayWeatherSync(): Promise<void> {
    console.log('📅 Saturday weather sync - game day conditions');
    await this.syncWeatherForUpcomingGames();
  }
}

// Singleton instance
let weatherSyncInstance: WeatherSync | null = null;

export function getWeatherSync(): WeatherSync {
  if (!weatherSyncInstance) {
    weatherSyncInstance = new WeatherSync();
  }
  return weatherSyncInstance;
}

export async function syncWeatherData(): Promise<void> {
  const sync = getWeatherSync();
  await sync.syncWeatherForUpcomingGames();
}