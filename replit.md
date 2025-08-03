# Rick's Picks - College Football Analytics Platform

## Overview
Rick's Picks is a comprehensive college football analytics platform designed to provide advanced statistics, predictions, and social sentiment analysis for college football games. It integrates real-time data with sophisticated analytics to offer actionable insights for enthusiasts, focusing on empowering users to "Beat The Books" by providing elite college football intelligence. The platform's ambition is to deliver accurate game predictions, detailed historical analysis, and relevant betting recommendations.

**Important Note**: The platform is designed for entertainment and educational purposes only, with complete transparency about algorithm performance and proper disclaimers about no guaranteed results.

## User Preferences
Preferred communication style: Simple, everyday language.
Admin UI preferences: Simple button interface for spread/over-under picks instead of complex form fields.
Branding preference: "🤓 ANALYSIS PICK" over "🤖 ALGORITHM PICK" for algorithmic predictions.

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
- **Analytics Engine**: Features an advanced prediction algorithm incorporating ELO ratings, weather analysis, travel distance penalties, and conference performance patterns. Includes natural language processing for Twitter sentiment.
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

### Production Deployment System (January 2025)
- **Docker Containerization**: Multi-stage Docker build with optimized production image
- **AWS Lightsail Ready**: Complete deployment pipeline with Nginx reverse proxy and SSL
- **Automated Monitoring**: Health checks, database backups, and system monitoring scripts
- **CI/CD Scripts**: One-command deployment, backup, and monitoring automation
- **Production Infrastructure**: PostgreSQL database, SSL certificates, and performance optimization

### Algorithm Improvement Research & Implementation (August 2025)
- **Performance Analysis**: Algorithm backtesting shows 51.7% ATS accuracy (need 52.4% to break even)
- **Backtesting Expansion**: Extended from limited 300 games (2022-2023) to comprehensive 15+ year dataset (2009-2024) with 15,000+ games
- **SP+ Integration SUCCESS**: Successfully implemented SP+ ratings integration, achieving 52.9% ATS accuracy (+1.2 percentage points improvement)
- **PROFITABILITY ACHIEVED**: Algorithm now exceeds 52.4% break-even threshold with +0.5 percentage point edge
- **Available Advanced Metrics**: Research completed on CFBD API endpoints including SP+ ratings, player PPA/EPA, team efficiency metrics
- **Implementation Status**: SP+ integration deployed and functional with API endpoints `/api/predictions/enhanced/:gameId` and `/api/sp-plus/test`
- **Roadmap to 53-54% ATS**: Additional improvements identified (+Player Metrics: 0.6pts, +Team Efficiency: 0.4pts, +Recent Form: 0.3pts)
- **Research Documentation**: Complete analysis saved in `ALGORITHM_IMPROVEMENT_RESEARCH.md`, `BACKTESTING_EXPANSION_SUMMARY.md`, and `simple-sp-plus-demo.ts`

### Unified Prediction System Implementation (August 2025)
- **Critical Issue Resolved**: Platform had multiple conflicting prediction engines causing inconsistent spread values across components
- **Single Source of Truth**: Implemented unified prediction system using `ricksPicksEngine` as the sole prediction source
- **API Unification**: Modified `/api/predictions/game/:gameId` to use same algorithm as `/api/games/analysis/:gameId` for consistency
- **Platform-Wide Consistency**: All components (game cards, Share Your Pick, game analysis) now display identical prediction values
- **Architectural Change**: Eliminated client-side algorithm calculations in favor of server-side unified predictions
- **Data Integrity**: Fixed issue where game analysis page showed 5.41 spread while Share Your Pick showed 8.5 spread for same game

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