"""
Database connection utility for Rick's Picks data analysis
Connects to PostgreSQL database with all 28,458 historical games
"""

import os
import pandas as pd
import psycopg2
from typing import Optional, List, Dict, Any

class RicksPicksDB:
    """Database connection and query utilities for college football analysis"""
    
    def __init__(self):
        """Initialize database connection using environment variables"""
        self.connection_params = {
            'host': os.getenv('PGHOST'),
            'port': os.getenv('PGPORT'),
            'database': os.getenv('PGDATABASE'),
            'user': os.getenv('PGUSER'),
            'password': os.getenv('PGPASSWORD')
        }
        self.conn = None
        self.connect()
    
    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(**self.connection_params)
            print("✅ Connected to Rick's Picks database")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> pd.DataFrame:
        """Execute SQL query and return results as pandas DataFrame"""
        try:
            df = pd.read_sql_query(query, self.conn, params=params)
            return df
        except Exception as e:
            print(f"❌ Query execution failed: {e}")
            return pd.DataFrame()
    
    def get_all_games(self, include_incomplete: bool = False) -> pd.DataFrame:
        """Get all games from database with team information"""
        query = """
        SELECT 
            g.id,
            g.season,
            g.week,
            g.start_date,
            g.completed,
            ht.name as home_team,
            ht.conference as home_conference,
            at.name as away_team,
            at.conference as away_conference,
            g.home_team_score,
            g.away_team_score,
            g.spread,
            g.over_under,
            g.stadium,
            g.temperature,
            g.wind_speed,
            g.wind_direction,
            g.humidity,
            g.precipitation,
            g.weather_condition,
            g.is_dome,
            g.weather_impact_score,
            g.is_conference_game,
            g.is_rivalry_game
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        """
        
        if not include_incomplete:
            query += " WHERE g.completed = true"
            
        query += " ORDER BY g.start_date DESC"
        
        return self.execute_query(query)
    
    def get_games_with_betting_lines(self) -> pd.DataFrame:
        """Get only games that have betting line data"""
        query = """
        SELECT 
            g.id,
            g.season,
            g.week,
            g.start_date,
            ht.name as home_team,
            ht.conference as home_conference,
            at.name as away_team,
            at.conference as away_conference,
            g.home_team_score,
            g.away_team_score,
            g.spread,
            g.over_under,
            g.stadium,
            g.temperature,
            g.wind_speed,
            g.weather_condition,
            g.is_dome,
            g.is_conference_game
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
          AND g.spread IS NOT NULL 
          AND g.over_under IS NOT NULL
        ORDER BY g.start_date DESC
        """
        
        return self.execute_query(query)
    
    def get_weather_games(self, start_season: int = 2015) -> pd.DataFrame:
        """Get games with reliable weather data (2015-2024)"""
        query = """
        SELECT 
            g.id,
            g.season,
            g.week,
            g.start_date,
            ht.name as home_team,
            ht.conference as home_conference,
            at.name as away_team,  
            at.conference as away_conference,
            g.home_team_score,
            g.away_team_score,
            g.spread,
            g.over_under,
            g.stadium,
            g.temperature,
            g.wind_speed,
            g.wind_direction,
            g.humidity,
            g.precipitation,
            g.weather_condition,
            g.is_dome,
            g.weather_impact
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
          AND g.season >= %s
          AND (g.temperature IS NOT NULL OR g.is_dome = true)
        ORDER BY g.start_date DESC
        """
        
        return self.execute_query(query, (start_season,))
    
    def get_conference_performance(self, conference: str) -> pd.DataFrame:
        """Get performance data for specific conference"""
        query = """
        SELECT 
            g.season,
            COUNT(*) as total_games,
            AVG(CASE WHEN ht.conference = %s THEN g.home_team_score ELSE g.away_team_score END) as avg_points_for,
            AVG(CASE WHEN ht.conference = %s THEN g.away_team_score ELSE g.home_team_score END) as avg_points_against,
            COUNT(CASE WHEN g.spread IS NOT NULL THEN 1 END) as games_with_spreads
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
          AND (ht.conference = %s OR at.conference = %s)
        GROUP BY g.season
        ORDER BY g.season DESC
        """
        
        return self.execute_query(query, (conference, conference, conference, conference))
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            print("🔌 Database connection closed")

# Utility functions for quick data access
def get_db() -> RicksPicksDB:
    """Get database connection instance"""
    return RicksPicksDB()

def quick_stats() -> Dict[str, Any]:
    """Get quick overview of dataset"""
    db = get_db()
    
    all_games = db.execute_query("SELECT COUNT(*) as total FROM games WHERE completed = true")
    betting_games = db.execute_query("SELECT COUNT(*) as total FROM games WHERE completed = true AND spread IS NOT NULL")
    weather_games = db.execute_query("SELECT COUNT(*) as total FROM games WHERE completed = true AND season >= 2015 AND (temperature IS NOT NULL OR is_dome = true)")
    
    stats = {
        'total_games': int(all_games.iloc[0]['total']) if not all_games.empty else 0,
        'betting_games': int(betting_games.iloc[0]['total']) if not betting_games.empty else 0,
        'weather_games': int(weather_games.iloc[0]['total']) if not weather_games.empty else 0,
        'seasons': '2009-2024 (16 seasons)',
        'weather_seasons': '2015-2024 (10 seasons)'
    }
    
    db.close()
    return stats

if __name__ == "__main__":
    # Test connection and display stats
    stats = quick_stats()
    print("\n📊 Rick's Picks Dataset Overview:")
    for key, value in stats.items():
        print(f"   {key}: {value}")