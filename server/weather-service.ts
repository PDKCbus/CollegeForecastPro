import { InsertGame, Game } from '@shared/schema';

/**
 * Weather data integration for College Football games
 * Uses CFBD API advanced data and external weather services
 */

interface CFBDVenue {
  id: number;
  name: string;
  capacity: number;
  grass: boolean;
  city: string;
  state: string;
  zip: string;
  country_code: string;
  location: {
    x: number;
    y: number;
  };
  elevation: string;
  year_constructed: number;
  dome: boolean;
  timezone: string;
}

interface WeatherData {
  temperature: number; // Fahrenheit
  windSpeed: number; // MPH
  windDirection: string; // N, NE, E, SE, S, SW, W, NW
  humidity: number; // Percentage
  precipitation: number; // Inches
  weatherCondition: string; // Clear, Cloudy, Rain, Snow, etc.
  isDome: boolean;
  weatherImpactScore: number; // 0-10 scale
}

interface HistoricalWeatherAPI {
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  rain?: {
    '1h': number;
  };
  snow?: {
    '1h': number;
  };
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.collegefootballdata.com';
  private venueCache = new Map<string, CFBDVenue>();
  private domeStadiums = new Set<string>([
    'Mercedes-Benz Stadium',
    'Ford Field', 
    'Carrier Dome',
    'Georgia Dome',
    'Alamodome',
    'Metrodome',
    'Tropicana Field',
    'Idaho Central Credit Union Arena',
    'UNI-Dome'
  ]);

  constructor() {
    this.apiKey = process.env.CFBD_API_KEY || '';
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T[]> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CFBD API error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get venue information from CFBD API
   */
  async getVenueInfo(venueName: string): Promise<CFBDVenue | null> {
    if (this.venueCache.has(venueName)) {
      return this.venueCache.get(venueName)!;
    }

    try {
      const venues = await this.makeRequest<CFBDVenue>('/venues');
      const venue = venues.find(v => 
        v.name.toLowerCase().includes(venueName.toLowerCase()) ||
        venueName.toLowerCase().includes(v.name.toLowerCase())
      );

      if (venue) {
        this.venueCache.set(venueName, venue);
        return venue;
      }
    } catch (error) {
      console.error(`Error fetching venue info for ${venueName}:`, error);
    }

    return null;
  }

  /**
   * Check if stadium is a dome
   */
  isDomeStadium(stadiumName: string): boolean {
    if (!stadiumName) return false;
    
    const lowerName = stadiumName.toLowerCase();
    return this.domeStadiums.has(stadiumName) ||
           lowerName.includes('dome') ||
           lowerName.includes('indoor') ||
           lowerName.includes('covered');
  }

  /**
   * Convert wind degrees to cardinal direction
   */
  private degreesToCardinal(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Calculate weather impact score (0-10)
   * Higher scores indicate greater impact on game performance
   */
  private calculateWeatherImpact(weather: WeatherData): number {
    let impact = 0;

    // Temperature impact
    if (weather.temperature < 32) impact += 3; // Freezing
    else if (weather.temperature < 40) impact += 2; // Very cold
    else if (weather.temperature > 95) impact += 2; // Very hot
    else if (weather.temperature > 85) impact += 1; // Hot

    // Wind impact
    if (weather.windSpeed > 25) impact += 3; // Very windy
    else if (weather.windSpeed > 15) impact += 2; // Windy
    else if (weather.windSpeed > 10) impact += 1; // Breezy

    // Precipitation impact
    if (weather.precipitation > 0.5) impact += 3; // Heavy rain/snow
    else if (weather.precipitation > 0.1) impact += 2; // Light rain/snow

    // Weather condition impact
    if (weather.weatherCondition.toLowerCase().includes('snow')) impact += 2;
    if (weather.weatherCondition.toLowerCase().includes('rain')) impact += 1;
    if (weather.weatherCondition.toLowerCase().includes('fog')) impact += 1;

    // Dome protection
    if (weather.isDome) impact = Math.max(0, impact - 4);

    return Math.min(10, impact);
  }

  /**
   * Get current/forecast weather data for upcoming games
   * Uses OpenWeather API for real-time data
   */
  async getCurrentWeather(
    latitude: number, 
    longitude: number, 
    gameDate: Date
  ): Promise<WeatherData | null> {
    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    
    if (!openWeatherKey) {
      console.warn('OpenWeather API key not found - using weather estimation');
      return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
    }

    try {
      const now = new Date();
      const hoursUntilGame = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      let endpoint: string;
      
      if (hoursUntilGame <= 0) {
        // Game is happening now or in the past - use current weather
        endpoint = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=imperial`;
      } else if (hoursUntilGame <= 120) {
        // Game is within 5 days - use 5-day forecast
        endpoint = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=imperial`;
      } else {
        // Game is too far out for forecast - estimate based on historical patterns
        return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`OpenWeather API error: ${response.status}`);
      }

      const data = await response.json();

      if (hoursUntilGame <= 0 || hoursUntilGame <= 120) {
        return this.parseOpenWeatherData(data, gameDate, hoursUntilGame <= 0);
      }
      
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
    }

    return null;
  }

  /**
   * Parse OpenWeather API response
   */
  private parseOpenWeatherData(data: any, gameDate: Date, isCurrent: boolean): WeatherData {
    let weatherInfo: any;

    if (isCurrent) {
      // Current weather data
      weatherInfo = data;
    } else {
      // Forecast data - find closest time to game
      const gameTime = gameDate.getTime();
      let closestForecast = data.list[0];
      let closestTimeDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - gameTime);

      for (const forecast of data.list) {
        const forecastTime = new Date(forecast.dt * 1000).getTime();
        const timeDiff = Math.abs(forecastTime - gameTime);
        
        if (timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff;
          closestForecast = forecast;
        }
      }
      
      weatherInfo = closestForecast;
    }

    const temperature = weatherInfo.main.temp;
    const windSpeed = (weatherInfo.wind?.speed || 0) * 2.237; // Convert m/s to mph
    const windDirection = this.degreesToCardinal(weatherInfo.wind?.deg || 0);
    const humidity = weatherInfo.main.humidity;
    const precipitation = (weatherInfo.rain?.['1h'] || weatherInfo.snow?.['1h'] || 0) * 0.0394; // mm to inches
    const weatherCondition = weatherInfo.weather[0]?.main || 'Clear';

    const weatherData: WeatherData = {
      temperature,
      windSpeed,
      windDirection,
      humidity,
      precipitation,
      weatherCondition,
      isDome: false,
      weatherImpactScore: 0
    };

    weatherData.weatherImpactScore = this.calculateWeatherImpact(weatherData);
    return weatherData;
  }

