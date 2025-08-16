#!/usr/bin/env python3
"""
Stadium Size vs Spread Coverage Analysis
Hypothesis: Larger home stadiums create louder environments that help teams cover spreads
Author: Rick's Picks Analytics Team
"""

import psycopg2
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from datetime import datetime
import os

# Stadium capacity data for major college football programs
STADIUM_CAPACITIES = {
    'Michigan': 107601,  # Michigan Stadium
    'Penn State': 106572,  # Beaver Stadium
    'Ohio State': 104944,  # Ohio Stadium
    'Alabama': 101821,  # Bryant-Denny Stadium
    'Texas': 100119,  # Darrell K Royal Stadium
    'Tennessee': 102455,  # Neyland Stadium
    'LSU': 102321,  # Tiger Stadium
    'Georgia': 92746,  # Sanford Stadium
    'Auburn': 87451,  # Jordan-Hare Stadium
    'Clemson': 81500,  # Memorial Stadium
    'Florida': 88548,  # Ben Hill Griffin Stadium
    'Notre Dame': 77622,  # Notre Dame Stadium
    'Texas A&M': 102733,  # Kyle Field
    'Oklahoma': 86112,  # Gaylord Family Oklahoma Memorial Stadium
    'Nebraska': 85458,  # Memorial Stadium
    'Wisconsin': 80321,  # Camp Randall Stadium
    'USC': 77500,  # Los Angeles Memorial Coliseum
    'UCLA': 67431,  # Rose Bowl
    'Washington': 70138,  # Husky Stadium
    'Oregon': 54000,  # Autzen Stadium
    'Miami': 65326,  # Hard Rock Stadium
    'Florida State': 79560,  # Doak Campbell Stadium
    'Virginia Tech': 66233,  # Lane Stadium
    'Iowa': 69250,  # Kinnick Stadium
    'Missouri': 71168,  # Faurot Field
    'South Carolina': 80250,  # Williams-Brice Stadium
    'Kentucky': 61000,  # Kroger Field
    'Arkansas': 76212,  # Donald W. Reynolds Razorback Stadium
    'Ole Miss': 64038,  # Vaught-Hemingway Stadium
    'Mississippi State': 61337,  # Davis Wade Stadium
    'Vanderbilt': 40550,  # FirstBank Stadium
    'Kansas': 50071,  # David Booth Kansas Memorial Stadium
    'Kansas State': 50000,  # Bill Snyder Family Stadium
    'Iowa State': 61500,  # Jack Trice Stadium
    'Oklahoma State': 60218,  # Boone Pickens Stadium
    'Texas Tech': 60454,  # Jones AT&T Stadium
    'TCU': 45000,  # Amon G. Carter Stadium
    'Baylor': 45140,  # McLane Stadium
    'West Virginia': 60000,  # Milan Puskar Stadium
    'Pittsburgh': 68400,  # Heinz Field
    'NC State': 57583,  # Carter-Finley Stadium
    'Wake Forest': 31500,  # Truist Field
    'Duke': 40004,  # Wallace Wade Stadium
    'North Carolina': 50500,  # Kenan Memorial Stadium
    'Georgia Tech': 55000,  # Bobby Dodd Stadium
    'Louisville': 65000,  # Cardinal Stadium
    'Syracuse': 49262,  # Carrier Dome
    'Boston College': 44500,  # Alumni Stadium
    'Stanford': 50424,  # Stanford Stadium
    'California': 63000,  # California Memorial Stadium
    'Arizona': 56037,  # Arizona Stadium
    'Arizona State': 53599,  # Sun Devil Stadium
    'Colorado': 50183,  # Folsom Field
    'Utah': 51444,  # Rice-Eccles Stadium
    'Washington State': 35117,  # Martin Stadium
    'Oregon State': 45674,  # Reser Stadium
    'Indiana': 52929,  # Memorial Stadium
    'Illinois': 60670,  # Memorial Stadium
    'Northwestern': 47130,  # Ryan Field
    'Minnesota': 50805,  # Huntington Bank Stadium
    'Purdue': 57236,  # Ross-Ade Stadium
    'Rutgers': 52454,  # SHI Stadium
    'Maryland': 51055,  # SECU Stadium
    'Michigan State': 75005,  # Spartan Stadium
}


