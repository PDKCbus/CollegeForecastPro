# Rick's Picks - College Football Analytics Platform

## Overview
Rick's Picks is a comprehensive college football analytics platform providing advanced statistics, predictions, and social sentiment analysis for college football games. Its purpose is to offer actionable insights to empower users with elite college football intelligence for entertainment and educational purposes, with a clear focus on transparency regarding algorithm performance and disclaimers about results. The platform aims to deliver accurate game predictions, detailed historical analysis, and relevant betting recommendations.

## User Preferences
Preferred communication style: Simple, everyday language.
Admin UI preferences: Simple button interface for spread/over-under picks instead of complex form fields.
Branding preference: "🤓 ANALYSIS PICK" over "🤖 ALGORITHM PICK" for algorithmic predictions.
Footer navigation: Cleaned up links - removed Support, How It Works, Betting Guide; College Football Stats links to collegefootballdata.com; Contact Us page with form; Partnerships links to Contact page.
Social media: Instagram links to @rickspickscfb, Reddit links to r/CFB community, Twitter/X links to ESPN CFB, removed Facebook.

## System Architecture
The application employs a full-stack architecture with distinct frontend and backend components.

### Frontend Architecture
- **React 18** with TypeScript.
- **Vite** for build processes.
- **Tailwind CSS** with **shadcn/ui** for design.
- **Wouter** for client-side routing.
- **TanStack Query** for data fetching.
- **Recharts** for data visualization.

### Backend Architecture
- **Express.js** with TypeScript for API services.
- **PostgreSQL** with **Drizzle ORM**.
- Integration with College Football Data API and Reddit API.
- RESTful API design.

### Database Design
Key tables include `Teams`, `Games`, `Predictions`, `Sentiment Analysis`, `Users`, `Players`, `PlayerStats`, `Injuries`, `PlayerImpactAnalysis`, and `KeyPlayerMatchups`.

### Technical Implementations & Features
- **Data Management**: Automated real-time and historical data synchronization from College Football Data API (2009-2024 seasons), including data cleaning and validation.
- **Analytics Engine**: Advanced prediction algorithm incorporating ELO ratings, weather analysis, travel distance penalties, conference performance patterns, and natural language processing for Reddit r/CFB community sentiment.
- **Statistical Player Analysis**: Python-based historical analysis generating statistically-proven player impact coefficients.
- **User Interface**: Responsive design with interactive charts, detailed game cards, advanced filtering, "Game of the Week," and a comprehensive game analysis dashboard.
- **Prediction System**: Dual system displaying Rick's personal picks and algorithmic predictions, with an admin panel.
- **Player & Injury Tracking**: Comprehensive system for collecting player data, tracking injuries, and analyzing player impact.
- **Real-Time Handicapping Engine**: TypeScript implementation applying Python-derived coefficients to live player data.
- **Betting Line System**: Automated three-tier betting line refresh schedule.
- **Head-to-Head History**: Detailed historical matchup analysis.
- **International Game Support**: Automatic detection and flag display for games played outside the USA, with proper venue information.
- **FAQ and Legal Compliance**: Comprehensive FAQ with disclaimers about entertainment purposes and algorithm transparency.
- **Algorithm Enhancements**: Integration of SP+ ratings, player efficiency analytics, team efficiency differentials, and momentum analysis to target improved ATS accuracy.
- **Unified Prediction System**: Centralized prediction logic using `ricksPicksEngine` for platform-wide consistency, moving calculations server-side.
- **Neutral Site & International Game Detection**: Algorithm to identify and correctly handle neutral site games, including international venues, in prediction calculations.
- **Reddit Sentiment Integration**: Replaced Twitter API with Reddit r/CFB community integration for sentiment analysis, utilizing weighted scoring based on upvotes and post scores.
- **Admin Security System**: Comprehensive authentication middleware protecting all administrative endpoints (data sync, team updates, historical collection) with Bearer token authentication.
- **Team Logo Fallback System**: Professional American football helmet SVG graphics with team abbreviations automatically replace broken ESPN CDN logos to eliminate 400 errors and maintain visual consistency.
- **Unified Prediction Consistency**: Centralized prediction logic ensures identical recommendations across all UI components (green badges, recommendation tabs, API endpoints) with comprehensive integration testing to prevent display inconsistencies.
- **Critical Betting Logic Fix (Aug 2025)**: Resolved betting recommendation engine bug where significant edges (5+ points) showed "No Strong Edge". Fixed edge calculation to properly handle opposite-side predictions by adding magnitudes instead of subtracting, enabling proper identification of valuable betting opportunities.
- **Database Integrity Cleanup (Aug 2025)**: Removed 2,772 duplicate and invalid game entries (including 45 duplicate Montana State vs Idaho games) to eliminate frontend display issues and ensure clean data presentation.
- **Component Consolidation (Aug 7, 2025)**: Merged duplicate `ImprovedHistoricalGameCard` into `HistoricalGameCard` with enhanced features including helmet logo fallback system, TypeScript safety improvements, and production-ready error handling. Fixed Docker build export issue by adding both named and default exports. Files modified: `client/src/components/historical-game-card.tsx` (replaced with dual exports), `client/src/pages/historical.tsx` (import updated), deleted duplicate components and temporary files.
- **Critical Betting Logic Fix & Test Framework (Aug 7, 2025)**: Fixed major bug where underdog value bets showed "Analysis Pending" instead of proper recommendations. Created comprehensive `betting-logic-test.ts` regression test suite covering all betting scenarios (opposite sides, same side stronger/weaker, underdog value, edge cases). Test framework validates 8 critical scenarios and blocks deployment if betting logic fails. Added `test-betting-logic.sh` executable script for easy testing during development. Algorithm now correctly identifies underdog value when Vegas has larger spreads than our predictions on the same side.
- **Multi-Source Sentiment Analysis System (Aug 9, 2025)**: Built comprehensive sentiment analysis system targeting ESPN, 247Sports, Twitter/X, and sports news outlets. Features advanced aggregation engine with confidence scoring, source weighting, and professional frontend interface with interactive tabs. Added new API endpoints for both individual source analysis (`/api/sentiment/espn/:team`) and combined multi-source insights (`/api/sentiment/multi-source/:team`). Integrated "Multi-Source" navigation link in header menu. System provides weighted overall sentiment scores with detailed source-specific breakdowns for enhanced college football team analysis.
- **August-9 Branch Deployment Merge (Aug 9, 2025)**: Successfully merged main branch deployment infrastructure into august-9 development branch. Updated Dockerfile to use proper multi-stage build process, created database initialization script, and preserved all multi-source sentiment analysis features. Resolved 133+ file conflicts by accepting deployment changes from main while maintaining development functionality. Branch now production-ready with both deployment infrastructure and new sentiment analysis capabilities.

## External Dependencies

### APIs
- **College Football Data API**: Primary source for college football data.
- **Reddit API**: For social sentiment analysis.
- **OpenWeather API**: For weather data.

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