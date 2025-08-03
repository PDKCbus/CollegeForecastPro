#!/usr/bin/env python3
"""
College Football Data API - Advanced Metrics Research
Explore available advanced metrics we can incorporate into our prediction algorithm
"""

import requests
import pandas as pd
import json
from typing import Dict, List, Optional
import os

class CFBDAdvancedMetricsResearcher:
    """
    Research available advanced metrics from College Football Data API
    """
    
    def __init__(self):
        self.api_key = os.getenv('CFBD_API_KEY')
        self.base_url = 'https://api.collegefootballdata.com'
        if not self.api_key:
            print("⚠️  Warning: CFBD_API_KEY not found. Some endpoints may not work.")
    
    def make_request(self, endpoint: str, params: Dict = None) -> Optional[List]:
        """Make API request to CFBD"""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = {}
            if self.api_key:
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            print(f"🌐 Requesting: {endpoint}")
            response = requests.get(url, params=params, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success: {len(data) if isinstance(data, list) else 1} records")
                return data
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Request failed: {e}")
            return None
    
    def research_advanced_team_metrics(self, year: int = 2023) -> Dict:
        """Research advanced team metrics available"""
        print(f"\n📊 ADVANCED TEAM METRICS RESEARCH - {year}")
        print("=" * 60)
        
        results = {}
        
        # 1. Advanced Season Stats
        print(f"\n1️⃣ Advanced Season Statistics:")
        advanced_stats = self.make_request('/stats/season/advanced', {
            'year': year,
            'team': 'Alabama'  # Sample team
        })
        if advanced_stats:
            results['advanced_season_stats'] = {
                'available': True,
                'sample_metrics': list(advanced_stats[0].keys()) if advanced_stats else [],
                'description': 'Team efficiency metrics, EPA, success rates'
            }
            print(f"   Available metrics: {', '.join(advanced_stats[0].keys())}")
        
        # 2. Predicted Points Added (PPA/EPA) 
        print(f"\n2️⃣ Predicted Points Added (EPA):")
        ppa_data = self.make_request('/ppa/teams', {
            'year': year,
            'team': 'Georgia'
        })
        if ppa_data:
            results['ppa_data'] = {
                'available': True,
                'metrics': list(ppa_data[0].keys()) if ppa_data else [],
                'description': 'Expected Points Added by team and situation'
            }
            print(f"   PPA metrics: {', '.join(ppa_data[0].keys())}")
        
        # 3. SP+ Ratings (if available)
        print(f"\n3️⃣ SP+ Ratings:")
        sp_ratings = self.make_request('/ratings/sp', {'year': year})
        if sp_ratings:
            results['sp_ratings'] = {
                'available': True,
                'metrics': list(sp_ratings[0].keys()) if sp_ratings else [],
                'description': 'Bill Connelly SP+ ratings and components'
            }
            print(f"   SP+ components: {', '.join(sp_ratings[0].keys())}")
        
        # 4. FPI Ratings
        print(f"\n4️⃣ FPI Ratings:")
        fpi_data = self.make_request('/ratings/fpi', {'year': year})
        if fpi_data:
            results['fpi_ratings'] = {
                'available': True,
                'metrics': list(fpi_data[0].keys()) if fpi_data else [],
                'description': 'ESPN Football Power Index ratings'
            }
            print(f"   FPI metrics: {', '.join(fpi_data[0].keys())}")
        
        return results
    
    def research_player_metrics(self, year: int = 2023) -> Dict:
        """Research player-level metrics and stats"""
        print(f"\n👤 PLAYER METRICS RESEARCH - {year}")
        print("=" * 60)
        
        results = {}
        
        # 1. Player Season Stats
        print(f"\n1️⃣ Player Season Statistics:")
        player_stats = self.make_request('/stats/player/season', {
            'year': year,
            'team': 'Ohio State',
            'category': 'passing'
        })
        if player_stats:
            results['player_season_stats'] = {
                'available': True,
                'categories': ['passing', 'rushing', 'receiving', 'defensive'],
                'sample_metrics': list(player_stats[0].keys()) if player_stats else [],
                'description': 'Comprehensive player statistics by category'
            }
            print(f"   Player stat fields: {', '.join(player_stats[0].keys())}")
        
        # 2. Player PPA (Expected Points Added)
        print(f"\n2️⃣ Player PPA/EPA:")
        player_ppa = self.make_request('/ppa/players/season', {
            'year': year,
            'team': 'Michigan'
        })
        if player_ppa:
            results['player_ppa'] = {
                'available': True,
                'metrics': list(player_ppa[0].keys()) if player_ppa else [],
                'description': 'Player expected points added by situation'
            }
            print(f"   Player PPA fields: {', '.join(player_ppa[0].keys())}")
        
        # 3. Player Usage Metrics
        print(f"\n3️⃣ Player Usage:")
        usage_data = self.make_request('/player/usage', {
            'year': year,
            'team': 'Texas'
        })
        if usage_data:
            results['player_usage'] = {
                'available': True,
                'metrics': list(usage_data[0].keys()) if usage_data else [],
                'description': 'Player usage rates and opportunity metrics'
            }
            print(f"   Usage metrics: {', '.join(usage_data[0].keys())}")
        
        # 4. Returning Production
        print(f"\n4️⃣ Returning Production:")
        returning_data = self.make_request('/player/returning', {
            'year': year,
            'team': 'Alabama'
        })
        if returning_data:
            results['returning_production'] = {
                'available': True,
                'metrics': list(returning_data[0].keys()) if returning_data else [],
                'description': 'Team returning production from previous season'
            }
            print(f"   Returning production: {', '.join(returning_data[0].keys())}")
        
        return results
    
    def research_game_level_metrics(self, year: int = 2023) -> Dict:
        """Research game-level advanced metrics"""
        print(f"\n🏈 GAME-LEVEL METRICS RESEARCH - {year}")
        print("=" * 60)
        
        results = {}
        
        # 1. Advanced Game Stats
        print(f"\n1️⃣ Advanced Game Statistics:")
        game_advanced = self.make_request('/stats/game/advanced', {
            'year': year,
            'week': 1,
            'team': 'Georgia'
        })
        if game_advanced:
            results['game_advanced_stats'] = {
                'available': True,
                'metrics': list(game_advanced[0].keys()) if game_advanced else [],
                'description': 'Game-level efficiency and advanced metrics'
            }
            print(f"   Game advanced metrics: {', '.join(game_advanced[0].keys())}")
        
        # 2. Win Probability Data
        print(f"\n2️⃣ Win Probability:")
        # Get a sample game ID first
        games = self.make_request('/games', {'year': year, 'week': 1})
        if games and len(games) > 0:
            sample_game_id = games[0]['id']
            wp_data = self.make_request('/metrics/wp', {'gameId': sample_game_id})
            if wp_data:
                results['win_probability'] = {
                    'available': True,
                    'metrics': list(wp_data[0].keys()) if wp_data else [],
                    'description': 'Play-by-play win probability data'
                }
                print(f"   Win probability fields: {', '.join(wp_data[0].keys())}")
        
        # 3. PPA by Game
        print(f"\n3️⃣ Game PPA Data:")
        game_ppa = self.make_request('/ppa/games', {
            'year': year,
            'week': 1,
            'team': 'Alabama'
        })
        if game_ppa:
            results['game_ppa'] = {
                'available': True,
                'metrics': list(game_ppa[0].keys()) if game_ppa else [],
                'description': 'Expected points added by game'
            }
            print(f"   Game PPA metrics: {', '.join(game_ppa[0].keys())}")
        
        return results
    
    def research_situational_metrics(self, year: int = 2023) -> Dict:
        """Research situational and context-specific metrics"""
        print(f"\n🎯 SITUATIONAL METRICS RESEARCH - {year}")
        print("=" * 60)
        
        results = {}
        
        # 1. Team Talent Ratings
        print(f"\n1️⃣ Team Talent:")
        talent_data = self.make_request('/talent', {'year': year})
        if talent_data:
            results['team_talent'] = {
                'available': True,
                'metrics': list(talent_data[0].keys()) if talent_data else [],
                'description': 'Recruiting-based talent composite scores'
            }
            print(f"   Talent metrics: {', '.join(talent_data[0].keys())}")
        
        # 2. Coaching Records
        print(f"\n2️⃣ Coach Records:")
        coach_data = self.make_request('/coaches', {'year': year, 'team': 'Alabama'})
        if coach_data:
            results['coaching_records'] = {
                'available': True,
                'metrics': list(coach_data[0].keys()) if coach_data else [],
                'description': 'Head coach records and tenure'
            }
            print(f"   Coach data: {', '.join(coach_data[0].keys())}")
        
        # 3. Conference Data
        print(f"\n3️⃣ Conference Information:")
        conference_data = self.make_request('/conferences')
        if conference_data:
            results['conference_data'] = {
                'available': True,
                'metrics': list(conference_data[0].keys()) if conference_data else [],
                'description': 'Conference affiliations and details'
            }
            print(f"   Conference fields: {', '.join(conference_data[0].keys())}")
        
        return results
    
    def analyze_missing_factors(self) -> Dict:
        """Analyze what factors our current algorithm is missing"""
        print(f"\n🔍 MISSING FACTOR ANALYSIS")
        print("=" * 50)
        
        current_factors = [
            'weather_impact',
            'conference_strength', 
            'home_field_advantage',
            'basic_elo_ratings'
        ]
        
        potential_improvements = {
            'high_impact': [
                'player_efficiency_ratings',
                'team_offensive_defensive_efficiency',
                'recent_performance_trends',
                'strength_of_schedule_adjusted',
                'coaching_matchup_history'
            ],
            'medium_impact': [
                'advanced_statistical_models_sp_plus',
                'situational_performance_metrics',
                'travel_distance_fatigue',
                'motivation_factors_bowl_eligibility',
                'injury_impact_key_players'
            ],
            'low_impact': [
                'public_betting_percentages',
                'line_movement_sharp_money',
                'social_media_sentiment_refined',
                'historical_referee_tendencies'
            ]
        }
        
        for impact_level, factors in potential_improvements.items():
            print(f"\n{impact_level.upper()} IMPACT FACTORS:")
            for factor in factors:
                print(f"  • {factor.replace('_', ' ').title()}")
        
        return potential_improvements
    
    def generate_improvement_report(self) -> None:
        """Generate comprehensive improvement recommendations"""
        print(f"\n📋 ALGORITHM IMPROVEMENT RECOMMENDATIONS")
        print("=" * 60)
        
        # Research current API capabilities
        team_metrics = self.research_advanced_team_metrics()
        player_metrics = self.research_player_metrics()
        game_metrics = self.research_game_level_metrics()
        situational_metrics = self.research_situational_metrics()
        missing_factors = self.analyze_missing_factors()
        
        # Save results
        report = {
            'timestamp': pd.Timestamp.now().isoformat(),
            'current_performance': {
                'ats_percentage': 51.7,
                'break_even_needed': 52.4,
                'vs_vegas_performance': -26.5
            },
            'available_cfbd_metrics': {
                'team_metrics': team_metrics,
                'player_metrics': player_metrics,
                'game_metrics': game_metrics,
                'situational_metrics': situational_metrics
            },
            'missing_factors': missing_factors,
            'immediate_implementation_plan': [
                'Integrate SP+ ratings if available',
                'Add player efficiency metrics (PPA/EPA)',
                'Implement team offensive/defensive efficiency',
                'Calculate strength of schedule adjustments',
                'Add recent performance momentum (weighted recent games)',
                'Include coaching matchup history'
            ]
        }
        
        # Save to file
        with open('cfbd_advanced_metrics_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n✅ Comprehensive report saved to 'cfbd_advanced_metrics_report.json'")
        print(f"\n🎯 TOP PRIORITY IMPLEMENTATIONS:")
        for i, item in enumerate(report['immediate_implementation_plan'], 1):
            print(f"   {i}. {item}")

if __name__ == "__main__":
    researcher = CFBDAdvancedMetricsResearcher()
    researcher.generate_improvement_report()