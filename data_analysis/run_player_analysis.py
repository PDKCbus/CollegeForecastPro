#!/usr/bin/env python3
"""
Execute Player Impact Analysis
Generates statistical coefficients for TypeScript handicapping engine
"""

from player_impact_analysis import PlayerImpactAnalyzer
import json

def main():
    print("🏈 RICK'S PICKS - PLAYER IMPACT ANALYSIS")
    print("=" * 50)
    
    analyzer = PlayerImpactAnalyzer()
    coefficients = analyzer.run_comprehensive_player_analysis()
    
    # Save coefficients for TypeScript integration
    with open('player_impact_coefficients.json', 'w') as f:
        json.dump(coefficients, f, indent=2)
    
    print(f"\n💾 Coefficients saved to: player_impact_coefficients.json")
    print("🔧 Ready for TypeScript handicapping engine integration")

if __name__ == "__main__":
    main()