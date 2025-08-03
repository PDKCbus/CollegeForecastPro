#!/usr/bin/env python3
"""
Conference Performance Analysis
Tests hypotheses about conference strength, Power 5 vs Group of 5, SEC dominance
"""

import pandas as pd
import numpy as np
from database_connection import get_db

def run_conference_analysis():
    """Analyze conference performance across multiple dimensions"""
    print("🏆 CONFERENCE PERFORMANCE ANALYSIS")
    print("=" * 60)
    
    db = get_db()
    
    # Get conference data with team information
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
        g.is_conference_game
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.completed = true 
      AND g.season >= 2015
      AND ht.conference IS NOT NULL 
      AND at.conference IS NOT NULL
    """
    
    df = db.execute_query(query)
    print(f"📊 Loaded {len(df)} games with conference data (2015-2024)")
    
    if len(df) == 0:
        print("❌ No conference data found")
        db.close()
        return
    
    # Define Power 5 conferences
    power5 = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'PAC-12', 'Pac-12']
    
    # Add Power 5 flags
    df['home_power5'] = df['home_conference'].isin(power5)
    df['away_power5'] = df['away_conference'].isin(power5)
    
    # Calculate point differentials
    df['point_differential'] = df['home_team_score'] - df['away_team_score']
    df['total_points'] = df['home_team_score'] + df['away_team_score']
    
    # Conference-by-conference analysis
    print(f"\n📈 Conference Scoring Averages (2015-2024):")
    print("-" * 50)
    
    conference_stats = {}
    for conf in df['home_conference'].unique():
        if pd.isna(conf):
            continue
            
        home_games = df[df['home_conference'] == conf]
        away_games = df[df['away_conference'] == conf]
        
        # Calculate conference performance
        home_avg = home_games['home_team_score'].mean()
        away_avg = away_games['away_team_score'].mean()
        overall_avg = (home_avg + away_avg) / 2
        
        home_allowed = home_games['away_team_score'].mean()
        away_allowed = away_games['home_team_score'].mean()
        defense_avg = (home_allowed + away_allowed) / 2
        
        total_games = len(home_games) + len(away_games)
        
        conference_stats[conf] = {
            'avg_points_scored': overall_avg,
            'avg_points_allowed': defense_avg,
            'point_differential': overall_avg - defense_avg,
            'total_games': total_games,
            'is_power5': conf in power5
        }
        
        print(f"{conf:15} | Scored: {overall_avg:.1f} | Allowed: {defense_avg:.1f} | Diff: {overall_avg - defense_avg:+.1f} | Games: {total_games}")
    
    # Power 5 vs Group of 5 Analysis
    print(f"\n🏆 Power 5 vs Group of 5 Analysis:")
    print("-" * 40)
    
    # All Power 5 vs Power 5 games
    p5_vs_p5 = df[(df['home_power5'] == True) & (df['away_power5'] == True)]
    p5_vs_g5_home = df[(df['home_power5'] == True) & (df['away_power5'] == False)]
    p5_vs_g5_away = df[(df['home_power5'] == False) & (df['away_power5'] == True)]
    g5_vs_g5 = df[(df['home_power5'] == False) & (df['away_power5'] == False)]
    
    print(f"Power 5 vs Power 5: {len(p5_vs_p5)} games | Avg total: {p5_vs_p5['total_points'].mean():.1f}")
    print(f"Group of 5 vs Group of 5: {len(g5_vs_g5)} games | Avg total: {g5_vs_g5['total_points'].mean():.1f}")
    
    # Power 5 vs Group of 5 head-to-head
    p5_home_wins = len(p5_vs_g5_home[p5_vs_g5_home['point_differential'] > 0])
    p5_away_wins = len(p5_vs_g5_away[p5_vs_g5_away['point_differential'] < 0])
    total_p5_wins = p5_home_wins + p5_away_wins
    total_p5_g5_games = len(p5_vs_g5_home) + len(p5_vs_g5_away)
    p5_win_rate = (total_p5_wins / total_p5_g5_games * 100) if total_p5_g5_games > 0 else 0
    
    print(f"\nPower 5 vs Group of 5 Head-to-Head:")
    print(f"  Total games: {total_p5_g5_games}")
    print(f"  Power 5 wins: {total_p5_wins} ({p5_win_rate:.1f}%)")
    print(f"  Group of 5 wins: {total_p5_g5_games - total_p5_wins} ({100 - p5_win_rate:.1f}%)")
    
    # SEC Dominance Analysis
    print(f"\n🐘 SEC Dominance Analysis:")
    print("-" * 30)
    
    sec_games = df[(df['home_conference'] == 'SEC') | (df['away_conference'] == 'SEC')]
    sec_vs_others = sec_games[~((df['home_conference'] == 'SEC') & (df['away_conference'] == 'SEC'))]
    
    # SEC vs other Power 5
    sec_vs_power5 = sec_vs_others[
        ((df['home_conference'] == 'SEC') & (df['away_conference'].isin(power5))) |
        ((df['away_conference'] == 'SEC') & (df['home_conference'].isin(power5)))
    ]
    
    sec_wins_vs_power5 = 0
    for _, game in sec_vs_power5.iterrows():
        if game['home_conference'] == 'SEC' and game['point_differential'] > 0:
            sec_wins_vs_power5 += 1
        elif game['away_conference'] == 'SEC' and game['point_differential'] < 0:
            sec_wins_vs_power5 += 1
    
    sec_power5_rate = (sec_wins_vs_power5 / len(sec_vs_power5) * 100) if len(sec_vs_power5) > 0 else 0
    
    print(f"SEC vs other Power 5: {len(sec_vs_power5)} games")
    print(f"SEC wins: {sec_wins_vs_power5} ({sec_power5_rate:.1f}%)")
    
    # Bowl game performance by conference
    print(f"\n🏈 Bowl/Playoff Performance (December/January):")
    print("-" * 45)
    
    bowl_games = df[df['week'].isin([14, 15, 16, 17])]  # Late season/bowl games
    
    bowl_performance = {}
    for conf in power5:
        conf_bowl_games = bowl_games[(bowl_games['home_conference'] == conf) | (bowl_games['away_conference'] == conf)]
        
        wins = 0
        total = 0
        for _, game in conf_bowl_games.iterrows():
            total += 1
            if game['home_conference'] == conf and game['point_differential'] > 0:
                wins += 1
            elif game['away_conference'] == conf and game['point_differential'] < 0:
                wins += 1
        
        if total > 0:
            bowl_performance[conf] = {
                'wins': wins,
                'total': total,
                'win_rate': wins / total * 100
            }
            print(f"{conf:10} | {wins:2d}-{total-wins:2d} | {wins/total*100:.1f}% | {total} games")
    
    db.close()
    print("\n✅ Conference analysis complete!")
    
    return conference_stats, bowl_performance

if __name__ == "__main__":
    run_conference_analysis()