"""
Comprehensive Prediction System
Combines all hypotheses to generate Rick's Picks for upcoming games
"""

import pandas as pd
import numpy as np
import psycopg2
from scipy import stats
from database_connection import get_database_connection
from weather_hypotheses import WeatherHypothesesAnalyzer
from conference_hypotheses import ConferenceHypothesesAnalyzer
from betting_hypothesis_testing import BettingHypothesesAnalyzer
from elo_team_performance_analysis import ELOTeamPerformanceAnalyzer
import warnings
warnings.filterwarnings('ignore')

class RicksPicksPredictionEngine:
    def __init__(self):
        self.conn = get_database_connection()
        self.historical_insights = {}
        self.upcoming_games = None
        
    def load_historical_insights(self):
        """Load all historical analysis results"""
        print("🧠 Loading Rick's historical insights...")
        
        # Run all hypothesis analyzers
        weather_analyzer = WeatherHypothesesAnalyzer()
        conference_analyzer = ConferenceHypothesesAnalyzer()
        betting_analyzer = BettingHypothesesAnalyzer()
        elo_analyzer = ELOTeamPerformanceAnalyzer()
        
        self.historical_insights = {
            'weather': weather_analyzer.run_comprehensive_weather_analysis(),
            'conferences': conference_analyzer.run_comprehensive_conference_analysis(),
            'betting': betting_analyzer.run_comprehensive_betting_analysis(),
            'elo': elo_analyzer.run_comprehensive_analysis()
        }
        
        print("✅ All historical insights loaded")
        
    def load_upcoming_games(self):
        """Load upcoming games for prediction"""
        print("📅 Loading upcoming games...")
        
        query = """
        SELECT 
            g.id, g.season, g.week, g.start_date,
            g.spread, g.over_under, g.stadium, g.location,
            g.temperature, g.wind_speed, g.humidity, g.precipitation,
            g.weather_condition, g.is_dome,
            ht.id as home_team_id, ht.name as home_team, ht.conference as home_conf,
            ht.rank as home_rank, ht.elo_rating as home_elo,
            at.id as away_team_id, at.name as away_team, at.conference as away_conf,
            at.rank as away_rank, at.elo_rating as away_elo
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = false 
        AND g.start_date > NOW()
        ORDER BY g.start_date
        LIMIT 50
        """
        
        self.upcoming_games = pd.read_sql(query, self.conn)
        print(f"✅ Loaded {len(self.upcoming_games)} upcoming games")
        
    def calculate_weather_factor(self, game):
        """Calculate weather impact score for a game"""
        weather_score = 0
        
        insights = self.historical_insights['weather']
        
        # Dome advantage
        if game['is_dome']:
            dome_advantage = insights.get('dome_advantage', {}).get('difference', 0)
            weather_score += dome_advantage * 0.5  # Convert to spread points
            
        # Temperature effects
        if pd.notna(game['temperature']):
            temp = game['temperature']
            if temp < 40:  # Cold weather penalty
                weather_score -= 3.0
            elif temp > 85:  # Heat penalty
                weather_score -= 2.0
                
        # Wind effects
        if pd.notna(game['wind_speed']) and game['wind_speed'] > 15:
            weather_score -= 2.5
            
        # Precipitation
        if (pd.notna(game['precipitation']) and game['precipitation'] > 0) or \
           (pd.notna(game['weather_condition']) and 'rain' in str(game['weather_condition']).lower()):
            weather_score -= 1.5
            
        return weather_score
        
    def calculate_conference_factor(self, game):
        """Calculate conference strength factors"""
        conf_score = 0
        
        insights = self.historical_insights['conferences']
        
        # SEC advantage in cross-conference
        if (game['home_conf'] == 'SEC' and game['away_conf'] in ['Big Ten', 'Big 12', 'ACC', 'Pac-12']) or \
           (game['away_conf'] == 'SEC' and game['home_conf'] in ['Big Ten', 'Big 12', 'ACC', 'Pac-12']):
            sec_advantage = insights.get('sec_dominance', {}).get('sec_win_pct', 50) - 50
            if game['home_conf'] == 'SEC':
                conf_score += sec_advantage * 0.1
            else:
                conf_score -= sec_advantage * 0.1
                
        # Big Ten defensive adjustment
        if game['home_conf'] == 'Big Ten' or game['away_conf'] == 'Big Ten':
            big_ten_under = insights.get('big_ten_defense', {}).get('defensive_advantage', 0)
            conf_score -= big_ten_under * 0.3  # Favor unders
            
        # Big 12 offensive adjustment
        if game['home_conf'] == 'Big 12' and game['away_conf'] == 'Big 12':
            conf_score += 2.0  # Favor overs
            
        return conf_score
        
    def calculate_elo_factor(self, game):
        """Calculate ELO-based prediction"""
        if pd.isna(game['home_elo']) or pd.isna(game['away_elo']):
            return 0
            
        # Basic ELO difference with home field advantage
        elo_diff = (game['home_elo'] + 65) - game['away_elo']  # +65 home field
        predicted_spread = elo_diff / 25  # ~25 ELO points = 1 point spread
        
        return predicted_spread
        
    def calculate_betting_factors(self, game):
        """Apply betting market insights"""
        betting_score = 0
        
        insights = self.historical_insights['betting']
        
        # Home favorite penalty
        if pd.notna(game['spread']) and game['spread'] < 0:  # Home favorite
            home_penalty = insights.get('home_favorite_bias', {}).get('home_penalty', 0)
            betting_score -= home_penalty * 0.1
            
        # Ranked team penalty (if applicable)
        if pd.notna(game['home_rank']) or pd.notna(game['away_rank']):
            ranked_penalty = insights.get('ranked_team_bias', {}).get('ranked_penalty', 0)
            if pd.notna(game['home_rank']) and game['spread'] < 0:  # Ranked home favorite
                betting_score -= ranked_penalty * 0.1
            elif pd.notna(game['away_rank']) and game['spread'] > 0:  # Ranked away favorite
                betting_score += ranked_penalty * 0.1
                
        return betting_score
        
    def generate_game_prediction(self, game):
        """Generate comprehensive prediction for a single game"""
        prediction = {
            'game_id': game['id'],
            'home_team': game['home_team'],
            'away_team': game['away_team'],
            'vegas_spread': game['spread'],
            'vegas_total': game['over_under']
        }
        
        # Calculate all factors
        weather_factor = self.calculate_weather_factor(game)
        conference_factor = self.calculate_conference_factor(game)
        elo_factor = self.calculate_elo_factor(game)
        betting_factor = self.calculate_betting_factors(game)
        
        # Rick's adjusted spread
        if pd.notna(game['spread']):
            rick_spread = game['spread'] + weather_factor + conference_factor + betting_factor
            
            # Spread recommendation
            spread_edge = abs(rick_spread - game['spread'])
            if spread_edge >= 2.5:
                if rick_spread > game['spread']:
                    prediction['spread_pick'] = f"TAKE {game['away_team']} +{abs(game['spread'])}"
                    prediction['spread_confidence'] = min(85, 60 + spread_edge * 5)
                else:
                    prediction['spread_pick'] = f"TAKE {game['home_team']} {game['spread']}"
                    prediction['spread_confidence'] = min(85, 60 + spread_edge * 5)
            else:
                prediction['spread_pick'] = "NO PLAY"
                prediction['spread_confidence'] = 50
        else:
            prediction['spread_pick'] = "NO SPREAD AVAILABLE"
            prediction['spread_confidence'] = 50
            
        # Over/Under prediction
        if pd.notna(game['over_under']):
            total_adjustment = weather_factor + (conference_factor * 0.5)
            rick_total = game['over_under'] + total_adjustment
            
            total_edge = abs(total_adjustment)
            if total_edge >= 3.0:
                if total_adjustment > 0:
                    prediction['total_pick'] = f"OVER {game['over_under']}"
                    prediction['total_confidence'] = min(85, 60 + total_edge * 3)
                else:
                    prediction['total_pick'] = f"UNDER {game['over_under']}"
                    prediction['total_confidence'] = min(85, 60 + total_edge * 3)
            else:
                prediction['total_pick'] = "NO PLAY"
                prediction['total_confidence'] = 50
        else:
            prediction['total_pick'] = "NO TOTAL AVAILABLE"
            prediction['total_confidence'] = 50
            
        # Key factors
        factors = []
        if abs(weather_factor) > 1:
            factors.append(f"Weather: {weather_factor:+.1f}")
        if abs(conference_factor) > 1:
            factors.append(f"Conference: {conference_factor:+.1f}")
        if abs(elo_factor) > 2:
            factors.append(f"ELO edge: {elo_factor:+.1f}")
        if abs(betting_factor) > 0.5:
            factors.append(f"Market: {betting_factor:+.1f}")
            
        prediction['key_factors'] = factors if factors else ["Balanced matchup"]
        prediction['rick_notes'] = self.generate_rick_notes(game, prediction)
        
        return prediction
        
    def generate_rick_notes(self, game, prediction):
        """Generate Rick's commentary for the prediction"""
        notes = []
        
        # Weather commentary
        if game['is_dome']:
            notes.append("Dome advantage favors scoring")
        elif pd.notna(game['temperature']) and game['temperature'] < 40:
            notes.append("Cold weather limits offense")
        elif pd.notna(game['wind_speed']) and game['wind_speed'] > 15:
            notes.append("High winds hurt passing game")
            
        # Conference commentary
        if game['home_conf'] == 'SEC' and game['away_conf'] in ['Big Ten', 'Big 12', 'ACC', 'Pac-12']:
            notes.append("SEC home field advantage in cross-conference")
        elif game['home_conf'] == 'Big Ten' or game['away_conf'] == 'Big Ten':
            notes.append("Big Ten defensive style lowers scoring")
        elif game['home_conf'] == 'Big 12' and game['away_conf'] == 'Big 12':
            notes.append("Big 12 shootout potential")
            
        # Betting market commentary
        if pd.notna(game['spread']) and game['spread'] < 0 and pd.notna(game['home_rank']):
            notes.append("Ranked home favorites historically struggle ATS")
            
        if not notes:
            notes.append("Solid fundamental matchup")
            
        return " | ".join(notes)
        
    def run_predictions_for_upcoming_games(self):
        """Generate predictions for all upcoming games"""
        print("🔮 GENERATING RICK'S PICKS")
        print("=" * 60)
        
        self.load_historical_insights()
        self.load_upcoming_games()
        
        if len(self.upcoming_games) == 0:
            print("No upcoming games found")
            return []
            
        predictions = []
        
        for _, game in self.upcoming_games.iterrows():
            prediction = self.generate_game_prediction(game)
            predictions.append(prediction)
            
            # Display prediction
            print(f"\n🏈 {prediction['home_team']} vs {prediction['away_team']}")
            if prediction['spread_pick'] != "NO PLAY":
                print(f"   SPREAD: {prediction['spread_pick']} ({prediction['spread_confidence']}%)")
            if prediction['total_pick'] != "NO PLAY":
                print(f"   TOTAL: {prediction['total_pick']} ({prediction['total_confidence']}%)")
            print(f"   KEY FACTORS: {', '.join(prediction['key_factors'])}")
            print(f"   RICK'S TAKE: {prediction['rick_notes']}")
            
        # Summary
        strong_plays = [p for p in predictions if 
                       p['spread_confidence'] > 65 or p['total_confidence'] > 65]
        
        print(f"\n🎯 SUMMARY: {len(strong_plays)} high-confidence plays out of {len(predictions)} games")
        print("=" * 60)
        
        return predictions

def main():
    """Run comprehensive prediction system"""
    engine = RicksPicksPredictionEngine()
    predictions = engine.run_predictions_for_upcoming_games()
    return predictions

if __name__ == "__main__":
    main()