#!/usr/bin/env python3
"""
Quick test of database connection and basic analysis
"""

from database_connection import get_db

def test_database():
    """Test database connection and get basic stats"""
    print("🔍 Testing Rick's Picks Database Connection")
    print("=" * 50)
    
    db = get_db()
    
    # Test basic query
    result = db.execute_query("SELECT COUNT(*) as total FROM games WHERE completed = true")
    total_games = result.iloc[0]['total'] if not result.empty else 0
    print(f"✅ Total completed games: {total_games}")
    
    # Test games with weather data
    weather_query = """
    SELECT COUNT(*) as total 
    FROM games 
    WHERE completed = true 
      AND season >= 2015 
      AND (temperature IS NOT NULL OR is_dome = true)
    """
    result = db.execute_query(weather_query)
    weather_games = result.iloc[0]['total'] if not result.empty else 0
    print(f"✅ Games with weather data (2015+): {weather_games}")
    
    # Test games with betting lines
    betting_query = """
    SELECT COUNT(*) as total 
    FROM games 
    WHERE completed = true 
      AND spread IS NOT NULL 
      AND over_under IS NOT NULL
    """
    result = db.execute_query(betting_query)
    betting_games = result.iloc[0]['total'] if not result.empty else 0
    print(f"✅ Games with betting lines: {betting_games}")
    
    # Sample weather data
    sample_query = """
    SELECT season, temperature, wind_speed, is_dome, home_team_score, away_team_score
    FROM games 
    WHERE completed = true 
      AND season >= 2020
    LIMIT 5
    """
    sample = db.execute_query(sample_query)
    print(f"\n📊 Sample data preview:")
    print(sample)
    
    db.close()
    return total_games, weather_games, betting_games

if __name__ == "__main__":
    test_database()