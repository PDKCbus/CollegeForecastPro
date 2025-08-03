# Algorithm Improvement Research

## Current Performance Analysis
- **51.7% Against The Spread** (need 52.4% to break even)
- **26.5% worse than Vegas** at predicting spreads
- Average error: 14.68 points vs Vegas 11.61 points

## Current Algorithm Factors
1. **Weather Impact** (7.9 point dome advantage)
2. **Conference Strength** (SEC +5.7, Power 5 vs G5)
3. **Home Field Advantage** (3 points)
4. **Basic ELO ratings**

## Missing Factors That Vegas Uses

### 1. Player-Specific Data
- **Quarterback Performance**: Completion %, yards per attempt, turnover rate
- **Key Player Injuries**: Starting QB, RB, top receivers, defensive stars
- **Player Matchups**: QB vs opposing defense rankings
- **Depth Chart Changes**: Suspensions, transfers, position changes

### 2. Advanced Team Metrics
- **Offensive Efficiency**: Points per drive, red zone efficiency
- **Defensive Efficiency**: Third down conversion defense, turnovers forced
- **Special Teams**: Field goal accuracy, punt/kick return efficiency
- **Pace of Play**: Plays per game, time of possession

### 3. Situational Factors
- **Recent Performance Trends**: Last 3-4 games momentum
- **Coaching Changes**: New coordinators, interim coaches
- **Motivation Factors**: Bowl eligibility, rivalry games, revenge games
- **Rest Advantage**: Days since last game, bye week effects

### 4. Market Intelligence
- **Line Movement**: How betting lines have moved
- **Public Betting Percentages**: Sharp vs public money
- **Steam Moves**: Sudden line movements from professional bettors

### 5. Historical Matchup Data
- **Head-to-head trends**: Last 5 meetings, home vs away splits
- **Style Matchups**: Run-heavy vs run defense, pass offense vs pass defense
- **Coaching Matchups**: How coaches perform against each other

## Immediate Improvements We Can Implement

### High Impact (Data Available)
1. **Player Impact Analysis**: QB rating, key player injury tracking
2. **Team Efficiency Metrics**: Offensive/defensive efficiency from CFBD
3. **Recent Form**: Weight recent games more heavily
4. **Coaching Records**: Head-to-head coaching performance

### Medium Impact (Requires More Data)
1. **Advanced Statistical Models**: S&P+ ratings, EPA (Expected Points Added)
2. **Situational Stats**: Performance in close games, vs ranked teams
3. **Travel Distance**: Actual miles traveled for away games

### Low Impact (Hard to Quantify)
1. **Motivation Factors**: Subjective but could add edge cases
2. **Public Perception**: Social media sentiment (already implemented)

## Research Action Items

1. **Analyze CFBD API for missing data points**
2. **Study successful betting models and their factors**
3. **Identify which factors have strongest correlation with ATS success**
4. **Test weighted combinations of multiple factors**
5. **Implement machine learning approach with multiple variables**

## Next Steps
1. **Audit CFBD API for additional data endpoints** ✅ COMPLETED
2. Implement QB performance tracking using Player PPA data
3. Add team efficiency metrics (SP+ ratings, offensive/defensive efficiency)
4. Create weighted factor scoring system
5. Re-run backtests with improved algorithm

## Available CFBD API Endpoints (Research Completed)

### High-Priority Implementations Available:
- **SP+ Ratings**: `/ratings/sp` - Bill Connelly's advanced team ratings with offensive/defensive components
- **Player PPA/EPA**: `/ppa/players/season` - Expected Points Added for individual players
- **Team Advanced Stats**: `/stats/season/advanced` - Team efficiency metrics
- **Player Usage**: `/player/usage` - Player opportunity and usage rates  
- **Team Talent**: `/talent` - Recruiting-based talent composite scores
- **Win Probability**: `/metrics/wp` - Play-by-play win probability data

### Medium-Priority Available:
- **FPI Ratings**: `/ratings/fpi` - ESPN Football Power Index
- **Game-Level PPA**: `/ppa/games` - Expected points by game
- **Returning Production**: `/player/returning` - Team returning production metrics
- **Coach Records**: `/coaches` - Head coach records and tenure data

This research shows we have access to significantly more advanced metrics than currently implemented. The next phase should focus on integrating SP+ ratings and player efficiency metrics into our prediction algorithm.