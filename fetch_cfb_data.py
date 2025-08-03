#!/usr/bin/env python3
import os
import json
import cfbd
from cfbd.rest import ApiException

def fetch_cfb_data():
    # Configure API client
    configuration = cfbd.Configuration()
    configuration.api_key['Authorization'] = os.environ.get('CFBD_API_KEY')
    configuration.api_key_prefix['Authorization'] = 'Bearer'
    
    # Create API instances
    games_api = cfbd.GamesApi(cfbd.ApiClient(configuration))
    betting_api = cfbd.BettingApi(cfbd.ApiClient(configuration))
    teams_api = cfbd.TeamsApi(cfbd.ApiClient(configuration))
    
    try:
        # Fetch 2025 Week 1 games
        games = games_api.get_games(year=2025, week=1, season_type='regular')
        
        # Fetch betting lines for 2025 Week 1
        betting_lines = []
        try:
            betting_lines = betting_api.get_lines(year=2025, week=1, season_type='regular')
        except ApiException as e:
            print(f"Warning: Could not fetch betting lines: {e}")
        
        # Process first 10 games
        processed_games = []
        for i, game in enumerate(games[:10]):
            # Find betting lines for this game
            game_lines = None
            for line in betting_lines:
                if (line.home_team == game.home_team and 
                    line.away_team == game.away_team):
                    game_lines = line
                    break
            
            # Extract spread and over/under from betting lines
            spread = None
            over_under = None
            if game_lines and game_lines.lines:
                for betting_line in game_lines.lines:
                    if betting_line.provider == 'consensus' or not spread:
                        spread = getattr(betting_line, 'spread', None)
                        over_under = getattr(betting_line, 'over_under', None)
                        break
            
            game_data = {
                'id': game.id,
                'home_team': game.home_team,
                'away_team': game.away_team,
                'home_conference': getattr(game, 'home_conference', None),
                'away_conference': getattr(game, 'away_conference', None),
                'start_date': game.start_date.isoformat() if game.start_date else None,
                'venue': getattr(game, 'venue', None),
                'venue_id': getattr(game, 'venue_id', None),
                'conference_game': getattr(game, 'conference_game', False),
                'spread': spread,
                'over_under': over_under,
                'is_featured': i == 0  # Make first game featured
            }
            processed_games.append(game_data)
        
        # Output results as JSON
        result = {
            'success': True,
            'games': processed_games,
            'count': len(processed_games)
        }
        
        print(json.dumps(result, indent=2))
        
    except ApiException as e:
        error_result = {
            'success': False,
            'error': str(e),
            'games': []
        }
        print(json.dumps(error_result, indent=2))

if __name__ == "__main__":
    fetch_cfb_data()