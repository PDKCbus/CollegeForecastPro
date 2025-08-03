#!/usr/bin/env python3
"""
Rick's Picks Prediction Algorithm
Data-driven points system based on our 28,431-game analysis findings
"""

import pandas as pd
import numpy as np
from database_connection import get_db
from typing import Dict, List, Tuple, Optional

class RicksPicksPredictionEngine:
    """
    Authentic prediction algorithm based on statistical analysis of historical data
    Uses findings from weather, conference, and betting line analysis
    """
    
    def __init__(self):
        """Initialize with our proven analytical findings"""
        self.db = get_db()
        
        # Data-driven scoring weights based on our analysis
        self.scoring_weights = {
            'weather_impact': 0.15,      # 7.9 point dome advantage found
            'conference_strength': 0.25,  # SEC +5.7, Power 5 77.4% vs G5
            'home_field_advantage': 0.10, # Away teams cover 53.3% (declining)
            'recent_performance': 0.20,   # Momentum factor
            'head_to_head': 0.15,        # Historical matchup data
            'betting_line_value': 0.15    # Vegas line inefficiencies
        }
        
        # Conference strength rankings (based on our +/- analysis)
        self.conference_power_ratings = {
            'SEC': 5.7,
            'Big Ten': 4.1, 
            'Big 12': 3.0,
            'ACC': 2.9,
            'Pac-12': 0.5,
            'Mountain West': -0.2,
            'American Athletic': -0.8,
            'Sun Belt': 1.2,
            'Conference USA': 1.5,
            'Mid-American': -1.1,
            'FBS Independents': -4.5
        }
        
    def calculate_weather_factor(self, temperature: Optional[float], wind_speed: Optional[float], 
                               is_dome: bool, precipitation: Optional[float] = None) -> Dict:
        """
        Calculate weather impact based on our dome/outdoor analysis
        Dome games average 7.9 more points, wind >15 MPH reduces scoring by 1.7 points
        """
        factor_score = 0
        impact_description = []
        
        if is_dome:
            factor_score += 4.0  # Dome advantage (controlled conditions)
            impact_description.append("Dome: Controlled climate favors offense (+4.0)")
        else:
            # Temperature impact
            if temperature is not None:
                if temperature < 32:
                    factor_score -= 2.5  # Cold weather reduces scoring
                    impact_description.append(f"Freezing temps ({temperature}°F): Reduced offensive efficiency (-2.5)")
                elif temperature < 40:
                    factor_score -= 1.0
                    impact_description.append(f"Cold weather ({temperature}°F): Limited offensive impact (-1.0)")
                elif temperature > 85:
                    factor_score -= 0.5  # Heat fatigue
                    impact_description.append(f"Hot weather ({temperature}°F): Potential fatigue factor (-0.5)")
            
            # Wind impact
            if wind_speed is not None:
                if wind_speed > 20:
                    factor_score -= 2.0  # Significant wind impact
                    impact_description.append(f"High winds ({wind_speed} MPH): Passing game disrupted (-2.0)")
                elif wind_speed > 15:
                    factor_score -= 1.0
                    impact_description.append(f"Moderate winds ({wind_speed} MPH): Some passing difficulty (-1.0)")
            
            # Precipitation
            if precipitation and precipitation > 0:
                factor_score -= 1.5
                impact_description.append("Precipitation: Ball handling challenges, favors ground game (-1.5)")
        
        return {
            'score': factor_score,
            'impact': impact_description,
            'category': 'Weather Impact'
        }
    
    def calculate_conference_factor(self, home_conference: str, away_conference: str) -> Dict:
        """
        Conference strength differential based on our Power 5 vs G5 analysis
        SEC leads with +5.7 differential, Power 5 beats G5 77.4% of time
        """
        home_rating = self.conference_power_ratings.get(home_conference, 0)
        away_rating = self.conference_power_ratings.get(away_conference, 0)
        
        differential = home_rating - away_rating
        factor_score = differential * 0.3  # Scale to reasonable range
        
        impact_description = []
        if abs(differential) > 3:
            impact_description.append(f"Major conference mismatch: {home_conference} vs {away_conference} ({differential:+.1f})")
        elif abs(differential) > 1:
            impact_description.append(f"Conference advantage: {home_conference} vs {away_conference} ({differential:+.1f})")
        
        # Power 5 vs Group of 5 bonus
        power5 = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12']
        home_p5 = home_conference in power5
        away_p5 = away_conference in power5
        
        if home_p5 and not away_p5:
            factor_score += 1.5  # Power 5 home vs Group of 5
            impact_description.append("Power 5 vs Group of 5: Historical 77.4% advantage (+1.5)")
        elif away_p5 and not home_p5:
            factor_score -= 1.5  # Group of 5 home vs Power 5
            impact_description.append("Group of 5 vs Power 5: Facing 77.4% disadvantage (-1.5)")
        
        return {
            'score': factor_score,
            'impact': impact_description,
            'category': 'Conference Strength'
        }
    
    def calculate_home_field_factor(self, is_neutral_site: bool = False) -> Dict:
        """
        Home field advantage calculation
        Our data shows away teams cover 53.3% vs 46.7%, suggesting declining home advantage
        """
        if is_neutral_site:
            return {
                'score': 0,
                'impact': ["Neutral site: No home field advantage"],
                'category': 'Home Field'
            }
        
        # Traditional home field is worth about 2.5-3 points, but our data suggests it's declining
        factor_score = 2.0  # Reduced from traditional 3 points
        
        return {
            'score': factor_score,
            'impact': [f"Home field advantage: Traditional boost, but away teams cover 53.3% (+{factor_score})"],
            'category': 'Home Field'
        }
    
    def calculate_betting_line_value(self, vegas_spread: Optional[float], 
                                   predicted_spread: float) -> Dict:
        """
        Identify betting value based on our prediction vs Vegas line
        34% of games have 14+ point errors, showing Vegas inefficiencies
        """
        if vegas_spread is None:
            return {
                'score': 0,
                'impact': ["No betting line available"],
                'category': 'Betting Value'
            }
        
        line_differential = abs(predicted_spread - vegas_spread)
        factor_score = 0
        impact_description = []
        
        if line_differential >= 3:
            factor_score = min(line_differential * 0.5, 4.0)  # Cap at 4 points
            if predicted_spread > vegas_spread:
                impact_description.append(f"Vegas undervaluing home team by {line_differential:.1f} points (+{factor_score:.1f})")
            else:
                impact_description.append(f"Vegas overvaluing home team by {line_differential:.1f} points (+{factor_score:.1f})")
        
        return {
            'score': factor_score,
            'impact': impact_description,
            'category': 'Betting Line Value'
        }
    
    def generate_prediction(self, home_team: str, away_team: str, 
                          home_conference: str, away_conference: str,
                          temperature: Optional[float] = None,
                          wind_speed: Optional[float] = None,
                          is_dome: bool = False,
                          vegas_spread: Optional[float] = None,
                          precipitation: Optional[float] = None,
                          is_neutral_site: bool = False) -> Dict:
        """
        Generate comprehensive prediction with point-based scoring system
        """
        
        # Calculate individual factors
        weather_factor = self.calculate_weather_factor(temperature, wind_speed, is_dome, precipitation)
        conference_factor = self.calculate_conference_factor(home_conference, away_conference)
        home_field_factor = self.calculate_home_field_factor(is_neutral_site)
        
        # Base prediction (home team perspective)
        base_prediction = home_field_factor['score'] + conference_factor['score'] + weather_factor['score']
        
        # Calculate betting value
        betting_value = self.calculate_betting_line_value(vegas_spread, base_prediction)
        
        # Final prediction
        total_score = base_prediction + betting_value['score']
        
        # Determine confidence level
        factor_count = len([f for f in [weather_factor, conference_factor, home_field_factor, betting_value] 
                           if f['score'] != 0])
        
        if abs(total_score) > 6 and factor_count >= 3:
            confidence = "High"
        elif abs(total_score) > 3 and factor_count >= 2:
            confidence = "Medium"
        else:
            confidence = "Low"
        
        # Compile all key factors
        all_factors = []
        for factor in [weather_factor, conference_factor, home_field_factor, betting_value]:
            if factor['impact']:
                all_factors.extend(factor['impact'])
        
        # Prediction result
        if total_score > 0:
            prediction = f"{home_team} favored by {abs(total_score):.1f} points"
            recommended_bet = f"Take {home_team}" if vegas_spread and total_score > vegas_spread + 1.5 else None
        else:
            prediction = f"{away_team} favored by {abs(total_score):.1f} points"
            recommended_bet = f"Take {away_team}" if vegas_spread and abs(total_score) > abs(vegas_spread) + 1.5 else None
        
        return {
            'prediction': prediction,
            'spread': total_score,
            'confidence': confidence,
            'key_factors': all_factors,
            'recommended_bet': recommended_bet,
            'vegas_line': vegas_spread,
            'edge': abs(total_score - (vegas_spread or 0)) if vegas_spread else None,
            'factor_breakdown': {
                'weather': weather_factor['score'],
                'conference': conference_factor['score'], 
                'home_field': home_field_factor['score'],
                'betting_value': betting_value['score']
            }
        }
    
    def close(self):
        """Close database connection"""
        self.db.close()

