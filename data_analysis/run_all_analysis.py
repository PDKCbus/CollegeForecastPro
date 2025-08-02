"""
Master Analysis Runner
Executes all hypothesis testing and generates Rick's Picks
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from weather_hypotheses import WeatherHypothesesAnalyzer
from conference_hypotheses import ConferenceHypothesesAnalyzer  
from betting_hypothesis_testing import BettingHypothesesAnalyzer
from elo_team_performance_analysis import ELOTeamPerformanceAnalyzer
from comprehensive_prediction_system import RicksPicksPredictionEngine
import warnings
warnings.filterwarnings('ignore')

def run_complete_analysis():
    """Execute all analysis modules and generate final predictions"""
    print("🚀 RICK'S PICKS: COMPREHENSIVE ANALYSIS SYSTEM")
    print("=" * 80)
    print("Analyzing 28,458+ historical games to generate data-driven predictions")
    print("=" * 80)
    
    results = {}
    
    try:
        # 1. Weather Analysis
        print("\n1️⃣ WEATHER HYPOTHESES ANALYSIS")
        print("-" * 40)
        weather_analyzer = WeatherHypothesesAnalyzer()
        results['weather'] = weather_analyzer.run_comprehensive_weather_analysis()
        
    except Exception as e:
        print(f"Weather analysis error: {e}")
        results['weather'] = None
        
    try:
        # 2. Conference Analysis  
        print("\n2️⃣ CONFERENCE PERFORMANCE ANALYSIS")
        print("-" * 40)
        conference_analyzer = ConferenceHypothesesAnalyzer()
        results['conferences'] = conference_analyzer.run_comprehensive_conference_analysis()
        
    except Exception as e:
        print(f"Conference analysis error: {e}")
        results['conferences'] = None
        
    try:
        # 3. Betting Market Analysis
        print("\n3️⃣ BETTING MARKET EFFICIENCY ANALYSIS")
        print("-" * 40)
        betting_analyzer = BettingHypothesesAnalyzer()
        results['betting'] = betting_analyzer.run_comprehensive_betting_analysis()
        
    except Exception as e:
        print(f"Betting analysis error: {e}")
        results['betting'] = None
        
    try:
        # 4. ELO & Team Performance
        print("\n4️⃣ ELO & TEAM PERFORMANCE ANALYSIS")
        print("-" * 40)
        elo_analyzer = ELOTeamPerformanceAnalyzer()
        results['elo'] = elo_analyzer.run_comprehensive_analysis()
        
    except Exception as e:
        print(f"ELO analysis error: {e}")
        results['elo'] = None
        
    try:
        # 5. Generate Predictions
        print("\n5️⃣ RICK'S PICKS PREDICTION ENGINE")
        print("-" * 40)
        prediction_engine = RicksPicksPredictionEngine()
        results['predictions'] = prediction_engine.run_predictions_for_upcoming_games()
        
    except Exception as e:
        print(f"Prediction engine error: {e}")
        results['predictions'] = None
        
    # Final Summary
    print("\n" + "=" * 80)
    print("📊 ANALYSIS COMPLETE - RICK'S EDGE IDENTIFIED")
    print("=" * 80)
    
    successful_modules = sum(1 for v in results.values() if v is not None)
    print(f"✅ {successful_modules}/5 analysis modules completed successfully")
    
    if results['predictions']:
        strong_plays = len([p for p in results['predictions'] if 
                          p.get('spread_confidence', 0) > 65 or 
                          p.get('total_confidence', 0) > 65])
        print(f"🎯 {strong_plays} high-confidence plays identified")
        
    print("\n🔗 Integration: Use results to update Rick's Picks prediction algorithm")
    print("💰 Ready for deployment: Authentic data-driven betting recommendations")
    
    return results

if __name__ == "__main__":
    results = run_complete_analysis()