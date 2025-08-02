"""
Weather Impact Analysis for College Football
Tests hypotheses about weather effects on game outcomes, scoring, and betting performance
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from database_connection import get_db
from typing import Dict, List, Tuple

class WeatherAnalyzer:
    """Comprehensive weather impact analysis for college football games"""
    
    def __init__(self):
        """Initialize with weather-enabled dataset (2015-2024)"""
        self.db = get_db()
        self.df = self.db.get_weather_games(start_season=2015)
        print(f"📊 Loaded {len(self.df)} games with weather data (2015-2024)")
        
        # Add calculated fields
        self._add_calculated_fields()
    
    def _add_calculated_fields(self):
        """Add calculated fields for analysis"""
        # Total scoring
        self.df['total_points'] = self.df['home_team_score'] + self.df['away_team_score']
        
        # Point differential (positive = home team won)
        self.df['point_differential'] = self.df['home_team_score'] - self.df['away_team_score']
        
        # Temperature categories
        self.df['temp_category'] = pd.cut(
            self.df['temperature'].fillna(72),  # Dome games = 72°F
            bins=[-np.inf, 32, 50, 70, 85, np.inf],
            labels=['Freezing', 'Cold', 'Cool', 'Warm', 'Hot']
        )
        
        # Wind categories
        self.df['wind_category'] = pd.cut(
            self.df['wind_speed'].fillna(0),  # Dome games = 0 wind
            bins=[-np.inf, 5, 15, 25, np.inf],
            labels=['Calm', 'Light', 'Moderate', 'Strong']
        )
        
        # Spread coverage (home team perspective)
        self.df['home_covered'] = (self.df['point_differential'] + self.df['spread'].fillna(0)) > 0
        
        # Over/under results
        over_under_filled = self.df['over_under'].fillna(self.df['total_points'])
        self.df['over_hit'] = self.df['total_points'] > over_under_filled
        
    def temperature_impact_analysis(self) -> Dict:
        """Analyze how temperature affects scoring and game outcomes"""
        print("\n🌡️ Temperature Impact Analysis")
        print("=" * 50)
        
        results = {}
        
        # Scoring by temperature
        temp_scoring = self.df.groupby('temp_category').agg({
            'total_points': ['mean', 'std', 'count'],
            'home_team_score': 'mean',
            'away_team_score': 'mean'
        }).round(2)
        
        print("\n📊 Average Scoring by Temperature:")
        print(temp_scoring)
        
        # Statistical test for temperature effect on scoring
        temp_groups = [group['total_points'].values for name, group in self.df.groupby('temp_category')]
        f_stat, p_value = stats.f_oneway(*temp_groups)
        
        results['temperature_scoring'] = {
            'f_statistic': f_stat,
            'p_value': p_value,
            'significant': p_value < 0.05,
            'by_category': temp_scoring
        }
        
        print(f"\n🧪 ANOVA Test Results:")
        print(f"   F-statistic: {f_stat:.3f}")
        print(f"   P-value: {p_value:.6f}")
        print(f"   Significant: {'YES' if p_value < 0.05 else 'NO'}")
        
        # Cold weather hypothesis (< 32°F reduces scoring)
        cold_games = self.df[self.df['temperature'] < 32]
        warm_games = self.df[self.df['temperature'] >= 50]
        
        if len(cold_games) > 0 and len(warm_games) > 0:
            cold_avg = cold_games['total_points'].mean()
            warm_avg = warm_games['total_points'].mean()
            t_stat, t_p = stats.ttest_ind(cold_games['total_points'], warm_games['total_points'])
            
            results['cold_weather_hypothesis'] = {
                'cold_avg_points': cold_avg,
                'warm_avg_points': warm_avg,
                'difference': warm_avg - cold_avg,
                't_statistic': t_stat,
                'p_value': t_p,
                'significant': t_p < 0.05
            }
            
            print(f"\n❄️ Cold Weather Hypothesis (< 32°F vs ≥ 50°F):")
            print(f"   Cold games average: {cold_avg:.1f} points")
            print(f"   Warm games average: {warm_avg:.1f} points")
            print(f"   Difference: {warm_avg - cold_avg:.1f} points")
            print(f"   Significant: {'YES' if t_p < 0.05 else 'NO'} (p={t_p:.4f})")
        
        return results
    
    def wind_impact_analysis(self) -> Dict:
        """Analyze wind effects on passing vs rushing and scoring"""
        print("\n💨 Wind Impact Analysis")
        print("=" * 50)
        
        results = {}
        
        # Filter out dome games for wind analysis
        outdoor_games = self.df[self.df['is_dome'] == False].copy()
        
        if len(outdoor_games) == 0:
            print("⚠️ No outdoor games found for wind analysis")
            return results
            
        # Scoring by wind speed
        wind_scoring = outdoor_games.groupby('wind_category').agg({
            'total_points': ['mean', 'std', 'count']
        }).round(2)
        
        print("\n📊 Average Scoring by Wind Speed (Outdoor Games Only):")
        print(wind_scoring)
        
        # High wind hypothesis (>20 MPH reduces scoring)
        high_wind = outdoor_games[outdoor_games['wind_speed'] > 20]
        low_wind = outdoor_games[outdoor_games['wind_speed'] <= 10]
        
        if len(high_wind) > 0 and len(low_wind) > 0:
            high_wind_avg = high_wind['total_points'].mean()
            low_wind_avg = low_wind['total_points'].mean()
            t_stat, t_p = stats.ttest_ind(high_wind['total_points'], low_wind['total_points'])
            
            results['high_wind_hypothesis'] = {
                'high_wind_avg': high_wind_avg,
                'low_wind_avg': low_wind_avg,
                'difference': low_wind_avg - high_wind_avg,
                't_statistic': t_stat,
                'p_value': t_p,
                'significant': t_p < 0.05,
                'high_wind_games': len(high_wind),
                'low_wind_games': len(low_wind)
            }
            
            print(f"\n🌪️ High Wind Hypothesis (>20 MPH vs ≤10 MPH):")
            print(f"   High wind average: {high_wind_avg:.1f} points ({len(high_wind)} games)")
            print(f"   Low wind average: {low_wind_avg:.1f} points ({len(low_wind)} games)")
            print(f"   Difference: {low_wind_avg - high_wind_avg:.1f} points")
            print(f"   Significant: {'YES' if t_p < 0.05 else 'NO'} (p={t_p:.4f})")
        
        return results
    
    def dome_advantage_analysis(self) -> Dict:
        """Compare dome vs outdoor game performance"""
        print("\n🏟️ Dome vs Outdoor Analysis")
        print("=" * 50)
        
        results = {}
        
        dome_games = self.df[self.df['is_dome'] == True]
        outdoor_games = self.df[self.df['is_dome'] == False]
        
        # Scoring comparison
        dome_avg = dome_games['total_points'].mean()
        outdoor_avg = outdoor_games['total_points'].mean()
        
        t_stat, t_p = stats.ttest_ind(dome_games['total_points'], outdoor_games['total_points'])
        
        results['dome_vs_outdoor'] = {
            'dome_avg_points': dome_avg,
            'outdoor_avg_points': outdoor_avg,
            'difference': dome_avg - outdoor_avg,
            't_statistic': t_stat,
            'p_value': t_p,
            'significant': t_p < 0.05,
            'dome_games': len(dome_games),
            'outdoor_games': len(outdoor_games)
        }
        
        print(f"\n🏟️ Dome vs Outdoor Scoring:")
        print(f"   Dome games average: {dome_avg:.1f} points ({len(dome_games)} games)")
        print(f"   Outdoor games average: {outdoor_avg:.1f} points ({len(outdoor_games)} games)")
        print(f"   Difference: {dome_avg - outdoor_avg:.1f} points")
        print(f"   Significant: {'YES' if t_p < 0.05 else 'NO'} (p={t_p:.4f})")
        
        return results
    
    def precipitation_analysis(self) -> Dict:
        """Analyze impact of rain/snow on game outcomes"""
        print("\n🌧️ Precipitation Impact Analysis")  
        print("=" * 50)
        
        results = {}
        
        # Games with precipitation
        precip_games = self.df[
            (self.df['weather_condition'].str.contains('rain|snow|storm', case=False, na=False)) |
            (self.df['precipitation'] > 0)
        ]
        clear_games = self.df[
            (~self.df['weather_condition'].str.contains('rain|snow|storm', case=False, na=False)) &
            (self.df['precipitation'].fillna(0) == 0) &
            (self.df['is_dome'] == False)
        ]
        
        if len(precip_games) > 0 and len(clear_games) > 0:
            precip_avg = precip_games['total_points'].mean()
            clear_avg = clear_games['total_points'].mean()
            t_stat, t_p = stats.ttest_ind(precip_games['total_points'], clear_games['total_points'])
            
            results['precipitation_effect'] = {
                'precipitation_avg': precip_avg,
                'clear_avg': clear_avg,
                'difference': clear_avg - precip_avg,
                't_statistic': t_stat,
                'p_value': t_p,
                'significant': t_p < 0.05,
                'precipitation_games': len(precip_games),
                'clear_games': len(clear_games)
            }
            
            print(f"\n🌧️ Precipitation vs Clear Weather:")
            print(f"   Precipitation games: {precip_avg:.1f} points ({len(precip_games)} games)")
            print(f"   Clear weather games: {clear_avg:.1f} points ({len(clear_games)} games)")
            print(f"   Difference: {clear_avg - precip_avg:.1f} points")
            print(f"   Significant: {'YES' if t_p < 0.05 else 'NO'} (p={t_p:.4f})")
        else:
            print("⚠️ Insufficient precipitation games for analysis")
        
        return results
    
    def comprehensive_weather_report(self) -> Dict:
        """Run all weather analyses and return comprehensive results"""
        print("🌤️ COMPREHENSIVE WEATHER ANALYSIS REPORT")
        print("=" * 60)
        print(f"Dataset: {len(self.df)} games from 2015-2024 with weather data")
        print(f"Dome games: {len(self.df[self.df['is_dome'] == True])}")
        print(f"Outdoor games: {len(self.df[self.df['is_dome'] == False])}")
        
        results = {
            'dataset_info': {
                'total_games': len(self.df),
                'dome_games': len(self.df[self.df['is_dome'] == True]),
                'outdoor_games': len(self.df[self.df['is_dome'] == False]),
                'seasons': '2015-2024'
            }
        }
        
        # Run all analyses
        results['temperature'] = self.temperature_impact_analysis()
        results['wind'] = self.wind_impact_analysis()
        results['dome'] = self.dome_advantage_analysis()
        results['precipitation'] = self.precipitation_analysis()
        
        return results
    
    def close(self):
        """Close database connection"""
        self.db.close()

def run_weather_analysis():
    """Main function to run comprehensive weather analysis"""
    analyzer = WeatherAnalyzer()
    results = analyzer.comprehensive_weather_report()
    analyzer.close()
    return results

if __name__ == "__main__":
    # Run the analysis
    results = run_weather_analysis()
    print("\n✅ Weather analysis complete!")
    print("Use the returned results dictionary for further processing or visualization.")