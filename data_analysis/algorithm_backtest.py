#!/usr/bin/env python3
"""
Algorithm Backtesting and Validation
Test our prediction algorithm against historical game outcomes
"""

import pandas as pd
import numpy as np
from database_connection import get_db
from prediction_algorithm import RicksPicksPredictionEngine
import warnings
warnings.filterwarnings('ignore')

class AlgorithmBacktester:
    """
    Validate our prediction algorithm against historical game outcomes
    """
    
    def __init__(self):
        self.db = get_db()
        self.prediction_engine = RicksPicksPredictionEngine()
        
    def load_historical_games_for_testing(self, seasons=['2022', '2023'], sample_size=500):
        """
        Load historical games with complete data for backtesting
        Use recent seasons to avoid overfitting to older data patterns
        """
        print(f"📊 Loading historical games for backtesting...")
        
        query = """
        SELECT 
            g.id, g.season, g.week, g.start_date,
            g.home_team_score, g.away_team_score,
            g.spread, g.over_under,
            g.temperature, g.wind_speed, g.humidity, g.precipitation,
            g.weather_condition, g.is_dome,
            ht.name as home_team, ht.conference as home_conf,
            ht.rank as home_rank, ht.elo_rating as home_elo,
            at.name as away_team, at.conference as away_conf,
            at.rank as away_rank, at.elo_rating as away_elo
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
          AND g.home_team_score IS NOT NULL 
          AND g.away_team_score IS NOT NULL
          AND g.spread IS NOT NULL
          AND g.season::text = ANY(%s)
        ORDER BY g.start_date DESC
        LIMIT %s
        """
        
        df = self.db.execute_query(query, [seasons, sample_size])
        print(f"✅ Loaded {len(df)} completed games from {seasons}")
        return df
        
    def run_algorithm_on_historical_game(self, game_row):
        """
        Run our prediction algorithm on a historical game
        Returns our predicted spread and confidence
        """
        # Extract game data
        home_team = game_row['home_team']
        away_team = game_row['away_team']
        home_conf = game_row['home_conf']
        away_conf = game_row['away_conf']
        vegas_spread = game_row['spread']
        
        # Weather data
        temperature = game_row['temperature'] if pd.notna(game_row['temperature']) else None
        wind_speed = game_row['wind_speed'] if pd.notna(game_row['wind_speed']) else None
        is_dome = game_row['is_dome'] or False
        precipitation = game_row['precipitation'] if pd.notna(game_row['precipitation']) else None
        
        # Calculate individual factors using our algorithm
        weather_factor = self.prediction_engine.calculate_weather_factor(
            temperature, wind_speed, is_dome, precipitation
        )
        
        conference_factor = self.prediction_engine.calculate_conference_factor(
            home_conf, away_conf
        )
        
        # Home field advantage (our analysis shows declining, ~3 points)
        home_field_score = 3.0
        
        # Calculate our predicted spread (home team perspective)
        our_spread = (
            home_field_score + 
            conference_factor['score'] + 
            weather_factor['score']
        )
        
        # Determine confidence based on factor strength
        total_factor_strength = abs(conference_factor['score']) + abs(weather_factor['score'])
        if total_factor_strength > 4:
            confidence = "High"
        elif total_factor_strength > 2:
            confidence = "Medium"  
        else:
            confidence = "Low"
            
        return {
            'our_spread': our_spread,
            'confidence': confidence,
            'weather_score': weather_factor['score'],
            'conference_score': conference_factor['score'],
            'home_field_score': home_field_score
        }
        
    def evaluate_predictions(self, df_with_predictions):
        """
        Evaluate how well our predictions performed
        """
        print("\n🎯 ALGORITHM PERFORMANCE EVALUATION")
        print("=" * 60)
        
        total_games = len(df_with_predictions)
        
        # 1. Spread Prediction Accuracy
        print(f"\n📊 Spread Prediction Analysis ({total_games} games):")
        print("-" * 45)
        
        # Calculate actual point differential (home team perspective)
        df_with_predictions['actual_differential'] = (
            df_with_predictions['home_team_score'] - df_with_predictions['away_team_score']
        )
        
        # Calculate prediction errors
        df_with_predictions['our_error'] = abs(
            df_with_predictions['our_spread'] - df_with_predictions['actual_differential']
        )
        df_with_predictions['vegas_error'] = abs(
            -df_with_predictions['spread'] - df_with_predictions['actual_differential']  # Vegas spread from home perspective
        )
        
        our_avg_error = df_with_predictions['our_error'].mean()
        vegas_avg_error = df_with_predictions['vegas_error'].mean()
        
        print(f"Our Average Error: {our_avg_error:.2f} points")
        print(f"Vegas Average Error: {vegas_avg_error:.2f} points")
        print(f"Performance vs Vegas: {((vegas_avg_error - our_avg_error) / vegas_avg_error * 100):+.1f}%")
        
        # 2. Against The Spread (ATS) Performance
        print(f"\n🏈 Against The Spread Performance:")
        print("-" * 40)
        
        # Our ATS picks (take home team if our spread > vegas spread)
        df_with_predictions['our_ats_pick'] = np.where(
            df_with_predictions['our_spread'] > -df_with_predictions['spread'], 
            'home', 'away'
        )
        
        # ATS results
        df_with_predictions['ats_cover'] = (
            df_with_predictions['actual_differential'] + df_with_predictions['spread']
        ) > 0
        
        df_with_predictions['our_ats_correct'] = np.where(
            df_with_predictions['our_ats_pick'] == 'home',
            df_with_predictions['ats_cover'],
            ~df_with_predictions['ats_cover']
        )
        
        our_ats_wins = df_with_predictions['our_ats_correct'].sum()
        our_ats_pct = (our_ats_wins / total_games) * 100
        
        print(f"Our ATS Record: {our_ats_wins}-{total_games - our_ats_wins} ({our_ats_pct:.1f}%)")
        print(f"Break-even needed: 52.4% (accounting for juice)")
        print(f"Performance: {'✅ PROFITABLE' if our_ats_pct > 52.4 else '❌ UNPROFITABLE'}")
        
        # 3. Confidence Level Analysis
        print(f"\n🎯 Performance by Confidence Level:")
        print("-" * 40)
        
        for confidence in ['High', 'Medium', 'Low']:
            conf_games = df_with_predictions[df_with_predictions['confidence'] == confidence]
            if len(conf_games) > 0:
                conf_correct = conf_games['our_ats_correct'].sum()
                conf_pct = (conf_correct / len(conf_games)) * 100
                print(f"{confidence:6} Confidence: {conf_correct:2d}/{len(conf_games):2d} ({conf_pct:5.1f}%)")
        
        # 4. Factor Analysis
        print(f"\n⚡ Key Factor Performance:")
        print("-" * 30)
        
        # Weather factor games
        weather_games = df_with_predictions[abs(df_with_predictions['weather_score']) > 1]
        if len(weather_games) > 0:
            weather_correct = weather_games['our_ats_correct'].sum()
            weather_pct = (weather_correct / len(weather_games)) * 100
            print(f"Weather Factor Games: {weather_correct}/{len(weather_games)} ({weather_pct:.1f}%)")
        
        # Conference mismatch games
        conf_games = df_with_predictions[abs(df_with_predictions['conference_score']) > 1]
        if len(conf_games) > 0:
            conf_correct = conf_games['our_ats_correct'].sum()
            conf_pct = (conf_correct / len(conf_games)) * 100
            print(f"Conference Edge Games: {conf_correct}/{len(conf_games)} ({conf_pct:.1f}%)")
            
        return {
            'total_games': total_games,
            'our_ats_record': f"{our_ats_wins}-{total_games - our_ats_wins}",
            'our_ats_percentage': our_ats_pct,
            'average_error': our_avg_error,
            'vegas_error': vegas_avg_error,
            'vs_vegas': ((vegas_avg_error - our_avg_error) / vegas_avg_error * 100)
        }
        
    def run_full_backtest(self):
        """
        Run complete backtesting analysis
        """
        print("🧪 RICK'S PICKS ALGORITHM BACKTESTING")
        print("=" * 50)
        print("Testing our prediction algorithm against historical outcomes...")
        
        # Load test data
        df = self.load_historical_games_for_testing(['2022', '2023'], 300)
        
        if len(df) == 0:
            print("❌ No historical data available for testing")
            return
        
        print(f"\n🔄 Running predictions on {len(df)} historical games...")
        
        # Run our algorithm on each game
        predictions = []
        for idx, game in df.iterrows():
            pred = self.run_algorithm_on_historical_game(game)
            predictions.append(pred)
            
            if (idx + 1) % 50 == 0:
                print(f"   Processed {idx + 1}/{len(df)} games...")
        
        # Combine results
        pred_df = pd.DataFrame(predictions)
        df_with_predictions = pd.concat([df.reset_index(drop=True), pred_df], axis=1)
        
        # Evaluate performance
        results = self.evaluate_predictions(df_with_predictions)
        
        print(f"\n📈 SUMMARY RESULTS:")
        print("-" * 25)
        print(f"Games Tested: {results['total_games']}")
        print(f"ATS Record: {results['our_ats_record']} ({results['our_ats_percentage']:.1f}%)")
        print(f"Profitability: {'✅ YES' if results['our_ats_percentage'] > 52.4 else '❌ NO'}")
        print(f"Avg Error: {results['average_error']:.2f} points")
        print(f"vs Vegas: {results['vs_vegas']:+.1f}%")
        
        return results

if __name__ == "__main__":
    backtester = AlgorithmBacktester()
    results = backtester.run_full_backtest()