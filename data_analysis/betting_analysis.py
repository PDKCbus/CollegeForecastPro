#!/usr/bin/env python3
"""
Betting Line Analysis
Tests Vegas spread accuracy, over/under trends, and identifies betting edges
"""

import pandas as pd
import numpy as np
from database_connection import get_db

def run_betting_analysis():
    """Comprehensive analysis of betting line performance"""
    print("💰 BETTING LINE ANALYSIS")
    print("=" * 50)
    
    db = get_db()
    
    # Get games with complete betting data
    query = """
    SELECT 
        g.season,
        g.week,
        ht.name as home_team,
        ht.conference as home_conference,
        at.name as away_team,
        at.conference as away_conference,
        g.home_team_score,
        g.away_team_score,
        g.spread,
        g.over_under,
        g.temperature,
        g.is_dome
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.completed = true 
      AND g.spread IS NOT NULL 
      AND g.over_under IS NOT NULL
      AND g.season >= 2015
    ORDER BY g.season DESC, g.week DESC
    """
    
    df = db.execute_query(query)
    print(f"📊 Loaded {len(df)} games with complete betting data (2015-2024)")
    
    if len(df) == 0:
        print("❌ No betting data found")
        db.close()
        return
    
    # Calculate betting results
    df['point_differential'] = df['home_team_score'] - df['away_team_score']
    df['total_points'] = df['home_team_score'] + df['away_team_score']
    
    # Spread results (home team perspective)
    df['home_covered'] = (df['point_differential'] + df['spread']) > 0
    df['spread_push'] = abs(df['point_differential'] + df['spread']) < 0.5
    
    # Over/under results
    df['over_hit'] = df['total_points'] > df['over_under']
    df['total_push'] = abs(df['total_points'] - df['over_under']) < 0.5
    
    # Spread accuracy analysis
    print(f"\n📈 Spread Analysis:")
    print("-" * 30)
    
    home_covers = len(df[df['home_covered'] == True])
    away_covers = len(df[df['home_covered'] == False])
    spread_pushes = len(df[df['spread_push'] == True])
    total_spread_games = len(df) - spread_pushes
    
    home_cover_pct = (home_covers / total_spread_games * 100) if total_spread_games > 0 else 0
    
    print(f"Home team covers: {home_covers} ({home_cover_pct:.1f}%)")
    print(f"Away team covers: {away_covers} ({100 - home_cover_pct:.1f}%)")
    print(f"Pushes: {spread_pushes}")
    print(f"Vegas spread accuracy: {abs(50 - home_cover_pct):.1f}% from 50/50")
    
    # Over/under analysis
    print(f"\n📊 Over/Under Analysis:")
    print("-" * 30)
    
    overs = len(df[df['over_hit'] == True])
    unders = len(df[df['over_hit'] == False])
    total_pushes = len(df[df['total_push'] == True])
    total_ou_games = len(df) - total_pushes
    
    over_pct = (overs / total_ou_games * 100) if total_ou_games > 0 else 0
    
    print(f"Overs: {overs} ({over_pct:.1f}%)")
    print(f"Unders: {unders} ({100 - over_pct:.1f}%)")
    print(f"Pushes: {total_pushes}")
    print(f"Vegas total accuracy: {abs(50 - over_pct):.1f}% from 50/50")
    
    # Season-by-season trends
    print(f"\n📅 Season-by-Season Trends:")
    print("-" * 40)
    print("Season | Home Cover % | Over % | Games")
    print("-" * 40)
    
    for season in sorted(df['season'].unique(), reverse=True):
        season_df = df[df['season'] == season]
        
        season_home_covers = len(season_df[season_df['home_covered'] == True])
        season_pushes = len(season_df[season_df['spread_push'] == True])
        season_spread_games = len(season_df) - season_pushes
        season_home_pct = (season_home_covers / season_spread_games * 100) if season_spread_games > 0 else 0
        
        season_overs = len(season_df[season_df['over_hit'] == True])
        season_total_pushes = len(season_df[season_df['total_push'] == True])
        season_ou_games = len(season_df) - season_total_pushes
        season_over_pct = (season_overs / season_ou_games * 100) if season_ou_games > 0 else 0
        
        print(f"{season}   |    {season_home_pct:5.1f}%   | {season_over_pct:4.1f}% | {len(season_df):4d}")
    
    # Weather impact on betting
    print(f"\n🌡️ Weather Impact on Betting:")
    print("-" * 35)
    
    # Filter games with temperature data
    weather_df = df[df['temperature'].notna() | (df['is_dome'] == True)]
    weather_df['temperature'] = weather_df['temperature'].fillna(72)  # Dome games
    
    if len(weather_df) > 0:
        # Cold weather games
        cold_games = weather_df[weather_df['temperature'] < 40]
        warm_games = weather_df[weather_df['temperature'] >= 70]
        
        if len(cold_games) > 0:
            cold_over_pct = (len(cold_games[cold_games['over_hit'] == True]) / len(cold_games) * 100)
            print(f"Cold games (<40°F): {cold_over_pct:.1f}% overs ({len(cold_games)} games)")
        
        if len(warm_games) > 0:
            warm_over_pct = (len(warm_games[warm_games['over_hit'] == True]) / len(warm_games) * 100)
            print(f"Warm games (≥70°F): {warm_over_pct:.1f}% overs ({len(warm_games)} games)")
        
        # Dome vs outdoor
        dome_games = weather_df[weather_df['is_dome'] == True]
        outdoor_games = weather_df[weather_df['is_dome'] == False]
        
        if len(dome_games) > 0:
            dome_over_pct = (len(dome_games[dome_games['over_hit'] == True]) / len(dome_games) * 100)
            print(f"Dome games: {dome_over_pct:.1f}% overs ({len(dome_games)} games)")
        
        if len(outdoor_games) > 0:
            outdoor_over_pct = (len(outdoor_games[outdoor_games['over_hit'] == True]) / len(outdoor_games) * 100)
            print(f"Outdoor games: {outdoor_over_pct:.1f}% overs ({len(outdoor_games)} games)")
    
    # Biggest line moves (spread accuracy)
    print(f"\n🎯 Spread Accuracy Distribution:")
    print("-" * 35)
    
    df['spread_error'] = abs(df['point_differential'] + df['spread'])
    
    perfect_lines = len(df[df['spread_error'] < 0.5])
    close_lines = len(df[df['spread_error'] < 3])
    way_off_lines = len(df[df['spread_error'] > 14])
    
    print(f"Perfect lines (±0.5): {perfect_lines} ({perfect_lines/len(df)*100:.1f}%)")
    print(f"Close lines (±3): {close_lines} ({close_lines/len(df)*100:.1f}%)")
    print(f"Way off lines (>14): {way_off_lines} ({way_off_lines/len(df)*100:.1f}%)")
    print(f"Average spread error: {df['spread_error'].mean():.1f} points")
    
    # Conference performance vs spread
    print(f"\n🏆 Conference Performance vs Spread:")
    print("-" * 40)
    
    power5 = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'PAC-12', 'Pac-12']
    
    for conf in power5:
        conf_home = df[df['home_conference'] == conf]
        conf_away = df[df['away_conference'] == conf]
        
        home_covers = len(conf_home[conf_home['home_covered'] == True])
        away_covers = len(conf_away[conf_away['home_covered'] == False])
        total_covers = home_covers + away_covers
        total_games = len(conf_home) + len(conf_away)
        
        if total_games > 0:
            cover_pct = total_covers / total_games * 100
            print(f"{conf:10} | {total_covers:3d}/{total_games:3d} | {cover_pct:.1f}% ATS")
    
    db.close()
    print("\n✅ Betting analysis complete!")

if __name__ == "__main__":
    run_betting_analysis()