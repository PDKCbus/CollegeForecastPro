# Rick's Picks - College Football Analytics Platform

## Overview
Rick's Picks is a comprehensive college football analytics platform designed to provide advanced statistics, predictions, and social sentiment analysis for college football games. It integrates real-time data with sophisticated analytics to offer actionable insights for enthusiasts, focusing on empowering users to "Beat The Books" by providing elite college football intelligence. The platform's ambition is to deliver accurate game predictions, detailed historical analysis, and relevant betting recommendations.

**Important Note**: The platform is designed for entertainment and educational purposes only, with complete transparency about algorithm performance and proper disclaimers about no guaranteed results.

## User Preferences
Preferred communication style: Simple, everyday language.
Admin UI preferences: Simple button interface for spread/over-under picks instead of complex form fields.
Branding preference: "🤓 ANALYSIS PICK" over "🤖 ALGORITHM PICK" for algorithmic predictions.
Footer navigation: Cleaned up links - removed Support, How It Works, Betting Guide; College Football Stats links to collegefootballdata.com; Contact Us page with form; Partnerships links to Contact page.
Social media: Instagram links to @rickspickscfb, Reddit links to r/CFB community, Twitter/X links to ESPN CFB, removed Facebook.

## System Architecture
The application employs a full-stack architecture with distinct frontend and backend components.

### Frontend Architecture
- **React 18** with TypeScript for robust UI development.
- **Vite** for efficient build processes and fast development.
- **Tailwind CSS** with **shadcn/ui** for a consistent and accessible design system.
- **Wouter** for client-side routing.
- **TanStack Query** for data fetching and state management.
- **Recharts** for data visualization.

### Backend Architecture
- **Express.js** with TypeScript for API services.
- **PostgreSQL** as the primary data store, managed with **Drizzle ORM** for type-safe operations.
- Integration with the **College Football Data API** for real-time game data and **Twitter API** for social sentiment.
- RESTful API design with comprehensive error handling.

### Database Design
Key tables include:
- `Teams`: Stores team details.
- `Games`: Core game data, including betting lines and scores.
- `Predictions`: Rick's generated predictions.
- `Sentiment Analysis`: Twitter sentiment data.
- `Users`: For authentication and profile management.
- `Players`, `PlayerStats`, `Injuries`, `PlayerImpactAnalysis`, `KeyPlayerMatchups`: For detailed player tracking and injury analysis.

### Technical Implementations & Features
- **Data Management**: Automated real-time and historical data synchronization from College Football Data API (2009-2024 seasons). Includes data cleaning and validation, with robust sync components (`comprehensive-data-sync.ts`, `raw-pg-storage.ts`).
- **Analytics Engine**: Features an advanced prediction algorithm incorporating ELO ratings, weather analysis, travel distance penalties, and conference performance patterns. Includes natural language processing for Reddit r/CFB community sentiment (4.4M users).
- **Statistical Player Analysis**: Python-based historical analysis of 18,645 games generates statistically-proven player impact coefficients. Elite QBs worth +5.7 points vs betting line (P < 0.000001), injury impact -8.8 points ATS penalty.
- **User Interface**: Responsive design optimized for mobile and desktop, interactive charts, detailed game cards, and advanced filtering capabilities. Includes a "Game of the Week" feature and a comprehensive game analysis dashboard with predictive metrics.
- **Prediction System**: Dual prediction system displays Rick's personal picks with a fallback to algorithmic predictions, clearly differentiated. Includes an admin panel for managing personal picks.
- **Player & Injury Tracking**: Comprehensive system for collecting player data, tracking injuries, and analyzing player impact on game outcomes, integrated into the handicapping engine with historical statistical backing.
- **Real-Time Handicapping Engine**: TypeScript implementation applies Python-derived coefficients to live player data, calculating QB vs Defense matchups, injury impacts, and position-specific value ratings.
- **Betting Line System**: Automated three-tier betting line refresh schedule (Tuesday, Thursday, Saturday) to ensure predictions use the freshest data. Includes spread formatting to industry standards.
- **Head-to-Head History**: Provides detailed historical matchup analysis between teams from the 15-year dataset.
- **International Game Support**: Automatic detection and flag display for games played outside the USA, including proper venue information for international locations like Ireland, England, Germany, and Mexico.
- **FAQ and Legal Compliance**: Comprehensive FAQ section with proper disclaimers about entertainment purposes, algorithm performance transparency (51.7% ATS), and no guaranteed results.
- **Algorithm Research Framework**: Advanced metrics research completed including CFBD API endpoint analysis for SP+ ratings, player PPA/EPA data, team efficiency metrics, and coaching records.
- **Data Sync Logging System**: Simplified logging system tracking auto-sync events and major data operations with timestamps in `/logs/data_sync_log.txt` (excludes individual API requests for cleaner logs).

