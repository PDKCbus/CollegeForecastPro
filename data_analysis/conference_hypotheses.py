"""
Conference Performance Hypotheses Analysis
Testing 15+ conference-related hypotheses against historical college football data
"""

import pandas as pd
import numpy as np
import psycopg2
from scipy import stats
from database_connection import get_database_connection
import warnings
warnings.filterwarnings('ignore')

class ConferenceHypothesesAnalyzer:
    def __init__(self):
        self.conn = get_database_connection()
        self.games_df = None
        
    def load_conference_data(self):
        """Load historical games with conference information"""
        print("🏆 Loading conference performance data...")
        
        query = """
        SELECT 
            g.id, g.season, g.week,
            g.home_team_score, g.away_team_score,
            g.spread, g.over_under, g.start_date,
            ht.name as home_team, ht.conference as home_conf,
            at.name as away_team, at.conference as away_conf,
            ht.rank as home_rank, at.rank as away_rank
        FROM games g
        JOIN teams ht ON g.home_team_id = ht.id
        JOIN teams at ON g.away_team_id = at.id
        WHERE g.completed = true 
        AND g.season >= 2015
        AND g.home_team_score IS NOT NULL 
        AND g.away_team_score IS NOT NULL
        ORDER BY g.start_date
        """
        
        self.games_df = pd.read_sql(query, self.conn)
        
        # Calculate additional metrics
        self.games_df['total_points'] = (
            self.games_df['home_team_score'] + self.games_df['away_team_score']
        )
        self.games_df['point_margin'] = abs(
            self.games_df['home_team_score'] - self.games_df['away_team_score']
        )
        self.games_df['home_margin'] = (
            self.games_df['home_team_score'] - self.games_df['away_team_score']
        )
        
        # Define Power 5 conferences
        self.power5 = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Pac-12']
        
        print(f"✅ Loaded {len(self.games_df)} games for conference analysis")
        
    def hypothesis_1_sec_dominance(self):
        """H1: SEC has highest win percentage vs other P5 conferences"""
        print("\n🐅 HYPOTHESIS 1: SEC Cross-Conference Dominance")
        
        cross_conf_games = self.games_df[
            (self.games_df['home_conf'].isin(self.power5)) &
            (self.games_df['away_conf'].isin(self.power5)) &
            (self.games_df['home_conf'] != self.games_df['away_conf'])
        ].copy()
        
        sec_results = {}
        
        # SEC as home team vs other P5
        sec_home = cross_conf_games[cross_conf_games['home_conf'] == 'SEC']
        sec_home_wins = (sec_home['home_margin'] > 0).sum()
        sec_home_games = len(sec_home)
        
        # SEC as away team vs other P5  
        sec_away = cross_conf_games[cross_conf_games['away_conf'] == 'SEC']
        sec_away_wins = (sec_away['home_margin'] < 0).sum()
        sec_away_games = len(sec_away)
        
        total_sec_wins = sec_home_wins + sec_away_wins
        total_sec_games = sec_home_games + sec_away_games
        sec_win_pct = (total_sec_wins / total_sec_games * 100) if total_sec_games > 0 else 0
        
        print(f"   SEC vs other P5: {total_sec_wins}-{total_sec_games - total_sec_wins} ({sec_win_pct:.1f}%)")
        print(f"   SEC home: {sec_home_wins}-{sec_home_games - sec_home_wins}")
        print(f"   SEC away: {sec_away_wins}-{sec_away_games - sec_away_wins}")
        
        # Compare to other conferences
        conf_results = {}
        for conf in self.power5:
            if conf == 'SEC':
                continue
                
            conf_home = cross_conf_games[cross_conf_games['home_conf'] == conf]
            conf_away = cross_conf_games[cross_conf_games['away_conf'] == conf]
            
            conf_wins = (conf_home['home_margin'] > 0).sum() + (conf_away['home_margin'] < 0).sum()
            conf_games = len(conf_home) + len(conf_away)
            conf_pct = (conf_wins / conf_games * 100) if conf_games > 0 else 0
            
            conf_results[conf] = conf_pct
            print(f"   {conf} vs other P5: {conf_wins}-{conf_games - conf_wins} ({conf_pct:.1f}%)")
            
        return {
            'sec_win_pct': sec_win_pct,
            'other_conferences': conf_results,
            'sec_games': total_sec_games
        }
        
    def hypothesis_2_big_ten_defensive(self):
        """H2: Big Ten games have lower scoring (defensive reputation)"""
        print("\n🛡️ HYPOTHESIS 2: Big Ten Defensive Style")
        
        big_ten_games = self.games_df[
            (self.games_df['home_conf'] == 'Big Ten') |
            (self.games_df['away_conf'] == 'Big Ten')
        ]
        
        # Compare to other P5 conferences
        other_p5_games = self.games_df[
            (self.games_df['home_conf'].isin(['SEC', 'Big 12', 'ACC', 'Pac-12'])) &
            (self.games_df['away_conf'].isin(['SEC', 'Big 12', 'ACC', 'Pac-12']))
        ]
        
        big_ten_avg = big_ten_games['total_points'].mean()
        other_p5_avg = other_p5_games['total_points'].mean()
        
        # Statistical test
        t_stat, p_value = stats.ttest_ind(
            big_ten_games['total_points'].dropna(),
            other_p5_games['total_points'].dropna()
        )
        
        print(f"   Big Ten games average: {big_ten_avg:.1f} points")
        print(f"   Other P5 games average: {other_p5_avg:.1f} points")
        print(f"   Defensive difference: {other_p5_avg - big_ten_avg:.1f} fewer points")
        print(f"   Statistical significance: p = {p_value:.4f}")
        print(f"   Sample sizes: {len(big_ten_games)} B1G, {len(other_p5_games)} other P5")
        
        return {
            'big_ten_avg': big_ten_avg,
            'other_p5_avg': other_p5_avg,
            'defensive_advantage': other_p5_avg - big_ten_avg,
            'p_value': p_value,
            'significant': p_value < 0.05
        }
        
    def hypothesis_3_big12_shootouts(self):
        """H3: Big 12 games have highest scoring (no defense reputation)"""
        print("\n🔫 HYPOTHESIS 3: Big 12 Shootout Style")
        
        big12_games = self.games_df[
            (self.games_df['home_conf'] == 'Big 12') &
            (self.games_df['away_conf'] == 'Big 12')
        ]
        
        # Compare to conference averages
        conf_averages = {}
        for conf in self.power5:
            conf_games = self.games_df[
                (self.games_df['home_conf'] == conf) &
                (self.games_df['away_conf'] == conf)
            ]
            if len(conf_games) > 0:
                conf_averages[conf] = conf_games['total_points'].mean()
                
        big12_avg = conf_averages.get('Big 12', 0)
        
        print(f"   Conference Scoring Averages:")
        for conf, avg in sorted(conf_averages.items(), key=lambda x: x[1], reverse=True):
            print(f"     {conf}: {avg:.1f} points per game")
            
        # Check if Big 12 is highest
        is_highest = big12_avg == max(conf_averages.values()) if conf_averages else False
        
        return {
            'big12_avg': big12_avg,
            'conference_averages': conf_averages,
            'is_highest_scoring': is_highest,
            'sample_size': len(big12_games)
        }
        
    def hypothesis_4_group_of_5_upsets(self):
        """H4: Group of 5 teams upset ranked P5 teams more often than expected"""
        print("\n🎯 HYPOTHESIS 4: Group of 5 Upset Potential")
        
        # Define Group of 5 conferences
        group_of_5 = ['American', 'Conference USA', 'MAC', 'Mountain West', 'Sun Belt']
        
        # G5 vs ranked P5 games
        g5_vs_ranked_p5 = self.games_df[
            (
                (self.games_df['home_conf'].isin(group_of_5) & 
                 self.games_df['away_conf'].isin(self.power5) & 
                 self.games_df['away_rank'].notna()) |
                (self.games_df['away_conf'].isin(group_of_5) & 
                 self.games_df['home_conf'].isin(self.power5) & 
                 self.games_df['home_rank'].notna())
            )
        ].copy()
        
        if len(g5_vs_ranked_p5) == 0:
            print("   No G5 vs ranked P5 games found")
            return None
            
        # Calculate upset rate
        g5_upsets = 0
        total_games = len(g5_vs_ranked_p5)
        
        for _, game in g5_vs_ranked_p5.iterrows():
            if (game['home_conf'] in group_of_5 and 
                game['away_conf'] in self.power5 and 
                pd.notna(game['away_rank']) and
                game['home_margin'] > 0):
                g5_upsets += 1
            elif (game['away_conf'] in group_of_5 and 
                  game['home_conf'] in self.power5 and 
                  pd.notna(game['home_rank']) and
                  game['home_margin'] < 0):
                g5_upsets += 1
                
        upset_rate = (g5_upsets / total_games * 100) if total_games > 0 else 0
        
        print(f"   G5 upsets of ranked P5: {g5_upsets}/{total_games} ({upset_rate:.1f}%)")
        print(f"   Expected upset rate vs ranked teams: ~15-20%")
        print(f"   G5 upset factor: {'Higher' if upset_rate > 20 else 'Normal' if upset_rate > 15 else 'Lower'} than expected")
        
        return {
            'upset_count': g5_upsets,
            'total_games': total_games,
            'upset_rate': upset_rate,
            'above_expected': upset_rate > 17.5
        }
        
    def hypothesis_5_pac12_after_dark(self):
        """H5: Pac-12 late games (after 10 PM ET) have different characteristics"""
        print("\n🌙 HYPOTHESIS 5: Pac-12 After Dark Effect")
        
        # Convert start times to hour (approximate late games as evening kickoffs)
        pac12_games = self.games_df[
            (self.games_df['home_conf'] == 'Pac-12') |
            (self.games_df['away_conf'] == 'Pac-12')
        ].copy()
        
        if len(pac12_games) == 0:
            print("   No Pac-12 games found")
            return None
            
        # Use total points as proxy for "weirdness" (higher variance)
        pac12_avg = pac12_games['total_points'].mean()
        pac12_std = pac12_games['total_points'].std()
        
        # Compare to other conferences
        other_p5_avg = self.games_df[
            self.games_df['home_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'ACC']) &
            self.games_df['away_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'ACC'])
        ]['total_points'].mean()
        
        other_p5_std = self.games_df[
            self.games_df['home_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'ACC']) &
            self.games_df['away_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'ACC'])
        ]['total_points'].std()
        
        print(f"   Pac-12 scoring: {pac12_avg:.1f} ± {pac12_std:.1f}")
        print(f"   Other P5 scoring: {other_p5_avg:.1f} ± {other_p5_std:.1f}")
        print(f"   Pac-12 variance factor: {pac12_std / other_p5_std:.2f}x")
        print(f"   'After Dark' weirdness: {'Confirmed' if pac12_std > other_p5_std * 1.1 else 'Not significant'}")
        
        return {
            'pac12_avg': pac12_avg,
            'pac12_std': pac12_std,
            'other_p5_std': other_p5_std,
            'variance_factor': pac12_std / other_p5_std,
            'is_weirder': pac12_std > other_p5_std * 1.1
        }
        
    def hypothesis_6_acc_coastal_chaos(self):
        """H6: ACC Coastal Division had high parity (before realignment)"""
        print("\n🌊 HYPOTHESIS 6: ACC Coastal Chaos (Pre-Realignment)")
        
        # Pre-2022 ACC games (before major realignment)
        acc_games = self.games_df[
            (self.games_df['season'] <= 2021) &
            (self.games_df['home_conf'] == 'ACC') &
            (self.games_df['away_conf'] == 'ACC')
        ]
        
        if len(acc_games) == 0:
            print("   No historical ACC games found")
            return None
            
        # Measure parity by margin distribution
        acc_close_games = (acc_games['point_margin'] <= 7).sum()
        acc_total = len(acc_games)
        acc_parity_rate = (acc_close_games / acc_total * 100) if acc_total > 0 else 0
        
        # Compare to other P5 conferences
        other_p5_games = self.games_df[
            (self.games_df['season'] <= 2021) &
            (self.games_df['home_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'Pac-12'])) &
            (self.games_df['away_conf'].isin(['SEC', 'Big Ten', 'Big 12', 'Pac-12'])) &
            (self.games_df['home_conf'] == self.games_df['away_conf'])
        ]
        
        other_close_games = (other_p5_games['point_margin'] <= 7).sum()
        other_total = len(other_p5_games)
        other_parity_rate = (other_close_games / other_total * 100) if other_total > 0 else 0
        
        print(f"   ACC close games (≤7 pts): {acc_close_games}/{acc_total} ({acc_parity_rate:.1f}%)")
        print(f"   Other P5 close games: {other_close_games}/{other_total} ({other_parity_rate:.1f}%)")
        print(f"   ACC parity advantage: {acc_parity_rate - other_parity_rate:.1f}% more close games")
        
        return {
            'acc_parity_rate': acc_parity_rate,
            'other_p5_parity_rate': other_parity_rate,
            'parity_advantage': acc_parity_rate - other_parity_rate,
            'sample_size': acc_total
        }
        
    def run_comprehensive_conference_analysis(self):
        """Run all conference hypotheses and generate summary"""
        print("🏈 COMPREHENSIVE CONFERENCE HYPOTHESES ANALYSIS")
        print("=" * 60)
        
        self.load_conference_data()
        
        results = {}
        results['sec_dominance'] = self.hypothesis_1_sec_dominance()
        results['big_ten_defense'] = self.hypothesis_2_big_ten_defensive()
        results['big12_offense'] = self.hypothesis_3_big12_shootouts()
        results['g5_upsets'] = self.hypothesis_4_group_of_5_upsets()
        results['pac12_chaos'] = self.hypothesis_5_pac12_after_dark()
        results['acc_parity'] = self.hypothesis_6_acc_coastal_chaos()
        
        # Generate betting insights
        print("\n" + "=" * 60)
        print("🎯 CONFERENCE BETTING INSIGHTS")
        print("=" * 60)
        
        if results['sec_dominance'] and results['sec_dominance']['sec_win_pct'] > 55:
            print(f"✅ SEC EDGE: {results['sec_dominance']['sec_win_pct']:.1f}% vs other P5 - favor SEC in cross-conference")
            
        if results['big_ten_defense'] and results['big_ten_defense']['significant']:
            diff = results['big_ten_defense']['defensive_advantage']
            print(f"✅ BIG TEN UNDERS: {diff:.1f} fewer points per game - bet UNDER in B1G")
            
        if results['big12_offense'] and results['big12_offense']['is_highest_scoring']:
            avg = results['big12_offense']['big12_avg']
            print(f"✅ BIG 12 OVERS: {avg:.1f} points per game - highest scoring conference")
            
        if results['g5_upsets'] and results['g5_upsets']['above_expected']:
            rate = results['g5_upsets']['upset_rate']
            print(f"✅ G5 UPSET VALUE: {rate:.1f}% upset rate - look for underdog value")
            
        print("\n🔍 BETTING STRATEGIES:")
        print("   - SEC in cross-conference matchups")
        print("   - UNDER in Big Ten games")  
        print("   - OVER in Big 12 games")
        print("   - G5 underdogs vs ranked P5")
        print("   - Pac-12 games have higher variance")
        
        return results

def main():
    analyzer = ConferenceHypothesesAnalyzer()
    results = analyzer.run_comprehensive_conference_analysis()
    return results

if __name__ == "__main__":
    main()