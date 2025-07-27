#!/usr/bin/env python3
"""
Basic Weather Impact Analysis - Simplified version for initial testing
"""

import pandas as pd
import numpy as np
from database_connection import get_db

def run_basic_weather_analysis():
    """Run basic weather analysis with our dataset"""
    print("🌤️ BASIC WEATHER ANALYSIS")
    print("=" * 50)
    
    db = get_db()
    
    # Get weather data with simplified query
    query = """
    SELECT 
        g.season,
        g.home_team_score,
        g.away_team_score,
        g.temperature,
        g.wind_speed,
        g.is_dome,
        g.spread,
        g.over_under
    FROM games g
    WHERE g.completed = true 
      AND g.season >= 2015
      AND (g.temperature IS NOT NULL OR g.is_dome = true)
    ORDER BY g.season DESC
    LIMIT 1000
    """
    
    df = db.execute_query(query)
    print(f"📊 Loaded {len(df)} games for analysis")
    
    if len(df) == 0:
        print("❌ No data found")
        db.close()
        return
    
    # Add calculated fields
    df['total_points'] = df['home_team_score'] + df['away_team_score']
    
    # Fill dome games with controlled conditions
    df['temperature'] = df['temperature'].fillna(72)  # Dome = 72°F
    df['wind_speed'] = df['wind_speed'].fillna(0)     # Dome = 0 wind
    
    # Basic statistics
    print(f"\n📈 Basic Statistics:")
    print(f"   Average total points: {df['total_points'].mean():.1f}")
    print(f"   Average temperature: {df['temperature'].mean():.1f}°F")
    print(f"   Average wind speed: {df['wind_speed'].mean():.1f} MPH")
    print(f"   Dome games: {len(df[df['is_dome'] == True])}")
    print(f"   Outdoor games: {len(df[df['is_dome'] == False])}")
    
    # Temperature categories
    cold_games = df[df['temperature'] < 32]
    warm_games = df[df['temperature'] >= 70]
    
    if len(cold_games) > 0 and len(warm_games) > 0:
        cold_avg = cold_games['total_points'].mean()
        warm_avg = warm_games['total_points'].mean()
        
        print(f"\n❄️ Temperature Impact:")
        print(f"   Cold games (<32°F): {cold_avg:.1f} points ({len(cold_games)} games)")
        print(f"   Warm games (≥70°F): {warm_avg:.1f} points ({len(warm_games)} games)")
        print(f"   Difference: {warm_avg - cold_avg:.1f} points")
    
    # Wind impact
    outdoor_df = df[df['is_dome'] == False]
    if len(outdoor_df) > 0:
        high_wind = outdoor_df[outdoor_df['wind_speed'] > 15]
        low_wind = outdoor_df[outdoor_df['wind_speed'] <= 5]
        
        if len(high_wind) > 0 and len(low_wind) > 0:
            high_wind_avg = high_wind['total_points'].mean()
            low_wind_avg = low_wind['total_points'].mean()
            
            print(f"\n💨 Wind Impact:")
            print(f"   High wind (>15 MPH): {high_wind_avg:.1f} points ({len(high_wind)} games)")
            print(f"   Low wind (≤5 MPH): {low_wind_avg:.1f} points ({len(low_wind)} games)")
            print(f"   Difference: {low_wind_avg - high_wind_avg:.1f} points")
    
    # Dome vs Outdoor
    dome_avg = df[df['is_dome'] == True]['total_points'].mean()
    outdoor_avg = df[df['is_dome'] == False]['total_points'].mean()
    
    print(f"\n🏟️ Dome vs Outdoor:")
    print(f"   Dome games: {dome_avg:.1f} points")
    print(f"   Outdoor games: {outdoor_avg:.1f} points")
    print(f"   Difference: {dome_avg - outdoor_avg:.1f} points")
    
    db.close()
    print("\n✅ Basic weather analysis complete!")

if __name__ == "__main__":
    run_basic_weather_analysis()