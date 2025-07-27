"""
ELO Rating and Team Performance Analysis
Comprehensive Python analytics for college football team performance metrics
"""

import pandas as pd
import numpy as np
import psycopg2
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import os
from scipy import stats
from statsmodels.regression import linear_model
import warnings
warnings.filterwarnings('ignore')

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

class ELOTeamPerformanceAnalyzer:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.games_df = None
        self.teams_df = None
        self.elo_history = {}
        
    def load_data(self):
        """Load games and teams data from PostgreSQL database"""
        print("📊 Loading college football data from PostgreSQL...")
        
        # Load games with team information
        games_query = """
        SELECT 
            g.id, g.home_team_id, g.away_team_id,
            g.home_team_score, g.away_team_score,
            g.start_date, g.season, g.week, g.completed,
            g.spread, g.over_under,
            ht.name as home_team, ht.conference as home_conference,
            at.name as away_team, at.conference as away_conference,
            ht.elo_rating as home_elo, at.elo_rating as away_elo
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
        AND g.home_team_score IS NOT NULL 
        AND g.away_team_score IS NOT NULL
        ORDER BY g.start_date
        """
        
        self.games_df = pd.read_sql(games_query, self.conn)
        print(f"✅ Loaded {len(self.games_df)} completed games")
        
        # Load teams data
        teams_query = """
        SELECT 
            id, name, conference, 
            elo_rating, elo_change, momentum_score,
            wins, losses, win_streak, loss_streak,
            points_per_game, points_allowed_per_game,
            total_yards_per_game, yards_allowed_per_game,
            recruiting_class_rank, recruiting_avg_rating
        FROM teams
        """
        
        self.teams_df = pd.read_sql(teams_query, self.conn)
        print(f"✅ Loaded {len(self.teams_df)} teams")
        
    def calculate_historical_elo(self, k_factor=32):
        """Calculate ELO ratings for all historical games"""
        print(f"🧮 Calculating historical ELO ratings (K-factor: {k_factor})...")
        
        # Initialize ELO ratings
        team_elos = {}
        for _, team in self.teams_df.iterrows():
            # Power 5 teams start at 1550, others at 1500
            power5_conferences = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12']
            initial_elo = 1550 if team['conference'] in power5_conferences else 1500
            team_elos[team['id']] = initial_elo
            
        self.elo_history = {team_id: [elo] for team_id, elo in team_elos.items()}
        
        # Process games chronologically
        for _, game in self.games_df.iterrows():
            home_id = game['home_team_id']
            away_id = game['away_team_id']
            home_score = game['home_team_score']
            away_score = game['away_team_score']
            
            # Get current ELO ratings
            home_elo = team_elos[home_id]
            away_elo = team_elos[away_id]
            
            # Home field advantage
            adjusted_home_elo = home_elo + 65
            
            # Calculate expected scores
            home_expected = 1 / (1 + 10**((away_elo - adjusted_home_elo) / 400))
            away_expected = 1 - home_expected
            
            # Actual results
            if home_score > away_score:
                home_actual, away_actual = 1, 0
            elif away_score > home_score:
                home_actual, away_actual = 0, 1
            else:
                home_actual, away_actual = 0.5, 0.5
                
            # Margin of victory multiplier
            margin = abs(home_score - away_score)
            mov_multiplier = np.log(max(margin, 1)) + 1
            
            # Update ELO ratings
            home_change = k_factor * mov_multiplier * (home_actual - home_expected)
            away_change = k_factor * mov_multiplier * (away_actual - away_expected)
            
            team_elos[home_id] += home_change
            team_elos[away_id] += away_change
            
            # Store history
            self.elo_history[home_id].append(team_elos[home_id])
            self.elo_history[away_id].append(team_elos[away_id])
            
        print(f"✅ ELO calculation complete for {len(self.games_df)} games")
        return team_elos
        
    def analyze_elo_predictive_power(self, final_elos):
        """Analyze how well ELO ratings predict game outcomes"""
        print("🎯 Analyzing ELO predictive power...")
        
        correct_predictions = 0
        total_games = 0
        spread_covers = 0
        elo_spreads = []
        actual_spreads = []
        
        # Re-simulate games with final ELO ratings
        for _, game in self.games_df.iterrows():
            home_id = game['home_team_id']
            away_id = game['away_team_id']
            home_score = game['home_team_score']
            away_score = game['away_team_score']
            
            home_elo = final_elos[home_id]
            away_elo = final_elos[away_id]
            
            # ELO prediction (with home field advantage)
            elo_diff = (home_elo + 65) - away_elo
            predicted_spread = elo_diff / 25  # ~25 ELO points = 1 point spread
            
            # Actual result
            actual_spread = home_score - away_score
            
            # Check winner prediction
            predicted_home_win = predicted_spread > 0
            actual_home_win = actual_spread > 0
            
            if predicted_home_win == actual_home_win:
                correct_predictions += 1
                
            # Check spread coverage (if betting line exists)
            if pd.notna(game['spread']):
                vegas_spread = game['spread']
                elo_spread_diff = abs(predicted_spread - vegas_spread)
                elo_spreads.append(predicted_spread)
                actual_spreads.append(actual_spread)
                
            total_games += 1
            
        accuracy = correct_predictions / total_games * 100
        print(f"✅ ELO Winner Prediction Accuracy: {accuracy:.1f}% ({correct_predictions}/{total_games})")
        
        return {
            'accuracy': accuracy,
            'correct_predictions': correct_predictions,
            'total_games': total_games,
            'elo_spreads': elo_spreads,
            'actual_spreads': actual_spreads
        }
        
    def analyze_conference_performance(self):
        """Analyze performance by conference"""
        print("🏆 Analyzing conference performance...")
        
        # Add conference info to games
        conference_stats = {}
        
        for _, game in self.games_df.iterrows():
            home_conf = game['home_conference']
            away_conf = game['away_conference']
            home_score = game['home_team_score']
            away_score = game['away_team_score']
            
            # Initialize conferences
            for conf in [home_conf, away_conf]:
                if conf not in conference_stats:
                    conference_stats[conf] = {
                        'games': 0, 'wins': 0, 'losses': 0, 'ties': 0,
                        'points_for': 0, 'points_against': 0,
                        'cross_conference_wins': 0, 'cross_conference_games': 0
                    }
            
            # Record game stats
            conference_stats[home_conf]['games'] += 1
            conference_stats[away_conf]['games'] += 1
            conference_stats[home_conf]['points_for'] += home_score
            conference_stats[home_conf]['points_against'] += away_score
            conference_stats[away_conf]['points_for'] += away_score
            conference_stats[away_conf]['points_against'] += home_score
            
            # Determine winner
            if home_score > away_score:
                conference_stats[home_conf]['wins'] += 1
                conference_stats[away_conf]['losses'] += 1
                if home_conf != away_conf:
                    conference_stats[home_conf]['cross_conference_wins'] += 1
            elif away_score > home_score:
                conference_stats[away_conf]['wins'] += 1
                conference_stats[home_conf]['losses'] += 1
                if home_conf != away_conf:
                    conference_stats[away_conf]['cross_conference_wins'] += 1
            else:
                conference_stats[home_conf]['ties'] += 1
                conference_stats[away_conf]['ties'] += 1
                
            # Track cross-conference games
            if home_conf != away_conf:
                conference_stats[home_conf]['cross_conference_games'] += 1
                conference_stats[away_conf]['cross_conference_games'] += 1
        
        # Calculate derived stats
        conference_df = []
        for conf, stats in conference_stats.items():
            if stats['games'] > 10:  # Only conferences with significant games
                win_pct = stats['wins'] / stats['games'] * 100
                avg_points_for = stats['points_for'] / stats['games']
                avg_points_against = stats['points_against'] / stats['games']
                cross_conf_win_pct = (stats['cross_conference_wins'] / 
                                    max(stats['cross_conference_games'], 1) * 100)
                
                conference_df.append({
                    'conference': conf,
                    'games': stats['games'],
                    'win_percentage': win_pct,
                    'avg_points_for': avg_points_for,
                    'avg_points_against': avg_points_against,
                    'point_differential': avg_points_for - avg_points_against,
                    'cross_conference_win_pct': cross_conf_win_pct
                })
        
        conference_df = pd.DataFrame(conference_df).sort_values('win_percentage', ascending=False)
        print("✅ Conference analysis complete")
        print("\nTop Conferences by Win Percentage:")
        print(conference_df[['conference', 'win_percentage', 'point_differential']].head(10))
        
        return conference_df
        
    def analyze_recruiting_impact(self):
        """Analyze correlation between recruiting and performance"""
        print("🎓 Analyzing recruiting class impact...")
        
        # Filter teams with recruiting data
        recruiting_teams = self.teams_df[
            (self.teams_df['recruiting_class_rank'].notna()) & 
            (self.teams_df['recruiting_avg_rating'].notna())
        ].copy()
        
        if len(recruiting_teams) == 0:
            print("⚠️ No recruiting data available")
            return None
            
        # Calculate performance metrics
        recruiting_teams['win_percentage'] = (
            recruiting_teams['wins'] / 
            (recruiting_teams['wins'] + recruiting_teams['losses'])
        )
        
        # Correlations
        correlations = {}
        correlations['class_rank_vs_wins'] = stats.pearsonr(
            recruiting_teams['recruiting_class_rank'], 
            recruiting_teams['win_percentage']
        )[0]
        correlations['avg_rating_vs_wins'] = stats.pearsonr(
            recruiting_teams['recruiting_avg_rating'], 
            recruiting_teams['win_percentage']
        )[0]
        correlations['class_rank_vs_elo'] = stats.pearsonr(
            recruiting_teams['recruiting_class_rank'], 
            recruiting_teams['elo_rating']
        )[0]
        
        print("✅ Recruiting correlation analysis:")
        print(f"   Class Rank vs Win %: {correlations['class_rank_vs_wins']:.3f}")
        print(f"   Avg Rating vs Win %: {correlations['avg_rating_vs_wins']:.3f}")
        print(f"   Class Rank vs ELO: {correlations['class_rank_vs_elo']:.3f}")
        
        return correlations
        
    def run_comprehensive_analysis(self):
        """Run all analytics and generate summary report"""
        print("🚀 Running Comprehensive ELO & Team Performance Analysis")
        print("=" * 60)
        
        # Load data
        self.load_data()
        
        # Calculate ELO ratings
        final_elos = self.calculate_historical_elo()
        
        # Analyze predictive power
        elo_results = self.analyze_elo_predictive_power(final_elos)
        
        # Conference analysis
        conference_results = self.analyze_conference_performance()
        
        # Recruiting analysis
        recruiting_results = self.analyze_recruiting_impact()
        
        # Generate summary report
        print("\n" + "=" * 60)
        print("📈 COMPREHENSIVE ANALYSIS SUMMARY")
        print("=" * 60)
        
        print(f"Dataset: {len(self.games_df)} completed games, {len(self.teams_df)} teams")
        print(f"ELO Accuracy: {elo_results['accuracy']:.1f}% winner prediction")
        print(f"Top Conference: {conference_results.iloc[0]['conference']} "
              f"({conference_results.iloc[0]['win_percentage']:.1f}% win rate)")
        
        if recruiting_results:
            print(f"Recruiting Impact: {recruiting_results['avg_rating_vs_wins']:.3f} correlation "
                  f"between recruit rating and wins")
        
        # Top ELO teams
        top_elos = sorted(final_elos.items(), key=lambda x: x[1], reverse=True)[:10]
        print("\nTop 10 ELO Ratings:")
        for i, (team_id, elo) in enumerate(top_elos, 1):
            team_name = self.teams_df[self.teams_df['id'] == team_id]['name'].iloc[0]
            print(f"   {i:2d}. {team_name}: {elo:.0f}")
        
        print("\n✅ Analysis complete! Results ready for Rick's Picks integration.")
        
        return {
            'elo_results': elo_results,
            'conference_results': conference_results,
            'recruiting_results': recruiting_results,
            'final_elos': final_elos
        }

def main():
    """Run the comprehensive analysis"""
    analyzer = ELOTeamPerformanceAnalyzer()
    results = analyzer.run_comprehensive_analysis()
    return results

if __name__ == "__main__":
    main()