def get_database_connection():
    """Get database connection using environment variables"""
    try:
        conn = psycopg2.connect(
            host=os.getenv('PGHOST'),
            port=os.getenv('PGPORT', 5432),
            database=os.getenv('PGDATABASE'),
            user=os.getenv('PGUSER'),
            password=os.getenv('PGPASSWORD')
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def analyze_stadium_size_correlation():
    """Analyze correlation between stadium size and spread coverage"""

    conn = get_database_connection()
    if not conn:
        return

    try:
        # Query for completed games with spreads and scores
        query = """
        SELECT 
            g.id,
            g.season,
            g.week,
            g.spread,
            g.home_team_score,
            g.away_team_score,
            ht.name as home_team_name,
            at.name as away_team_name,
            g.is_conference_game,
            g.is_rivalry_game
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
            AND g.spread IS NOT NULL
            AND g.home_team_score IS NOT NULL
            AND g.away_team_score IS NOT NULL
            AND g.season >= 2009
        ORDER BY g.season DESC, g.week DESC
        """

        df = pd.read_sql_query(query, conn)
        print(f"Loaded {len(df)} completed games with spreads from database")

        # Add stadium capacity data
        df['stadium_capacity'] = df['home_team_name'].map(STADIUM_CAPACITIES)

        # Filter to games where we have stadium data
        df = df.dropna(subset=['stadium_capacity'])
        print(f"Found stadium data for {len(df)} games")

        # Calculate actual spread and whether home team covered
        df['actual_spread'] = df['home_team_score'] - df['away_team_score']
        df['home_covered'] = df['actual_spread'] > df['spread']

        # Categorize stadium sizes
        df['stadium_size_category'] = pd.cut(
            df['stadium_capacity'],
            bins=[0, 50000, 70000, 90000, float('inf')],
            labels=['Small (<50k)', 'Medium (50-70k)', 'Large (70-90k)', 'Massive (90k+)']
        )

        # Analysis by stadium size
        coverage_by_size = df.groupby('stadium_size_category').agg({
            'home_covered': ['count', 'sum', 'mean'],
            'stadium_capacity': 'mean',
            'actual_spread': 'mean',
            'spread': 'mean'
        }).round(3)

        coverage_by_size.columns = ['Games', 'Covers', 'Cover_Rate', 'Avg_Capacity', 'Avg_Actual_Spread',
                                    'Avg_Vegas_Spread']

        print("\n" + "=" * 60)
        print("STADIUM SIZE vs SPREAD COVERAGE ANALYSIS")
        print("=" * 60)
        print(coverage_by_size)

        # Statistical significance test
        massive_stadiums = df[df['stadium_capacity'] >= 90000]['home_covered']
        small_stadiums = df[df['stadium_capacity'] < 50000]['home_covered']

        if len(massive_stadiums) > 0 and len(small_stadiums) > 0:
            stat, p_value = stats.chi2_contingency([
                [massive_stadiums.sum(), len(massive_stadiums) - massive_stadiums.sum()],
                [small_stadiums.sum(), len(small_stadiums) - small_stadiums.sum()]
            ])[:2]

            print(f"\nStatistical Test (Massive vs Small Stadiums):")
            print(f"Massive stadiums (90k+): {massive_stadiums.mean():.1%} cover rate ({len(massive_stadiums)} games)")
            print(f"Small stadiums (<50k): {small_stadiums.mean():.1%} cover rate ({len(small_stadiums)} games)")
            print(f"P-value: {p_value:.4f}")
            print(f"Statistically significant: {'YES' if p_value < 0.05 else 'NO'}")

        # Correlation analysis
        correlation = df['stadium_capacity'].corr(df['home_covered'])
        print(f"\nCorrelation between stadium capacity and covering spread: {correlation:.4f}")

        # Conference game vs non-conference analysis
        print(f"\n" + "=" * 40)
        print("CONFERENCE vs NON-CONFERENCE GAMES")
        print("=" * 40)

        conf_analysis = df.groupby(['stadium_size_category', 'is_conference_game']).agg({
            'home_covered': ['count', 'mean']
        }).round(3)
        conf_analysis.columns = ['Games', 'Cover_Rate']
        print(conf_analysis)

        # Rivalry game analysis
        print(f"\n" + "=" * 40)
        print("RIVALRY GAME ANALYSIS")
        print("=" * 40)

        rivalry_analysis = df.groupby(['stadium_size_category', 'is_rivalry_game']).agg({
            'home_covered': ['count', 'mean']
        }).round(3)
        rivalry_analysis.columns = ['Games', 'Cover_Rate']
        print(rivalry_analysis)

        # Top performing stadiums
        print(f"\n" + "=" * 40)
        print("TOP PERFORMING HOME STADIUMS (min 50 games)")
        print("=" * 40)

        stadium_performance = df.groupby('home_team_name').agg({
            'home_covered': ['count', 'sum', 'mean'],
            'stadium_capacity': 'first'
        }).round(3)
        stadium_performance.columns = ['Games', 'Covers', 'Cover_Rate', 'Capacity']
        stadium_performance = stadium_performance[stadium_performance['Games'] >= 50]
        stadium_performance = stadium_performance.sort_values('Cover_Rate', ascending=False)

        print(stadium_performance.head(15))

        # Generate algorithmic factor
        massive_cover_rate = df[df['stadium_capacity'] >= 90000]['home_covered'].mean()
        large_cover_rate = df[(df['stadium_capacity'] >= 70000) & (df['stadium_capacity'] < 90000)][
            'home_covered'].mean()
        medium_cover_rate = df[(df['stadium_capacity'] >= 50000) & (df['stadium_capacity'] < 70000)][
            'home_covered'].mean()
        small_cover_rate = df[df['stadium_capacity'] < 50000]['home_covered'].mean()

        baseline_cover_rate = 0.5  # Expected 50% for fair lines

        print(f"\n" + "=" * 50)
        print("RECOMMENDED ALGORITHMIC ADJUSTMENTS")
        print("=" * 50)
        print(
            f"Massive stadiums (90k+): {(massive_cover_rate - baseline_cover_rate) * 100:+.1f}% advantage = +{(massive_cover_rate - baseline_cover_rate) * 6:.1f} points")
        print(
            f"Large stadiums (70-90k): {(large_cover_rate - baseline_cover_rate) * 100:+.1f}% advantage = +{(large_cover_rate - baseline_cover_rate) * 6:.1f} points")
        print(
            f"Medium stadiums (50-70k): {(medium_cover_rate - baseline_cover_rate) * 100:+.1f}% advantage = +{(medium_cover_rate - baseline_cover_rate) * 6:.1f} points")
        print(
            f"Small stadiums (<50k): {(small_cover_rate - baseline_cover_rate) * 100:+.1f}% advantage = +{(small_cover_rate - baseline_cover_rate) * 6:.1f} points")

        # Export results for integration
        results = {
            'massive_stadiums_adjustment': (massive_cover_rate - baseline_cover_rate) * 6,
            'large_stadiums_adjustment': (large_cover_rate - baseline_cover_rate) * 6,
            'medium_stadiums_adjustment': (medium_cover_rate - baseline_cover_rate) * 6,
            'small_stadiums_adjustment': (small_cover_rate - baseline_cover_rate) * 6,
            'correlation': correlation,
            'p_value': p_value if 'p_value' in locals() else None,
            'total_games_analyzed': len(df)
        }

        print(f"\nAnalysis complete! Analyzed {len(df)} games across {len(df['home_team_name'].unique())} home teams.")
        print(f"Stadium capacity data available for {len(df['home_team_name'].unique())} teams.")

        return results

    except Exception as e:
        print(f"Analysis error: {e}")
        return None
    finally:
        conn.close()


if __name__ == "__main__":
    print("Starting Stadium Size vs Spread Coverage Analysis...")
    print("=" * 60)

    results = analyze_stadium_size_correlation()

    if results:
        print(f"\n" + "=" * 60)
        print("ANALYSIS SUMMARY FOR ALGORITHM INTEGRATION")
        print("=" * 60)
        print("Suggested stadium size adjustments for prediction algorithm:")
        for key, value in results.items():
            if 'adjustment' in key:
                stadium_type = key.replace('_adjustment', '').replace('_', ' ').title()
                print(f"{stadium_type}: {value:+.2f} points")

        print(f"\nStatistical strength: {'Strong' if abs(results.get('correlation', 0)) > 0.1 else 'Moderate'}")
        print(
            f"Recommended implementation: {'Immediate' if results.get('p_value', 1) < 0.05 else 'Consider with other factors'}")