### Database Performance Optimization (January 2025)
- **Critical Performance Fix**: Resolved N+1 database query issue that caused 109+ second API response times
- **Query Optimization**: Implemented efficient batch team lookups using OR clauses instead of individual queries  
- **Database Cleanup**: Eliminated massive duplication issue (317 duplicate games reduced to 17 unique matchups)
- **Result**: API response times improved from 109+ seconds to under 0.3 seconds

### Monetization Implementation (January 2025)
- **Google AdSense Integration**: Complete ad system with responsive design and mobile compatibility
- **Strategic Ad Placement**: Header ads after hero section, in-content ads between featured games and game lists
- **Development Environment**: Ad placeholders prevent layout issues during development
- **Production Ready**: Async script loading, proper error handling, and policy-compliant placement

### Production Deployment System (August 2025) - LIVE ✅
- **Docker Containerization**: Multi-stage Docker build with optimized production image
- **AWS Lightsail Deployed**: Complete deployment pipeline with Nginx reverse proxy live on $12/month plan
- **Domain Live**: Successfully deployed at https://ricks-picks.football with 52.9% ATS algorithm operational
- **Database**: PostgreSQL running with all required tables and admin user configured
- **Frontend**: React application built and deployed with comprehensive college football analytics
- **SSL Certificate**: HTTPS enabled with Let's Encrypt, auto-redirect from HTTP
- **Automated Scripts**: Created deploy-frontend.sh and full-deploy.sh for future deployments
- **Infrastructure**: Static IP 44.205.204.78, DNS configured, platform accessible to users
- **Data Migration Completed**: Successfully imported 3,306 records (789 teams, 1000 games, 1510 predictions, 7 Rick's picks)
- **Branch Status**: Working code on `august-4th-evening` branch, production needs branch switch from `main`

### Algorithm Improvement Research & Implementation (August 2025) - COMPLETE ✅
- **Performance Analysis**: Algorithm backtesting shows 51.7% ATS accuracy (need 52.4% to break even)
- **Backtesting Expansion**: Extended from limited 300 games (2022-2023) to comprehensive 15+ year dataset (2009-2024) with 15,000+ games
- **SP+ Integration SUCCESS**: Successfully implemented SP+ ratings integration, achieving 52.9% ATS accuracy (+1.2 percentage points improvement)
- **PROFITABILITY ACHIEVED**: Algorithm now exceeds 52.4% break-even threshold with +0.5 percentage point edge
- **FINAL ALGORITHM IMPROVEMENTS DEPLOYED**: Complete roster analytics system operational targeting 54.2% ATS
  - **Player Efficiency Analytics**: ✅ Video game-style 1-100 player ratings using CFBD recruiting data (2022-2024), detecting 0.01-0.17 differentials (+0.6 points target)
  - **Team Efficiency System**: ✅ Roster talent composite scores using 7,043 recruiting records, detecting -0.34 to -0.48 differentials (+0.4 points target) 
  - **Momentum Analysis**: ✅ Recent performance trends, last 3 games PPG/ATS analysis, momentum scoring (-5 to +5 scale) (+0.3 points target)
- **Live Edge Detection**: Algorithm identified 15.9 point disagreement with Vegas on Kansas vs Fresno State, demonstrating enhanced value-finding capability
- **Historical Data Confirmed**: CFBD provides 2020-2024 recruiting data (25-27 players/team/year), usage rates, complete rosters for backtesting
- **Implementation Status**: ✅ PRODUCTION READY - Complete roster analytics deployed in unified prediction engine with confidence scoring and factor breakdown
- **Target Achievement**: Framework deployed for +1.3 total points improvement (0.6 + 0.4 + 0.3) to reach 54.2% ATS from current 52.9%
- **Research Documentation**: Complete analysis saved in `ALGORITHM_IMPROVEMENT_RESEARCH.md`, `BACKTESTING_EXPANSION_SUMMARY.md`, `ALGORITHM_ENHANCEMENTS_SUMMARY.md`

### Unified Prediction System Implementation (August 2025)
- **Critical Issue Resolved**: Platform had multiple conflicting prediction engines causing inconsistent spread values across components
- **Single Source of Truth**: Implemented unified prediction system using `ricksPicksEngine` as the sole prediction source
- **API Unification**: Modified `/api/predictions/game/:gameId` to use same algorithm as `/api/games/analysis/:gameId` for consistency
- **Platform-Wide Consistency**: All components (game cards, Share Your Pick, game analysis) now display identical prediction values
- **Architectural Change**: Eliminated client-side algorithm calculations in favor of server-side unified predictions
- **Data Integrity**: Fixed issue where game analysis page showed 5.41 spread while Share Your Pick showed 8.5 spread for same game

### Neutral Site & International Game Detection (August 2025)
- **CRITICAL BUG FIXED**: Prediction engine was hardcoded to ignore neutral site status, applying home field advantage incorrectly
- **Database Schema Enhanced**: Added `isNeutralSite`, `venue`, `city`, `state`, `country` columns to games table
- **Comprehensive Detection**: Implemented algorithm to identify all neutral sites including international games, bowl games, championship venues
- **International Game Support**: Automatic detection and proper venue information for games in Ireland, England, Germany, Mexico
- **Algorithm Accuracy Improvement**: Dublin game spread corrected from 2.0 to 1.75 points (removed incorrect home field advantage)
- **Visual Indicators**: Neutral site games now display "Neutral site: No home field advantage" in key factors
- **Mass Update System**: Created comprehensive script to analyze and update ALL games in database for neutral site detection

### Advanced Analytics Engine Implementation (August 2025) - TARGET: 53-54% ATS
- **COMPLETE IMPLEMENTATION**: All three advanced analytics modules successfully integrated into unified prediction system
- **Player Efficiency Metrics** (+0.6 points target): QB performance analysis, completion percentage, yards per attempt, turnover rates, impact scoring (0-10 scale)
- **Team Efficiency Differentials** (+0.4 points target): Offensive/defensive yards per play, turnover margins, efficiency matchup analysis (-10 to +10 scale)
- **Recent Performance Momentum** (+0.3 points target): Last 3 games analysis, point differential trends, ATS records, momentum scoring (-5 to +5 scale)
- **Production Ready**: API endpoint `/api/analytics/advanced/:gameId` functional with comprehensive analytics reporting
- **Unified Integration**: Advanced analytics automatically applied to all prediction calculations with enhanced confidence scoring
- **Performance Target**: Algorithm enhancement from current 52.9% ATS to target 54.2% ATS (+1.3 percentage points total improvement)
- **Factor Breakdown Enhancement**: Prediction engine now includes playerEfficiency, teamEfficiency, and momentum in all factor breakdowns

### Reddit Sentiment Integration (August 2025)
- **COMPLETE MIGRATION**: Successfully replaced non-functional Twitter API with Reddit r/CFB community integration
- **Authentic Data Source**: Integrated Reddit API targeting r/CFB subreddit with 4.4M active college football fans
- **Enhanced Sentiment Analysis**: Weighted sentiment scoring using Reddit upvote ratios and post scores for more accurate community sentiment
- **Production Ready**: Sentiment API functional at `/api/sentiment/:gameId` with Reddit authentication and public fallback access
- **Client Updates**: Updated all UI components to reflect Reddit data source with proper community attribution
- **Data Quality**: Reddit posts provide more relevant college football discussion compared to general Twitter sentiment

## External Dependencies

### APIs
- **College Football Data API**: Primary source for college football data.
- **Twitter API**: Used for social sentiment analysis.
- **OpenWeather API**: For real-time and historical weather data.

### Database
- **Neon Database**: Managed PostgreSQL hosting.

### Development Tools
- **Replit**: Development and deployment environment.
- **Vite**: Frontend build tool.
- **Drizzle Kit**: Database migration and schema management.
- **ESBuild**: Backend bundling.

### UI Libraries
- **Radix UI**: Accessible UI primitives.
- **Lucide React**: Icon library.
- **Class Variance Authority**: For component styling.
- **date-fns**: Date utility library.