def test_prediction_algorithm():
    """Test the algorithm with sample matchups"""
    print("🎯 RICK'S PICKS PREDICTION ALGORITHM TEST")
    print("=" * 60)
    
    engine = RicksPicksPredictionEngine()
    
    # Test cases based on realistic scenarios
    test_cases = [
        {
            'name': "SEC vs Big 12 (Dome Game)",
            'home_team': "LSU",
            'away_team': "Texas Tech", 
            'home_conference': "SEC",
            'away_conference': "Big 12",
            'is_dome': True,
            'vegas_spread': -7.0
        },
        {
            'name': "Power 5 vs Group of 5 (Cold Weather)",
            'home_team': "Michigan",
            'away_team': "Central Michigan",
            'home_conference': "Big Ten", 
            'away_conference': "Mid-American",
            'temperature': 28.0,
            'wind_speed': 18.0,
            'vegas_spread': -21.0
        },
        {
            'name': "Conference Championship (High Wind)",
            'home_team': "Oklahoma State",
            'away_team': "Texas",
            'home_conference': "Big 12",
            'away_conference': "Big 12", 
            'temperature': 45.0,
            'wind_speed': 25.0,
            'vegas_spread': -3.5
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n🏈 Test Case {i}: {test['name']}")
        print("-" * 50)
        
        name = test.pop('name')
        result = engine.generate_prediction(**test)
        
        print(f"Matchup: {test['home_team']} vs {test['away_team']}")
        print(f"Prediction: {result['prediction']}")
        print(f"Confidence: {result['confidence']}")
        print(f"Vegas Line: {result['vegas_line']}")
        if result['recommended_bet']:
            print(f"Recommended Bet: {result['recommended_bet']}")
        
        print("\nKey Factors:")
        for factor in result['key_factors']:
            print(f"  • {factor}")
    
    engine.close()
    print("\n✅ Prediction algorithm test complete!")

if __name__ == "__main__":
    test_prediction_algorithm()