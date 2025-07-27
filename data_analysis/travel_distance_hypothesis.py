"""
Travel Distance Hypothesis Analysis
Testing correlation between away team travel distance and spread coverage
"""

import pandas as pd
import numpy as np
import psycopg2
from scipy import stats
from database_connection import get_database_connection
import math
import warnings
warnings.filterwarnings('ignore')

class TravelDistanceAnalyzer:
    def __init__(self):
        self.conn = get_database_connection()
        self.games_df = None
        
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula"""
        if pd.isna(lat1) or pd.isna(lon1) or pd.isna(lat2) or pd.isna(lon2):
            return None
            
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of Earth in miles
        r = 3956
        return c * r
    
    def extract_state_from_team(self, team_name: str) -> str:
        """Extract state from team name using common patterns"""
        if not team_name:
            return None
            
        # State name mapping for major college football teams
        state_mapping = {
            'Alabama': 'Alabama',
            'Auburn': 'Alabama', 
            'Arizona': 'Arizona',
            'Arizona State': 'Arizona',
            'Arkansas': 'Arkansas',
            'California': 'California',
            'UCLA': 'California',
            'USC': 'California',
            'Stanford': 'California',
            'Colorado': 'Colorado',
            'UConn': 'Connecticut',
            'Connecticut': 'Connecticut',
            'Delaware': 'Delaware',
            'Florida': 'Florida',
            'Miami': 'Florida',
            'Florida State': 'Florida',
            'UCF': 'Florida',
            'Georgia': 'Georgia',
            'Georgia Tech': 'Georgia',
            'Hawaii': 'Hawaii',
            'Idaho': 'Idaho',
            'Illinois': 'Illinois',
            'Northwestern': 'Illinois',
            'Indiana': 'Indiana',
            'Notre Dame': 'Indiana',
            'Iowa': 'Iowa',
            'Iowa State': 'Iowa',
            'Kansas': 'Kansas',
            'Kansas State': 'Kansas',
            'Kentucky': 'Kentucky',
            'Louisiana': 'Louisiana',
            'LSU': 'Louisiana',
            'Tulane': 'Louisiana',
            'Maine': 'Maine',
            'Maryland': 'Maryland',
            'Boston College': 'Massachusetts',
            'Harvard': 'Massachusetts',
            'Michigan': 'Michigan',
            'Michigan State': 'Michigan',
            'Minnesota': 'Minnesota',
            'Mississippi': 'Mississippi',
            'Ole Miss': 'Mississippi',
            'Mississippi State': 'Mississippi',
            'Missouri': 'Missouri',
            'Montana': 'Montana',
            'Nebraska': 'Nebraska',
            'Nevada': 'Nevada',
            'UNLV': 'Nevada',
            'Rutgers': 'New Jersey',
            'New Mexico': 'New Mexico',
            'Syracuse': 'New York',
            'Army': 'New York',
            'Duke': 'North Carolina',
            'North Carolina': 'North Carolina',
            'NC State': 'North Carolina',
            'Wake Forest': 'North Carolina',
            'North Dakota': 'North Dakota',
            'Ohio State': 'Ohio',
            'Cincinnati': 'Ohio',
            'Ohio': 'Ohio',
            'Oklahoma': 'Oklahoma',
            'Oklahoma State': 'Oklahoma',
            'Oregon': 'Oregon',
            'Oregon State': 'Oregon',
            'Penn State': 'Pennsylvania',
            'Pitt': 'Pennsylvania',
            'Temple': 'Pennsylvania',
            'South Carolina': 'South Carolina',
            'Clemson': 'South Carolina',
            'South Dakota': 'South Dakota',
            'Tennessee': 'Tennessee',
            'Vanderbilt': 'Tennessee',
            'Texas': 'Texas',
            'Texas A&M': 'Texas',
            'Texas Tech': 'Texas',
            'Baylor': 'Texas',
            'TCU': 'Texas',
            'Rice': 'Texas',
            'Houston': 'Texas',
            'Utah': 'Utah',
            'Utah State': 'Utah',
            'BYU': 'Utah',
            'Vermont': 'Vermont',
            'Virginia': 'Virginia',
            'Virginia Tech': 'Virginia',
            'Washington': 'Washington',
            'Washington State': 'Washington',
            'West Virginia': 'West Virginia',
            'Wisconsin': 'Wisconsin',
            'Wyoming': 'Wyoming'
        }
        
        # Try exact matches first
        for team_key, state in state_mapping.items():
            if team_key.lower() in team_name.lower():
                return state
                
        return None
        
    def load_travel_data(self):
        """Load games with location data for travel distance analysis"""
        print("🗺️ Loading games with location data for travel analysis...")
        
        # First check what location fields we have
        location_check_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'games' 
        AND column_name LIKE '%lat%' OR column_name LIKE '%lon%' OR column_name LIKE '%location%'
        """
        
        location_fields = pd.read_sql(location_check_query, self.conn)
        print(f"   Available location fields: {location_fields['column_name'].tolist()}")
        
        # Load games with betting data and any location info
        query = """
        SELECT 
            g.id, g.season, g.week, g.start_date,
            g.home_team_score, g.away_team_score,
            g.spread, g.over_under, g.stadium, g.location,
            ht.name as home_team, ht.conference as home_conf,
            at.name as away_team, at.conference as away_conf
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
        AND g.spread IS NOT NULL
        AND g.season >= 2015
        ORDER BY g.start_date
        """
        
        self.games_df = pd.read_sql(query, self.conn)
        
        # Calculate basic metrics
        self.games_df['home_margin'] = (
            self.games_df['home_team_score'] - self.games_df['away_team_score']
        )
        self.games_df['home_covered'] = (
            self.games_df['home_margin'] > -self.games_df['spread']
        )
        self.games_df['away_covered'] = ~self.games_df['home_covered']
        
        print(f"✅ Loaded {len(self.games_df)} games for travel analysis")
        
    def hypothesis_1_conference_travel_burden(self):
        """H1: Cross-conference games favor home teams due to travel"""
        print("\n✈️ HYPOTHESIS 1: Conference Travel Burden")
        
        # Compare conference vs cross-conference games
        conf_games = self.games_df[
            self.games_df['home_conf'] == self.games_df['away_conf']
        ].copy()
        
        cross_conf_games = self.games_df[
            self.games_df['home_conf'] != self.games_df['away_conf']
        ].copy()
        
        conf_home_cover = conf_games['home_covered'].mean() * 100
        cross_conf_home_cover = cross_conf_games['home_covered'].mean() * 100
        
        travel_advantage = cross_conf_home_cover - conf_home_cover
        
        print(f"   Conference games home cover rate: {conf_home_cover:.1f}%")
        print(f"   Cross-conference games home cover rate: {cross_conf_home_cover:.1f}%")
        print(f"   Travel advantage for home teams: {travel_advantage:.1f}%")
        print(f"   Sample sizes: {len(conf_games)} conf, {len(cross_conf_games)} cross-conf")
        
        # Statistical test
        from scipy.stats import chi2_contingency
        
        contingency = [
            [conf_games['home_covered'].sum(), (~conf_games['home_covered']).sum()],
            [cross_conf_games['home_covered'].sum(), (~cross_conf_games['home_covered']).sum()]
        ]
        
        chi2, p_value = chi2_contingency(contingency)[:2]
        
        print(f"   Statistical significance: p = {p_value:.4f}")
        
        return {
            'conference_home_cover': conf_home_cover,
            'cross_conference_home_cover': cross_conf_home_cover,
            'travel_advantage': travel_advantage,
            'p_value': p_value,
            'significant': p_value < 0.05
        }
        
    def hypothesis_2_geographic_distance_proxy(self):
        """H2: Use state-to-state distance as travel proxy"""
        print("\n🗺️ HYPOTHESIS 2: Geographic Distance Impact")
        
        # Define major state coordinates (approximate centers)
        state_coords = {
            'Alabama': (32.806671, -86.79113),
            'Arizona': (33.729759, -111.431221),
            'Arkansas': (34.969704, -92.373123),
            'California': (36.116203, -119.681564),
            'Colorado': (39.059811, -105.311104),
            'Connecticut': (41.597782, -72.755371),
            'Delaware': (39.318523, -75.507141),
            'Florida': (27.766279, -81.686783),
            'Georgia': (33.040619, -83.643074),
            'Idaho': (44.240459, -114.478828),
            'Illinois': (40.349457, -88.986137),
            'Indiana': (39.849426, -86.258278),
            'Iowa': (42.011539, -93.210526),
            'Kansas': (38.526600, -96.726486),
            'Kentucky': (37.668140, -84.670067),
            'Louisiana': (31.169546, -91.867805),
            'Maine': (44.693947, -69.381927),
            'Maryland': (39.063946, -76.802101),
            'Massachusetts': (42.230171, -71.530106),
            'Michigan': (43.326618, -84.536095),
            'Minnesota': (45.694454, -93.900192),
            'Mississippi': (32.741646, -89.678696),
            'Missouri': (38.456085, -92.288368),
            'Montana': (47.020859, -110.454353),
            'Nebraska': (41.12537, -98.268082),
            'Nevada': (38.313515, -117.055374),
            'New Hampshire': (43.452492, -71.563896),
            'New Jersey': (40.298904, -74.756138),
            'New Mexico': (34.840515, -106.248482),
            'New York': (42.165726, -74.948051),
            'North Carolina': (35.630066, -79.806419),
            'North Dakota': (47.528912, -99.784012),
            'Ohio': (40.388783, -82.764915),
            'Oklahoma': (35.565342, -96.928917),
            'Oregon': (44.572021, -122.070938),
            'Pennsylvania': (40.590752, -77.209755),
            'Rhode Island': (41.680893, -71.51178),
            'South Carolina': (33.856892, -80.945007),
            'South Dakota': (44.299782, -99.438828),
            'Tennessee': (35.747845, -86.692345),
            'Texas': (31.054487, -97.563461),
            'Utah': (40.150032, -111.862434),
            'Vermont': (44.045876, -72.710686),
            'Virginia': (37.769337, -78.169968),
            'Washington': (47.400902, -121.490494),
            'West Virginia': (38.491226, -80.954453),
            'Wisconsin': (44.268543, -89.616508),
            'Wyoming': (42.755966, -107.302490)
        }
        
        # Calculate travel distances
        distances = []
        valid_games = []
        
        for _, game in self.games_df.iterrows():
            # Extract state from team name or location (simplified approach)
            home_state = self.extract_state_from_team(game.get('home_team', ''))
            away_state = self.extract_state_from_team(game.get('away_team', ''))
            
            if home_state in state_coords and away_state in state_coords:
                home_coords = state_coords[home_state]
                away_coords = state_coords[away_state]
                
                distance = self.calculate_distance(
                    away_coords[0], away_coords[1],  # Away team travels FROM here
                    home_coords[0], home_coords[1]   # TO here
                )
                
                if distance is not None:
                    distances.append(distance)
                    valid_games.append(game)
        
        if len(distances) == 0:
            print("   No valid state data for distance calculation")
            return None
            
        travel_df = pd.DataFrame(valid_games)
        travel_df['travel_distance'] = distances
        
        print(f"   Calculated distances for {len(travel_df)} games")
        print(f"   Distance range: {min(distances):.0f} - {max(distances):.0f} miles")
        
        # Analyze by distance categories
        travel_df['distance_category'] = pd.cut(
            travel_df['travel_distance'], 
            bins=[0, 300, 800, 1500, 3000],
            labels=['Local (<300mi)', 'Regional (300-800mi)', 'Cross-country (800-1500mi)', 'Coast-to-coast (>1500mi)']
        )
        
        distance_analysis = travel_df.groupby('distance_category').agg({
            'away_covered': ['count', 'mean', 'std'],
            'travel_distance': 'mean'
        }).round(3)
        
        print("\n   Away Team Performance by Travel Distance:")
        for category in distance_analysis.index:
            if pd.notna(category):
                count = distance_analysis.loc[category, ('away_covered', 'count')]
                cover_rate = distance_analysis.loc[category, ('away_covered', 'mean')] * 100
                avg_dist = distance_analysis.loc[category, ('travel_distance', 'mean')]
                print(f"     {category}: {cover_rate:.1f}% ATS ({count} games, avg {avg_dist:.0f}mi)")
        
        # Correlation analysis
        correlation = stats.pearsonr(travel_df['travel_distance'], travel_df['away_covered'].astype(int))
        
        print(f"\n   Travel distance vs away ATS correlation: r = {correlation[0]:.3f}, p = {correlation[1]:.3f}")
        
        return {
            'sample_size': len(travel_df),
            'correlation': correlation[0],
            'p_value': correlation[1],
            'distance_categories': distance_analysis,
            'significant_travel_effect': abs(correlation[0]) > 0.05 and correlation[1] < 0.05
        }
        
    def hypothesis_3_power5_travel_advantage(self):
        """H3: Power 5 teams handle travel better than G5"""
        print("\n🏈 HYPOTHESIS 3: Power 5 vs G5 Travel Performance")
        
        power5_conferences = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12']
        
        # Categorize games by away team conference type
        self.games_df['away_is_p5'] = self.games_df['away_conf'].isin(power5_conferences)
        self.games_df['home_is_p5'] = self.games_df['home_conf'].isin(power5_conferences)
        
        # Cross-conference games only (where travel matters most)
        cross_conf = self.games_df[
            self.games_df['home_conf'] != self.games_df['away_conf']
        ].copy()
        
        p5_away_performance = cross_conf[cross_conf['away_is_p5']]['away_covered'].mean() * 100
        g5_away_performance = cross_conf[~cross_conf['away_is_p5']]['away_covered'].mean() * 100
        
        travel_advantage = p5_away_performance - g5_away_performance
        
        print(f"   Power 5 away teams ATS: {p5_away_performance:.1f}%")
        print(f"   Group of 5 away teams ATS: {g5_away_performance:.1f}%")
        print(f"   P5 travel advantage: {travel_advantage:.1f}%")
        
        p5_sample = len(cross_conf[cross_conf['away_is_p5']])
        g5_sample = len(cross_conf[~cross_conf['away_is_p5']])
        print(f"   Sample sizes: {p5_sample} P5 away, {g5_sample} G5 away")
        
        return {
            'p5_away_ats': p5_away_performance,
            'g5_away_ats': g5_away_performance,
            'p5_travel_advantage': travel_advantage,
            'p5_better_travelers': travel_advantage > 2.0
        }
        
    def run_comprehensive_analysis(self):
        """Run all travel distance analyses"""
        print("✈️ COMPREHENSIVE TRAVEL DISTANCE ANALYSIS")
        print("=" * 60)
        
        self.load_travel_data()
        
        results = {}
        results['conference_travel'] = self.hypothesis_1_conference_travel_burden()
        results['distance_correlation'] = self.hypothesis_2_geographic_distance_proxy()
        results['p5_travel_advantage'] = self.hypothesis_3_power5_travel_advantage()
        
        # Generate insights
        print("\n" + "=" * 60)
        print("🎯 TRAVEL DISTANCE INSIGHTS")
        print("=" * 60)
        
        if results['conference_travel'] and results['conference_travel']['significant']:
            advantage = results['conference_travel']['travel_advantage']
            print(f"✅ CROSS-CONFERENCE TRAVEL BURDEN: {advantage:.1f}% home advantage")
            
        if results['distance_correlation'] and results['distance_correlation']['significant_travel_effect']:
            corr = results['distance_correlation']['correlation']
            print(f"✅ DISTANCE CORRELATION: r = {corr:.3f} (longer travel hurts away teams)")
            
        if results['p5_travel_advantage'] and results['p5_travel_advantage']['p5_better_travelers']:
            advantage = results['p5_travel_advantage']['p5_travel_advantage']
            print(f"✅ P5 TRAVEL ADVANTAGE: {advantage:.1f}% better than G5 on road")
            
        print("\n🔍 BETTING APPLICATIONS:")
        print("   - Favor home teams in cross-conference matchups")
        print("   - Consider travel distance for away team performance")
        print("   - Power 5 teams handle travel better than G5")
        print("   - Geographic rivalries may reduce travel impact")
        
        return results

def main():
    analyzer = TravelDistanceAnalyzer()
    results = analyzer.run_comprehensive_analysis()
    return results

if __name__ == "__main__":
    main()