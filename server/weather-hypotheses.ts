/**
 * Weather-Related Hypotheses for College Football Analytics
 * 20+ testable hypotheses about weather impact on game outcomes
 */

export interface WeatherHypothesis {
  id: string;
  name: string;
  description: string;
  testCondition: string;
  expectedOutcome: string;
  confidence: 'high' | 'medium' | 'low';
  dataRequirements: string[];
}

export const WEATHER_HYPOTHESES: WeatherHypothesis[] = [
  // Temperature Hypotheses
  {
    id: 'temp_cold_home',
    name: 'Cold Weather Home Advantage',
    description: 'Teams playing at home in cold weather (< 35°F) cover spreads more often',
    testCondition: 'temperature < 35 AND is_home_game = true',
    expectedOutcome: 'Higher ATS win rate for home teams in cold games',
    confidence: 'high',
    dataRequirements: ['temperature', 'spread', 'home_team_score', 'away_team_score']
  },
  {
    id: 'temp_heat_offense',
    name: 'Extreme Heat Reduces Offense',
    description: 'Games in extreme heat (> 90°F) go UNDER total points more often',
    testCondition: 'temperature > 90',
    expectedOutcome: 'Lower scoring games, UNDER bets hit more frequently',
    confidence: 'medium',
    dataRequirements: ['temperature', 'over_under', 'total_points']
  },
  {
    id: 'temp_swing_upset',
    name: 'Temperature Swing Upsets',
    description: 'Large temperature differences from team\'s climate increase upset probability',
    testCondition: 'ABS(game_temp - home_team_avg_temp) > 30',
    expectedOutcome: 'More upsets when visiting teams face extreme temperature changes',
    confidence: 'medium',
    dataRequirements: ['temperature', 'team_location', 'betting_odds']
  },
  {
    id: 'temp_playoff_performance',
    name: 'Cold Weather Playoff Preparation',
    description: 'Teams from cold climates perform better in playoff/bowl games in cold weather',
    testCondition: 'temperature < 40 AND game_importance = "playoff"',
    expectedOutcome: 'Northern teams outperform southern teams in cold playoff games',
    confidence: 'high',
    dataRequirements: ['temperature', 'team_conference', 'game_type']
  },

  // Wind Hypotheses
  {
    id: 'wind_passing_accuracy',
    name: 'High Winds Reduce Passing Efficiency',
    description: 'Games with winds > 20 MPH favor rushing attacks and UNDER bets',
    testCondition: 'wind_speed > 20',
    expectedOutcome: 'Lower passing yards, more rushing attempts, games go UNDER',
    confidence: 'high',
    dataRequirements: ['wind_speed', 'passing_yards', 'rushing_yards', 'total_points']
  },
  {
    id: 'wind_field_goals',
    name: 'Wind Impacts Field Goal Success',
    description: 'Strong crosswinds (> 15 MPH) significantly reduce field goal accuracy',
    testCondition: 'wind_speed > 15 AND wind_direction IN ("E", "W")',
    expectedOutcome: 'Lower field goal percentage, more missed extra points',
    confidence: 'high',
    dataRequirements: ['wind_speed', 'wind_direction', 'field_goal_attempts', 'field_goal_made']
  },
  {
    id: 'wind_turnover_increase',
    name: 'Wind Increases Turnovers',
    description: 'High winds (> 25 MPH) increase fumbles and interceptions',
    testCondition: 'wind_speed > 25',
    expectedOutcome: 'Higher turnover rates, more chaotic games',
    confidence: 'medium',
    dataRequirements: ['wind_speed', 'turnovers', 'fumbles', 'interceptions']
  },

  // Precipitation Hypotheses
  {
    id: 'rain_rushing_advantage',
    name: 'Rain Favors Power Running Teams',
    description: 'Teams with strong rushing attacks perform better in rainy conditions',
    testCondition: 'precipitation > 0.1 AND weather_condition LIKE "%rain%"',
    expectedOutcome: 'Rushing-heavy teams cover spreads more often in rain',
    confidence: 'high',
    dataRequirements: ['precipitation', 'weather_condition', 'team_rushing_yards_avg']
  },
  {
    id: 'snow_home_field',
    name: 'Snow Amplifies Home Field Advantage',
    description: 'Snowy conditions provide extra home field advantage, especially for northern teams',
    testCondition: 'weather_condition LIKE "%snow%" AND temperature < 32',
    expectedOutcome: 'Home teams cover at higher rate in snow games',
    confidence: 'high',
    dataRequirements: ['weather_condition', 'temperature', 'home_team_performance']
  },
  {
    id: 'storm_total_variance',
    name: 'Storms Create Scoring Variance',
    description: 'Thunderstorms and severe weather create unpredictable scoring patterns',
    testCondition: 'weather_condition LIKE "%storm%" OR weather_condition LIKE "%thunder%"',
    expectedOutcome: 'Higher variance in total points, harder to predict O/U',
    confidence: 'medium',
    dataRequirements: ['weather_condition', 'total_points', 'scoring_variance']
  },

  // Humidity Hypotheses
  {
    id: 'humidity_stamina',
    name: 'High Humidity Affects Late-Game Performance',
    description: 'Games in high humidity (> 80%) favor teams with better conditioning',
    testCondition: 'humidity > 80',
    expectedOutcome: 'More scoring variance between halves, fatigue factor increases',
    confidence: 'medium',
    dataRequirements: ['humidity', 'first_half_score', 'second_half_score']
  },
  {
    id: 'humidity_dome_vs_outdoor',
    name: 'Humidity Advantage for Dome Teams',
    description: 'Teams that play in domes struggle more in high outdoor humidity',
    testCondition: 'humidity > 75 AND visiting_team_dome_percentage > 50',
    expectedOutcome: 'Dome teams underperform in humid outdoor games',
    confidence: 'low',
    dataRequirements: ['humidity', 'team_dome_games', 'team_performance']
  },

  // Seasonal Weather Hypotheses
  {
    id: 'early_season_heat',
    name: 'Early Season Heat Disadvantage',
    description: 'Teams struggle more with heat in August/September before acclimatization',
    testCondition: 'temperature > 85 AND week <= 4',
    expectedOutcome: 'More upsets and lower scoring in early season heat',
    confidence: 'medium',
    dataRequirements: ['temperature', 'week', 'upset_probability']
  },
  {
    id: 'late_season_cold',
    name: 'Late Season Cold Weather Specialist',
    description: 'Teams from cold climates gain advantage as season progresses into winter',
    testCondition: 'temperature < 40 AND week >= 10',
    expectedOutcome: 'Northern teams outperform expectations in late season',
    confidence: 'high',
    dataRequirements: ['temperature', 'week', 'team_climate_zone']
  },

  // Weather Swing Hypotheses
  {
    id: 'weather_travel_shock',
    name: 'Weather Travel Shock',
    description: 'Teams traveling to dramatically different weather conditions underperform',
    testCondition: 'ABS(home_weather - away_team_home_weather) > 40',
    expectedOutcome: 'Visiting teams struggle when weather differs significantly from home',
    confidence: 'medium',
    dataRequirements: ['game_weather', 'team_home_climate', 'travel_distance']
  },
  {
    id: 'weather_equipment_factor',
    name: 'Weather Equipment Preparation',
    description: 'Teams better prepared for weather conditions (cold weather gear, etc.) perform better',
    testCondition: 'extreme_weather = true AND team_weather_preparation_score',
    expectedOutcome: 'Better prepared teams cover spreads in adverse weather',
    confidence: 'low',
    dataRequirements: ['weather_conditions', 'team_preparation_metrics']
  },

  // Dome vs Outdoor Hypotheses
  {
    id: 'dome_outdoor_transition',
    name: 'Dome Team Outdoor Struggles',
    description: 'Teams that play primarily in domes struggle outdoors in adverse weather',
    testCondition: 'team_dome_games > 6 AND outdoor_game = true AND adverse_weather = true',
    expectedOutcome: 'Dome teams underperform in outdoor weather games',
    confidence: 'medium',
    dataRequirements: ['team_dome_percentage', 'weather_severity', 'performance_metrics']
  },
  {
    id: 'outdoor_dome_advantage',
    name: 'Outdoor Team Dome Comfort',
    description: 'Teams used to outdoor conditions may struggle with dome acoustics and conditions',
    testCondition: 'team_outdoor_games > 8 AND dome_game = true',
    expectedOutcome: 'Outdoor teams may underperform in unfamiliar dome environment',
    confidence: 'low',
    dataRequirements: ['team_venue_types', 'dome_performance', 'crowd_noise_levels']
  },

  // Weather + Time Hypotheses
  {
    id: 'weather_night_games',
    name: 'Weather Impact in Night Games',
    description: 'Weather conditions have amplified impact during night games due to visibility',
    testCondition: 'game_time > "18:00" AND adverse_weather = true',
    expectedOutcome: 'Weather creates more turnovers and unpredictability at night',
    confidence: 'medium',
    dataRequirements: ['game_time', 'weather_conditions', 'visibility', 'turnover_rate']
  },
  {
    id: 'weather_tv_timeouts',
    name: 'Weather and TV Timeout Strategy',
    description: 'Teams use TV timeouts more strategically in adverse weather for player warming',
    testCondition: 'temperature < 35 AND tv_game = true',
    expectedOutcome: 'Different timeout usage patterns in cold weather TV games',
    confidence: 'low',
    dataRequirements: ['temperature', 'timeout_usage', 'tv_schedule']
  },

  // Advanced Weather Combinations
  {
    id: 'weather_perfect_storm',
    name: 'Perfect Storm Conditions',
    description: 'Combination of cold, wind, and precipitation creates maximum chaos',
    testCondition: 'temperature < 35 AND wind_speed > 15 AND precipitation > 0',
    expectedOutcome: 'Highest upset probability and lowest scoring games',
    confidence: 'high',
    dataRequirements: ['temperature', 'wind_speed', 'precipitation', 'upset_rate']
  }
];

/**
 * Weather Hypothesis Testing Framework
 */
export class WeatherHypothesisTester {
  async testHypothesis(hypothesis: WeatherHypothesis, seasonData: any[]): Promise<{
    hypothesis: string;
    sampleSize: number;
    successRate: number;
    confidence: number;
    significance: 'significant' | 'marginal' | 'inconclusive';
    insights: string[];
  }> {
    // Implementation will test each hypothesis against historical data
    // Return statistical significance and practical insights
    return {
      hypothesis: hypothesis.name,
      sampleSize: 0,
      successRate: 0,
      confidence: 0,
      significance: 'inconclusive',
      insights: []
    };
  }
}