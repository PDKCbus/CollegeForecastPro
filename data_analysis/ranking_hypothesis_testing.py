"""
Ranking Hypothesis Testing
Tests performance of ranked vs unranked teams against the spread
"""

import pandas as pd
import numpy as np
import psycopg2
from scipy import stats
import os

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('PGHOST', 'localhost'),
        database=os.getenv('PGDATABASE', 'postgres'),
        user=os.getenv('PGUSER', 'postgres'),
        password=os.getenv('PGPASSWORD', ''),
        port=os.getenv('PGPORT', 5432)
    )

def load_games_data():
    """Load games with team rankings and betting data"""
    conn = get_db_connection()
    
    query = """
    SELECT 
        g.*,
        ht.name as home_team_name,
        ht.rank as home_current_rank,
        at.name as away_team_name, 
        at.rank as away_current_rank,
        -- Calculate spread coverage
        CASE 
            WHEN g.completed = true AND g.spread IS NOT NULL THEN
                CASE 
                    WHEN (g.home_team_score - g.away_team_score) > g.spread THEN 'HOME_COVER'
                    WHEN (g.home_team_score - g.away_team_score) < g.spread THEN 'AWAY_COVER'
                    ELSE 'PUSH'
                END
            ELSE NULL
        END as spread_result,
        (g.home_team_score - g.away_team_score) - g.spread as spread_margin
    FROM games g
    JOIN teams ht ON g.home_team_id = ht.id
    JOIN teams at ON g.away_team_id = at.id
    WHERE g.completed = true 
        AND g.spread IS NOT NULL
        AND g.home_team_score IS NOT NULL 
        AND g.away_team_score IS NOT NULL
    ORDER BY g.start_date DESC
    """
    
    df = pd.read_sql(query, conn)
    conn.close()
    
    print(f"📊 Loaded {len(df)} completed games with spreads")
    return df

def analyze_ranked_vs_unranked(df):
    """Analyze ranked vs unranked team performance"""
    print("\n🏆 RANKED VS UNRANKED ANALYSIS")
    print("=" * 50)
    
    # Categorize games
    df['home_ranked'] = df['home_current_rank'].notna() & (df['home_current_rank'] <= 25)
    df['away_ranked'] = df['away_current_rank'].notna() & (df['away_current_rank'] <= 25)
    
    # Game categories
    ranked_vs_unranked_home = df[df['home_ranked'] & ~df['away_ranked']]
    ranked_vs_unranked_away = df[~df['home_ranked'] & df['away_ranked']]
    ranked_vs_ranked = df[df['home_ranked'] & df['away_ranked']]
    unranked_vs_unranked = df[~df['home_ranked'] & ~df['away_ranked']]
    
    results = {}
    
    # Ranked home vs unranked away
    if len(ranked_vs_unranked_home) > 0:
        home_covers = (ranked_vs_unranked_home['spread_result'] == 'HOME_COVER').sum()
        total_games = len(ranked_vs_unranked_home)
        cover_rate = home_covers / total_games * 100
        avg_margin = ranked_vs_unranked_home['spread_margin'].mean()
        
        results['ranked_home_vs_unranked'] = {
            'games': total_games,
            'covers': home_covers,
            'cover_rate': cover_rate,
            'avg_margin': avg_margin
        }
        
        print(f"📈 Ranked Home vs Unranked Away:")
        print(f"   Games: {total_games}")
        print(f"   Home Covers: {home_covers} ({cover_rate:.1f}%)")
        print(f"   Average Margin vs Spread: {avg_margin:+.1f}")
    
    # Ranked away vs unranked home  
    if len(ranked_vs_unranked_away) > 0:
        away_covers = (ranked_vs_unranked_away['spread_result'] == 'AWAY_COVER').sum()
        total_games = len(ranked_vs_unranked_away)
        cover_rate = away_covers / total_games * 100
        avg_margin = -ranked_vs_unranked_away['spread_margin'].mean()  # Flip for away perspective
        
        results['ranked_away_vs_unranked'] = {
            'games': total_games,
            'covers': away_covers,
            'cover_rate': cover_rate,
            'avg_margin': avg_margin
        }
        
        print(f"📈 Ranked Away vs Unranked Home:")
        print(f"   Games: {total_games}")
        print(f"   Away Covers: {away_covers} ({cover_rate:.1f}%)")
        print(f"   Average Margin vs Spread: {avg_margin:+.1f}")
    
    # Ranked vs ranked
    if len(ranked_vs_ranked) > 0:
        total_games = len(ranked_vs_ranked)
        home_covers = (ranked_vs_ranked['spread_result'] == 'HOME_COVER').sum()
        away_covers = (ranked_vs_ranked['spread_result'] == 'AWAY_COVER').sum()
        pushes = (ranked_vs_ranked['spread_result'] == 'PUSH').sum()
        
        results['ranked_vs_ranked'] = {
            'games': total_games,
            'home_covers': home_covers,
            'away_covers': away_covers,
            'pushes': pushes,
            'home_cover_rate': home_covers / (total_games - pushes) * 100 if total_games > pushes else 0
        }
        
        print(f"📈 Ranked vs Ranked:")
        print(f"   Games: {total_games}")
        print(f"   Home Covers: {home_covers} ({home_covers/(total_games-pushes)*100:.1f}%)")
        print(f"   Away Covers: {away_covers} ({away_covers/(total_games-pushes)*100:.1f}%)")
        print(f"   Pushes: {pushes}")
    
    return results