  /**
   * Get historical weather data for a game
   * Uses OpenWeather API for historical data
   */
  async getHistoricalWeather(
    latitude: number, 
    longitude: number, 
    gameDate: Date
  ): Promise<WeatherData | null> {
    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    
    if (!openWeatherKey) {
      return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
    }

    try {
      // OpenWeather One Call API for historical data
      const timestamp = Math.floor(gameDate.getTime() / 1000);
      const endpoint = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${latitude}&lon=${longitude}&dt=${timestamp}&appid=${openWeatherKey}&units=imperial`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        // Fallback to estimation if historical API fails
        return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
      }

      const data = await response.json();
      const current = data.data[0];

      const temperature = current.temp;
      const windSpeed = (current.wind_speed || 0) * 2.237; // Convert m/s to mph
      const windDirection = this.degreesToCardinal(current.wind_deg || 0);
      const humidity = current.humidity;
      const precipitation = (current.rain?.['1h'] || current.snow?.['1h'] || 0) * 0.0394;
      const weatherCondition = current.weather[0]?.main || 'Clear';

      const weatherData: WeatherData = {
        temperature,
        windSpeed,
        windDirection,
        humidity,
        precipitation,
        weatherCondition,
        isDome: false,
        weatherImpactScore: 0
      };

      weatherData.weatherImpactScore = this.calculateWeatherImpact(weatherData);
      return weatherData;

    } catch (error) {
      console.error('Error fetching historical weather:', error);
      return this.estimateWeatherFromCoordinates(latitude, longitude, gameDate);
    }
  }

  /**
   * Estimate weather from coordinates and date when API is unavailable
   */
  private estimateWeatherFromCoordinates(
    latitude: number, 
    longitude: number, 
    gameDate: Date
  ): WeatherData {
    const month = gameDate.getMonth();
    const isWinter = month < 3 || month > 10;
    const isSummer = month > 5 && month < 9;
    
    // Generate realistic weather based on season and location
    let baseTemp = 70;
    if (latitude > 45) baseTemp -= 15; // Northern locations
    if (latitude < 35) baseTemp += 10; // Southern locations
    if (isWinter) baseTemp -= 25;
    if (isSummer) baseTemp += 15;
    
    const temperature = baseTemp + (Math.random() - 0.5) * 20;
    const windSpeed = Math.random() * 15 + 5;
    const windDirection = this.degreesToCardinal(Math.random() * 360);
    const humidity = Math.random() * 40 + 30;
    const precipitation = Math.random() < 0.3 ? Math.random() * 0.5 : 0;
    
    let condition = 'Clear';
    if (precipitation > 0.1) {
      condition = temperature < 35 ? 'Snow' : 'Rain';
    } else if (Math.random() < 0.3) {
      condition = 'Cloudy';
    }

    const weatherData: WeatherData = {
      temperature,
      windSpeed,
      windDirection,
      humidity,
      precipitation,
      weatherCondition: condition,
      isDome: false,
      weatherImpactScore: 0
    };

    weatherData.weatherImpactScore = this.calculateWeatherImpact(weatherData);
    return weatherData;
  }

  /**
   * Enrich game data with weather information
   */
  async enrichGameWithWeather(game: InsertGame): Promise<InsertGame> {
    if (!game.stadium || !game.startDate) {
      return game;
    }

    try {
      // Check if dome stadium
      const isDome = this.isDomeStadium(game.stadium);
      
      if (isDome) {
        // Dome games have controlled climate
        return {
          ...game,
          temperature: 72,
          windSpeed: 0,
          windDirection: 'N',
          humidity: 50,
          precipitation: 0,
          weatherCondition: 'Controlled',
          isDome: true,
          weatherImpactScore: 0
        };
      }

      // Get venue information for coordinates
      const venue = await this.getVenueInfo(game.stadium);
      
      if (venue && venue.location) {
        const gameDate = new Date(game.startDate);
        const now = new Date();
        
        let weather: WeatherData | null;
        
        // Use current/forecast weather for upcoming games, historical for past games
        if (gameDate.getTime() > now.getTime() - (24 * 60 * 60 * 1000)) {
          // Game is today or future - use current/forecast weather
          weather = await this.getCurrentWeather(
            venue.location.y, // latitude
            venue.location.x, // longitude
            gameDate
          );
        } else {
          // Game is in the past - use historical weather
          weather = await this.getHistoricalWeather(
            venue.location.y, // latitude
            venue.location.x, // longitude
            gameDate
          );
        }

        if (weather) {
          return {
            ...game,
            temperature: weather.temperature,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection,
            humidity: weather.humidity,
            precipitation: weather.precipitation,
            weatherCondition: weather.weatherCondition,
            isDome: weather.isDome,
            weatherImpactScore: weather.weatherImpactScore
          };
        }
      }

      // Fallback: basic weather estimation
      return this.estimateWeatherFromLocation(game);

    } catch (error) {
      console.error(`Error enriching weather for game:`, error);
      return game;
    }
  }

  /**
   * Estimate weather based on stadium location and season
   */
  private estimateWeatherFromLocation(game: InsertGame): InsertGame {
    const gameDate = new Date(game.startDate!);
    const month = gameDate.getMonth();
    
    // Basic regional weather estimation
    let temp = 65;
    let condition = 'Clear';
    let windSpeed = 8;
    let precipitation = 0;
    
    // Adjust for season
    if (month < 3 || month > 10) { // Winter months
      temp = 45;
      if (Math.random() < 0.2) {
        condition = 'Snow';
        precipitation = 0.2;
      }
    } else if (month > 6 && month < 9) { // Summer months
      temp = 80;
      if (Math.random() < 0.3) {
        condition = 'Rain';
        precipitation = 0.3;
      }
    }

    const weatherImpact = this.calculateWeatherImpact({
      temperature: temp,
      windSpeed,
      windDirection: 'SW',
      humidity: 60,
      precipitation,
      weatherCondition: condition,
      isDome: false,
      weatherImpactScore: 0
    });

    return {
      ...game,
      temperature: temp,
      windSpeed,
      windDirection: 'SW',
      humidity: 60,
      precipitation,
      weatherCondition: condition,
      isDome: false,
      weatherImpactScore: weatherImpact
    };
  }

  /**
   * Batch process weather data for multiple games
   */
  async batchEnrichGamesWithWeather(games: InsertGame[]): Promise<InsertGame[]> {
    const enrichedGames: InsertGame[] = [];
    
    for (const game of games) {
      try {
        const enrichedGame = await this.enrichGameWithWeather(game);
        enrichedGames.push(enrichedGame);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing weather for game:`, error);
        enrichedGames.push(game);
      }
    }

    return enrichedGames;
  }
}

export const weatherService = new WeatherService();