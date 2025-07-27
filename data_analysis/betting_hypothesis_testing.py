"""
Betting Lines vs Actual Results Analysis
Testing hypotheses about Vegas accuracy and market inefficiencies
"""

import pandas as pd
import numpy as np
import psycopg2
from scipy import stats
from database_connection import get_database_connection
import warnings
warnings.filterwarnings('ignore')

class BettingHypothesesAnalyzer:
    def __init__(self):
        self.conn = get_database_connection()
        self.betting_df = None
        
    def load_betting_data(self):
        """Load historical games with betting lines"""
        print("💰 Loading betting lines and results data...")
        
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
        AND (g.spread IS NOT NULL OR g.over_under IS NOT NULL)
        AND g.home_team_score IS NOT NULL 
        AND g.away_team_score IS NOT NULL
        ORDER BY g.start_date
        """
        
        self.betting_df = pd.read_sql(query, self.conn)
        
        # Calculate betting results
        self.betting_df['total_points'] = (
            self.betting_df['home_team_score'] + self.betting_df['away_team_score']
        )
        self.betting_df['home_margin'] = (
            self.betting_df['home_team_score'] - self.betting_df['away_team_score']
        )
        
        # Spread results
        spread_games = self.betting_df[self.betting_df['spread'].notna()].copy()
        spread_games['home_covered'] = spread_games['home_margin'] > -spread_games['spread']
        spread_games['ats_margin'] = spread_games['home_margin'] + spread_games['spread']
        
        # Over/Under results
        ou_games = self.betting_df[self.betting_df['over_under'].notna()].copy()
        ou_games['over_result'] = ou_games['total_points'] > ou_games['over_under']
        ou_games['ou_margin'] = ou_games['total_points'] - ou_games['over_under']
        
        self.betting_df = self.betting_df.merge(
            spread_games[['id', 'home_covered', 'ats_margin']], 
            on='id', how='left'
        )
        self.betting_df = self.betting_df.merge(
            ou_games[['id', 'over_result', 'ou_margin']], 
            on='id', how='left'
        )
        
        print(f"✅ Loaded {len(self.betting_df)} games with betting data")
        print(f"   Spread coverage: {self.betting_df['home_covered'].notna().sum()} games")
        print(f"   Over/Under: {self.betting_df['over_result'].notna().sum()} games")
        
    def hypothesis_1_vegas_accuracy(self):
        """H1: Vegas spreads are accurate (50% hit rate)"""
        print("\n🎯 HYPOTHESIS 1: Vegas Spread Accuracy")
        
        spread_games = self.betting_df[self.betting_df['home_covered'].notna()]
        
        if len(spread_games) == 0:
            print("   No spread data available")
            return None
            
        home_cover_rate = spread_games['home_covered'].mean() * 100
        away_cover_rate = 100 - home_cover_rate
        
        # Test against theoretical 50%
        covers = spread_games['home_covered'].sum()
        total = len(spread_games)
        
        # Binomial test for 50% accuracy (manual implementation for compatibility)
        from scipy.stats import binom
        p_value = 2 * min(binom.cdf(covers, total, 0.5), 1 - binom.cdf(covers - 1, total, 0.5))
        
        print(f"   Home team ATS: {covers}/{total} ({home_cover_rate:.1f}%)")
        print(f"   Away team ATS: {total - covers}/{total} ({away_cover_rate:.1f}%)")
        print(f"   Deviation from 50%: {abs(home_cover_rate - 50):.1f}%")
        print(f"   Statistical significance: p = {p_value:.4f}")
        print(f"   Vegas accuracy: {'Confirmed' if p_value > 0.05 else 'Biased'}")
        
        # Average ATS margin
        avg_ats_margin = spread_games['ats_margin'].mean()
        print(f"   Average ATS margin: {avg_ats_margin:.2f} points")
        
        return {
            'home_cover_rate': home_cover_rate,
            'total_games': total,
            'p_value': p_value,
            'avg_ats_margin': avg_ats_margin,
            'vegas_accurate': p_value > 0.05
        }
        
    def hypothesis_2_home_favorite_bias(self):
        """H2: Home favorites cover less than road favorites"""
        print("\n🏠 HYPOTHESIS 2: Home Favorite ATS Performance")
        
        spread_games = self.betting_df[self.betting_df['spread'].notna()].copy()
        
        # Home favorites (negative spread)
        home_favs = spread_games[spread_games['spread'] < 0]
        road_favs = spread_games[spread_games['spread'] > 0]
        
        if len(home_favs) == 0 or len(road_favs) == 0:
            print("   Insufficient favorite data")
            return None
            
        home_fav_cover_rate = home_favs['home_covered'].mean() * 100
        road_fav_cover_rate = (1 - road_favs['home_covered']).mean() * 100  # Away team covers
        
        # Statistical test
        home_fav_covers = home_favs['home_covered'].sum()
        road_fav_covers = (1 - road_favs['home_covered']).sum()
        
        print(f"   Home favorites ATS: {home_fav_covers}/{len(home_favs)} ({home_fav_cover_rate:.1f}%)")
        print(f"   Road favorites ATS: {road_fav_covers}/{len(road_favs)} ({road_fav_cover_rate:.1f}%)")
        print(f"   Home favorite penalty: {road_fav_cover_rate - home_fav_cover_rate:.1f}%")
        
        # Test significance
        from scipy.stats import chi2_contingency
        contingency = [
            [home_fav_covers, len(home_favs) - home_fav_covers],
            [road_fav_covers, len(road_favs) - road_fav_covers]
        ]
        chi2, p_value, _, _ = chi2_contingency(contingency)
        
        print(f"   Statistical significance: p = {p_value:.4f}")
        
        return {
            'home_fav_rate': home_fav_cover_rate,
            'road_fav_rate': road_fav_cover_rate,
            'home_penalty': road_fav_cover_rate - home_fav_cover_rate,
            'p_value': p_value,
            'significant': p_value < 0.05
        }
        
    def hypothesis_3_over_under_bias(self):
        """H3: OVER has slight bias due to scoring increases"""
        print("\n📈 HYPOTHESIS 3: Over/Under Bias Analysis")
        
        ou_games = self.betting_df[self.betting_df['over_result'].notna()]
        
        if len(ou_games) == 0:
            print("   No over/under data available")
            return None
            
        over_rate = ou_games['over_result'].mean() * 100
        under_rate = 100 - over_rate
        
        overs = ou_games['over_result'].sum()
        total = len(ou_games)
        
        # Test against 50% (manual implementation)
        from scipy.stats import binom
        p_value = 2 * min(binom.cdf(overs, total, 0.5), 1 - binom.cdf(overs - 1, total, 0.5))
        
        print(f"   OVER results: {overs}/{total} ({over_rate:.1f}%)")
        print(f"   UNDER results: {total - overs}/{total} ({under_rate:.1f}%)")
        print(f"   OVER bias: {over_rate - 50:.1f}%")
        print(f"   Statistical significance: p = {p_value:.4f}")
        
        # Average O/U margin
        avg_ou_margin = ou_games['ou_margin'].mean()
        print(f"   Average O/U margin: {avg_ou_margin:.2f} points")
        
        # Trend by season
        season_over_rates = ou_games.groupby('season')['over_result'].mean() * 100
        print(f"   OVER trend: {season_over_rates.iloc[0]:.1f}% → {season_over_rates.iloc[-1]:.1f}%")
        
        return {
            'over_rate': over_rate,
            'total_games': total,
            'over_bias': over_rate - 50,
            'p_value': p_value,
            'avg_margin': avg_ou_margin,
            'trend_increase': season_over_rates.iloc[-1] > season_over_rates.iloc[0]
        }
        
    def hypothesis_4_blowout_vs_close_games(self):
        """H4: Large spreads (>14) are less accurate than small spreads"""
        print("\n💥 HYPOTHESIS 4: Large Spread Accuracy")
        
        spread_games = self.betting_df[self.betting_df['spread'].notna()].copy()
        spread_games['abs_spread'] = abs(spread_games['spread'])
        
        large_spreads = spread_games[spread_games['abs_spread'] > 14]
        small_spreads = spread_games[spread_games['abs_spread'] <= 7]
        
        if len(large_spreads) == 0 or len(small_spreads) == 0:
            print("   Insufficient spread range data")
            return None
            
        # Measure accuracy by ATS margin variance
        large_variance = large_spreads['ats_margin'].var()
        small_variance = small_spreads['ats_margin'].var()
        
        # Cover rates for favorites in each category
        large_fav_covers = (
            (large_spreads['spread'] < 0) & large_spreads['home_covered'] |
            (large_spreads['spread'] > 0) & ~large_spreads['home_covered']
        ).mean() * 100
        
        small_fav_covers = (
            (small_spreads['spread'] < 0) & small_spreads['home_covered'] |
            (small_spreads['spread'] > 0) & ~small_spreads['home_covered']
        ).mean() * 100
        
        print(f"   Large spreads (>14): {len(large_spreads)} games, {large_fav_covers:.1f}% fav covers")
        print(f"   Small spreads (≤7): {len(small_spreads)} games, {small_fav_covers:.1f}% fav covers")
        print(f"   Large spread variance: {large_variance:.2f}")
        print(f"   Small spread variance: {small_variance:.2f}")
        print(f"   Accuracy difference: {small_fav_covers - large_fav_covers:.1f}% better for small spreads")
        
        return {
            'large_fav_covers': large_fav_covers,
            'small_fav_covers': small_fav_covers,
            'large_variance': large_variance,
            'small_variance': small_variance,
            'small_spreads_better': small_fav_covers > large_fav_covers
        }
        
    def hypothesis_5_ranked_team_bias(self):
        """H5: Ranked teams are overvalued by public (worse ATS)"""
        print("\n⭐ HYPOTHESIS 5: Ranked Team ATS Performance")
        
        ranked_games = self.betting_df[
            (self.betting_df['home_rank'].notna() | self.betting_df['away_rank'].notna()) &
            self.betting_df['home_covered'].notna()
        ].copy()
        
        unranked_games = self.betting_df[
            self.betting_df['home_rank'].isna() & 
            self.betting_df['away_rank'].isna() &
            self.betting_df['home_covered'].notna()
        ]
        
        if len(ranked_games) == 0:
            print("   No ranked team data available")
            return None
            
        # Calculate favorite performance for ranked vs unranked
        ranked_fav_covers = []
        unranked_fav_covers = []
        
        # Ranked favorites (more public attention)
        for _, game in ranked_games.iterrows():
            home_ranked = pd.notna(game['home_rank'])
            away_ranked = pd.notna(game['away_rank'])
            
            if game['spread'] < 0 and home_ranked:  # Home ranked favorite
                ranked_fav_covers.append(game['home_covered'])
            elif game['spread'] > 0 and away_ranked:  # Away ranked favorite
                ranked_fav_covers.append(not game['home_covered'])
                
        # Unranked favorites
        for _, game in unranked_games.iterrows():
            if game['spread'] < 0:  # Home favorite
                unranked_fav_covers.append(game['home_covered'])
            elif game['spread'] > 0:  # Away favorite
                unranked_fav_covers.append(not game['home_covered'])
                
        ranked_cover_rate = np.mean(ranked_fav_covers) * 100 if ranked_fav_covers else 0
        unranked_cover_rate = np.mean(unranked_fav_covers) * 100 if unranked_fav_covers else 0
        
        print(f"   Ranked favorites ATS: {sum(ranked_fav_covers)}/{len(ranked_fav_covers)} ({ranked_cover_rate:.1f}%)")
        print(f"   Unranked favorites ATS: {sum(unranked_fav_covers)}/{len(unranked_fav_covers)} ({unranked_cover_rate:.1f}%)")
        print(f"   Ranked team penalty: {unranked_cover_rate - ranked_cover_rate:.1f}%")
        
        return {
            'ranked_cover_rate': ranked_cover_rate,
            'unranked_cover_rate': unranked_cover_rate,
            'ranked_penalty': unranked_cover_rate - ranked_cover_rate,
            'ranked_games': len(ranked_fav_covers)
        }
        
    def run_comprehensive_betting_analysis(self):
        """Run all betting hypotheses and generate insights"""
        print("🎰 COMPREHENSIVE BETTING HYPOTHESES ANALYSIS")
        print("=" * 60)
        
        self.load_betting_data()
        
        results = {}
        results['vegas_accuracy'] = self.hypothesis_1_vegas_accuracy()
        results['home_favorite_bias'] = self.hypothesis_2_home_favorite_bias()
        results['over_under_bias'] = self.hypothesis_3_over_under_bias()
        results['spread_size_accuracy'] = self.hypothesis_4_blowout_vs_close_games()
        results['ranked_team_bias'] = self.hypothesis_5_ranked_team_bias()
        
        # Generate actionable betting insights
        print("\n" + "=" * 60)
        print("💡 RICK'S PICKS BETTING STRATEGY")
        print("=" * 60)
        
        if results['vegas_accuracy'] and results['vegas_accuracy']['vegas_accurate']:
            print("✅ Vegas spreads are accurate overall - look for situational edges")
        else:
            bias = results['vegas_accuracy']['home_cover_rate'] - 50
            print(f"✅ Vegas spread bias: {bias:+.1f}% toward {'home' if bias > 0 else 'away'}")
            
        if results['home_favorite_bias'] and results['home_favorite_bias']['significant']:
            penalty = results['home_favorite_bias']['home_penalty']
            print(f"✅ Home favorite penalty: -{penalty:.1f}% ATS - favor road favorites")
            
        if results['over_under_bias'] and abs(results['over_under_bias']['over_bias']) > 2:
            bias = results['over_under_bias']['over_bias']
            print(f"✅ O/U bias: {bias:+.1f}% toward {'OVER' if bias > 0 else 'UNDER'}")
            
        if results['spread_size_accuracy'] and results['spread_size_accuracy']['small_spreads_better']:
            print("✅ Small spreads more predictable - avoid large spread games")
            
        if results['ranked_team_bias'] and results['ranked_team_bias']['ranked_penalty'] > 2:
            penalty = results['ranked_team_bias']['ranked_penalty']
            print(f"✅ Ranked team penalty: -{penalty:.1f}% ATS - fade public favorites")
            
        print("\n🎯 KEY BETTING STRATEGIES:")
        print("   1. Road favorites > home favorites")
        print("   2. Small spreads more reliable than large")
        print("   3. Fade overhyped ranked teams")
        print("   4. Look for O/U value based on bias direction")
        print("   5. Situational advantages > pure Vegas fade")
        
        return results

def main():
    analyzer = BettingHypothesesAnalyzer()
    results = analyzer.run_comprehensive_betting_analysis()
    return results

if __name__ == "__main__":
    main()