def analyze_ranking_tiers(df):
    """Analyze performance by ranking tiers (Top 5, 6-15, 16-25)"""
    print("\n🎯 RANKING TIER ANALYSIS")
    print("=" * 50)
    
    # Add ranking tiers
    def get_tier(rank):
        if pd.isna(rank) or rank > 25:
            return 'Unranked'
        elif rank <= 5:
            return 'Top 5'
        elif rank <= 15:
            return 'Top 15'
        else:
            return 'Top 25'
    
    df['home_tier'] = df['home_current_rank'].apply(get_tier)
    df['away_tier'] = df['away_current_rank'].apply(get_tier)
    
    tiers = ['Top 5', 'Top 15', 'Top 25', 'Unranked']
    
    for home_tier in tiers:
        for away_tier in tiers:
            if home_tier == away_tier and home_tier == 'Unranked':
                continue  # Skip unranked vs unranked
                
            games = df[(df['home_tier'] == home_tier) & (df['away_tier'] == away_tier)]
            
            if len(games) >= 10:  # Only analyze matchups with sufficient data
                home_covers = (games['spread_result'] == 'HOME_COVER').sum()
                total_non_push = len(games) - (games['spread_result'] == 'PUSH').sum()
                
                if total_non_push > 0:
                    cover_rate = home_covers / total_non_push * 100
                    avg_margin = games['spread_margin'].mean()
                    
                    print(f"📊 {home_tier} Home vs {away_tier} Away:")
                    print(f"   Games: {len(games)}")
                    print(f"   Home Cover Rate: {cover_rate:.1f}%")
                    print(f"   Average Margin: {avg_margin:+.1f}")
                    print()

def analyze_elo_data_quality(df):
    """Analyze ELO data availability and quality"""
    print("\n🔍 ELO DATA QUALITY ANALYSIS")
    print("=" * 50)
    
    # Check ELO data availability
    games_with_home_elo = df['home_pregame_elo'].notna().sum()
    games_with_away_elo = df['away_pregame_elo'].notna().sum()
    games_with_both_elo = (df['home_pregame_elo'].notna() & df['away_pregame_elo'].notna()).sum()
    games_with_partial_elo = ((df['home_pregame_elo'].notna() & df['away_pregame_elo'].isna()) | 
                             (df['home_pregame_elo'].isna() & df['away_pregame_elo'].notna())).sum()
    
    total_games = len(df)
    
    print(f"📈 ELO Data Coverage:")
    print(f"   Total Games: {total_games}")
    print(f"   Games with Home ELO: {games_with_home_elo} ({games_with_home_elo/total_games*100:.1f}%)")
    print(f"   Games with Away ELO: {games_with_away_elo} ({games_with_away_elo/total_games*100:.1f}%)")
    print(f"   Games with Both ELO: {games_with_both_elo} ({games_with_both_elo/total_games*100:.1f}%)")
    print(f"   Games with Partial ELO: {games_with_partial_elo} ({games_with_partial_elo/total_games*100:.1f}%)")
    
    if games_with_partial_elo > 0:
        print(f"\n⚠️  WARNING: {games_with_partial_elo} games have ELO for only one team!")
        print("   This could lead to incorrect predictions if not handled properly.")
    
    # Analyze ELO by season to identify coverage years
    elo_by_season = df.groupby('season').agg({
        'home_pregame_elo': lambda x: x.notna().sum(),
        'away_pregame_elo': lambda x: x.notna().sum(),
        'season': 'count'
    }).rename(columns={'season': 'total_games'})
    
    # Calculate both ELO rate by season
    both_elo_by_season = df.groupby('season').apply(
        lambda x: ((x['home_pregame_elo'].notna() & x['away_pregame_elo'].notna()).sum() / len(x) * 100)
    )
    elo_by_season['both_elo_rate'] = both_elo_by_season
    
    print(f"\n📅 ELO Coverage by Season:")
    for season, row in elo_by_season.iterrows():
        if row['total_games'] > 0:
            print(f"   {season}: {row['both_elo_rate']:.1f}% coverage ({row['total_games']} games)")

def main():
    """Run all ranking hypothesis tests"""
    print("🏈 RANKING HYPOTHESIS TESTING")
    print("Testing ranked vs unranked team performance against spreads")
    print("=" * 60)
    
    # Load data
    df = load_games_data()
    
    # Run analyses
    analyze_elo_data_quality(df)
    analyze_ranked_vs_unranked(df)
    analyze_ranking_tiers(df)
    
    print("\n✅ Ranking hypothesis testing complete!")

if __name__ == "__main__":
    main()