# Rick's Picks - College Football Analytics Platform

## Overview

Rick's Picks is a comprehensive college football analytics platform that provides advanced statistics, predictions, and social sentiment analysis for college football games. The application combines real-time data from the College Football Data API with sophisticated analytics to deliver actionable insights for college football enthusiasts.

## System Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** with **shadcn/ui** components for consistent, accessible UI design
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient data fetching, caching, and synchronization
- **Recharts** for data visualization and analytics charts

### Backend Architecture
- **Express.js** server with TypeScript for API endpoints
- **PostgreSQL** database for persistent data storage
- **Drizzle ORM** for type-safe database operations and migrations
- **College Football Data API** integration for real-time game data
- **Twitter API** integration for social sentiment analysis
- RESTful API design with proper error handling and logging

### Database Design
- **Teams table**: Stores team information including logos, conferences, and records
- **Games table**: Central table for game data with betting lines and scores
- **Predictions table**: Rick's predictions with confidence scores and reasoning
- **Sentiment Analysis table**: Twitter sentiment data linked to games and teams
- **Users table**: User authentication and profile management

## Key Components

### Data Management
- **Real-time Data Sync**: Automated fetching from College Football Data API
- **Historical Data Import**: Bulk import functionality for past seasons (2009-2024)
- **Data Cleaning Pipeline**: Robust data validation and normalization
- **Multiple Storage Implementations**: PostgreSQL with fallback direct SQL operations

### Analytics Engine
- **Prediction Algorithm**: Advanced statistical models for game predictions
- **Sentiment Analysis**: Twitter sentiment processing using natural language processing
- **Performance Tracking**: Rick's historical prediction accuracy tracking
- **Betting Line Integration**: Real-time spread and over/under data

### User Interface
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Interactive Charts**: Real-time data visualization for trends and analytics
- **Game Cards**: Rich game information with team logos, records, and predictions
- **Filter System**: Advanced filtering by week, conference, and game type

## Data Flow

1. **Data Ingestion**: College Football Data API provides game schedules, scores, and betting lines
2. **Data Processing**: Server-side cleaning and validation before database storage
3. **Prediction Generation**: Analytics engine processes historical data to generate predictions
4. **Sentiment Analysis**: Twitter API integration analyzes social media sentiment
5. **Client Updates**: Real-time data synchronization using TanStack Query
6. **User Interaction**: Interactive UI allows filtering, analysis, and prediction viewing

## External Dependencies

### APIs
- **College Football Data API**: Primary data source for games, teams, and betting lines
- **Twitter API**: Social sentiment analysis and trending topic monitoring
- **Neon Database**: Managed PostgreSQL hosting with connection pooling

### Development Tools
- **Replit**: Development environment with integrated deployment
- **Vite**: Build tool with hot module replacement
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundling for production

### UI Libraries
- **Radix UI**: Accessible primitive components
- **Lucide React**: Modern icon library
- **Class Variance Authority**: Type-safe component variants
- **date-fns**: Date manipulation and formatting

## Deployment Strategy

### Development
- **Local Development**: Vite dev server with hot reloading
- **Database Migrations**: Drizzle Kit for schema management
- **Environment Variables**: Secure API key and database credential management

### Production
- **Static Assets**: Vite build output served from `dist/public`
- **Server Bundle**: ESBuild creates optimized Node.js bundle
- **Database**: Neon PostgreSQL with connection pooling
- **Environment**: Production-ready with proper error handling and logging

### Build Process
1. **Frontend Build**: Vite processes React components and assets
2. **Server Build**: ESBuild bundles Express server with dependencies
3. **Database Setup**: Drizzle migrations ensure schema consistency
4. **Asset Optimization**: Automatic minification and compression

## Changelog

Changelog:
- July 03, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.