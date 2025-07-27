# Rick's Picks - Data Analysis

This directory contains Python-based data analysis scripts for comprehensive college football analytics using our 28,458-game historical dataset (2009-2024).

## Dataset Overview

- **Total Games**: 28,458 unique games across 16 seasons
- **Betting Lines**: 10,169 games with spread/over-under data
- **Weather Data**: 2015-2024 seasons with comprehensive venue/weather mapping
- **Completion Status**: All games have authentic scores from College Football Data API

## Analysis Categories

### 1. Weather Hypothesis Testing
- Temperature impact on scoring and game outcomes
- Wind effects on passing accuracy and kicking success
- Precipitation advantages for ground-based teams
- Dome vs outdoor venue performance analysis

### 2. Conference Performance Analysis
- Power 5 vs Group of 5 betting performance
- SEC dominance hypothesis testing
- Cross-conference matchup patterns
- Bowl game and playoff performance by conference

### 3. Betting Line Analysis
- Vegas spread accuracy across different scenarios
- Over/under trends by weather conditions
- Home field advantage quantification
- Late-season vs early-season betting patterns

### 4. Team Performance Analytics
- ELO rating system validation
- Momentum and streak analysis
- Injury impact quantification
- Recruiting class correlation with performance

## Data Sources

- **Primary**: PostgreSQL database with complete historical dataset
- **Weather**: OpenWeather API integration for venue conditions
- **Betting**: College Football Data API with DraftKings/Bovada priority
- **Team Stats**: CFBD API comprehensive statistics

## Python Environment

Required packages:
- pandas, numpy for data manipulation
- matplotlib, seaborn for visualization
- scipy, statsmodels for statistical testing
- psycopg2 for database connectivity
- jupyter for interactive analysis