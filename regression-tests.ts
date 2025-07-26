#!/usr/bin/env tsx
/**
 * REGRESSION TEST SUITE
 * 
 * Comprehensive automated checks to prevent common issues from recurring.
 * Run this before any deployment or major changes.
 * 
 * Usage: tsx regression-tests.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  critical: boolean;
}

class RegressionTester {
  private results: TestResult[] = [];
  private baseUrl = 'http://localhost:5000';

  async runAllTests(): Promise<void> {
    console.log('🔍 Starting Regression Test Suite...\n');

    // Database integrity tests
    await this.testDuplicateGames();
    await this.testUnknownTeams();
    await this.testGameCompletionConsistency();
    await this.testBettingLinesIntegrity();

    // API endpoint tests
    await this.testUpcomingGamesAPI();
    await this.testFeaturedGameAPI();
    await this.testGameAnalysisAPI();
    await this.testTeamsAPI();

    // Frontend component tests
    await this.testGameAnalysisComponent();
    await this.testHomepageLoading();

    // Data consistency tests
    await this.testTeamMappingConsistency();
    await this.testSeasonDataConsistency();

    this.printResults();
  }

  private async testDuplicateGames(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT 
            COUNT(*) as total_games,
            COUNT(DISTINCT CONCAT(home_team_id, '-', away_team_id, '-', season, '-', week)) as unique_matchups
          FROM games 
          WHERE completed = false;
        " -t
      `);
      
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const result = lines[lines.length - 1].trim().split('|');
      const totalGames = parseInt(result[0].trim());
      const uniqueMatchups = parseInt(result[1].trim());

      this.addResult({
        name: 'No Duplicate Upcoming Games',
        passed: totalGames === uniqueMatchups,
        message: `Total: ${totalGames}, Unique: ${uniqueMatchups}`,
        critical: true
      });
    } catch (error) {
      this.addResult({
        name: 'No Duplicate Upcoming Games',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: true
      });
    }
  }

  private async testUnknownTeams(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT COUNT(*) FROM games g
          JOIN teams t1 ON g.home_team_id = t1.id
          JOIN teams t2 ON g.away_team_id = t2.id
          WHERE (t1.name = 'Unknown Team' OR t2.name = 'Unknown Team')
          AND g.completed = false;
        " -t
      `);
      
      const unknownCount = parseInt(stdout.trim());

      this.addResult({
        name: 'No Unknown Team Games',
        passed: unknownCount === 0,
        message: `Found ${unknownCount} games with Unknown Team`,
        critical: true
      });
    } catch (error) {
      this.addResult({
        name: 'No Unknown Team Games',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: true
      });
    }
  }

  private async testGameCompletionConsistency(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT COUNT(*) FROM games 
          WHERE completed = true 
          AND (home_team_score IS NULL OR away_team_score IS NULL);
        " -t
      `);
      
      const inconsistentCount = parseInt(stdout.trim());

      this.addResult({
        name: 'Completed Games Have Scores',
        passed: inconsistentCount === 0,
        message: `Found ${inconsistentCount} completed games without scores`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Completed Games Have Scores',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: false
      });
    }
  }

  private async testBettingLinesIntegrity(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT 
            COUNT(*) as total_completed,
            COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) as with_spreads,
            ROUND(100.0 * COUNT(CASE WHEN spread IS NOT NULL THEN 1 END) / COUNT(*), 1) as coverage_percent
          FROM games 
          WHERE completed = true;
        " -t
      `);
      
      const result = stdout.trim().split('|');
      const coveragePercent = parseFloat(result[2].trim());

      this.addResult({
        name: 'Betting Lines Coverage Adequate',
        passed: coveragePercent >= 5.0, // At least 5% coverage
        message: `Coverage: ${coveragePercent}%`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Betting Lines Coverage Adequate',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: false
      });
    }
  }

  private async testUpcomingGamesAPI(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/games/upcoming?limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hasGames = data.games && Array.isArray(data.games) && data.games.length > 0;
      const hasValidStructure = data.games.every((game: any) => 
        game.id && game.homeTeam && game.awayTeam && game.homeTeam.name && game.awayTeam.name
      );

      this.addResult({
        name: 'Upcoming Games API Working',
        passed: hasGames && hasValidStructure,
        message: `Returned ${data.games?.length || 0} games with valid structure: ${hasValidStructure}`,
        critical: true
      });
    } catch (error) {
      this.addResult({
        name: 'Upcoming Games API Working',
        passed: false,
        message: `API request failed: ${error}`,
        critical: true
      });
    }
  }

  private async testFeaturedGameAPI(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/games/featured`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hasValidGame = data.id && data.homeTeam && data.awayTeam;

      this.addResult({
        name: 'Featured Game API Working',
        passed: hasValidGame,
        message: `Featured game: ${data.awayTeam?.name || 'Unknown'} @ ${data.homeTeam?.name || 'Unknown'}`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Featured Game API Working',
        passed: false,
        message: `API request failed: ${error}`,
        critical: false
      });
    }
  }

  private async testGameAnalysisAPI(): Promise<void> {
    try {
      // Test with a known game ID
      const response = await fetch(`${this.baseUrl}/api/games/analysis/1`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hasValidAnalysis = data.predictiveMetrics && data.homeTeamAnalytics && data.awayTeamAnalytics;

      this.addResult({
        name: 'Game Analysis API Working',
        passed: hasValidAnalysis,
        message: `Analysis available with win probability: ${data.predictiveMetrics?.winProbability || 'N/A'}`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Game Analysis API Working',
        passed: false,
        message: `API request failed: ${error}`,
        critical: false
      });
    }
  }

  private async testTeamsAPI(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/teams`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hasTeams = Array.isArray(data) && data.length > 0;
      const hasValidTeams = data.every((team: any) => team.id && team.name && team.name !== 'Unknown Team');

      this.addResult({
        name: 'Teams API Working',
        passed: hasTeams && hasValidTeams,
        message: `Found ${data.length} teams, all with valid names`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Teams API Working',
        passed: false,
        message: `API request failed: ${error}`,
        critical: false
      });
    }
  }

  private async testGameAnalysisComponent(): Promise<void> {
    // This would require more sophisticated frontend testing
    // For now, we'll just check that the game analysis endpoint responds
    try {
      const response = await fetch(`${this.baseUrl}/api/games/1`);
      const hasValidResponse = response.ok;

      this.addResult({
        name: 'Game Analysis Component Data Available',
        passed: hasValidResponse,
        message: `Individual game endpoint responding: ${response.status}`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Game Analysis Component Data Available',
        passed: false,
        message: `Component test failed: ${error}`,
        critical: false
      });
    }
  }

  private async testHomepageLoading(): Promise<void> {
    try {
      // Test multiple endpoints that the homepage depends on
      const upcomingResponse = await fetch(`${this.baseUrl}/api/games/upcoming?limit=1`);
      const featuredResponse = await fetch(`${this.baseUrl}/api/games/featured`);
      
      const upcomingOk = upcomingResponse.ok;
      const featuredOk = featuredResponse.ok;

      this.addResult({
        name: 'Homepage Dependencies Working',
        passed: upcomingOk && featuredOk,
        message: `Upcoming: ${upcomingResponse.status}, Featured: ${featuredResponse.status}`,
        critical: true
      });
    } catch (error) {
      this.addResult({
        name: 'Homepage Dependencies Working',
        passed: false,
        message: `Homepage test failed: ${error}`,
        critical: true
      });
    }
  }

  private async testTeamMappingConsistency(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT COUNT(*) FROM games g
          WHERE g.home_team_id = g.away_team_id;
        " -t
      `);
      
      const selfPlayingCount = parseInt(stdout.trim());

      this.addResult({
        name: 'No Teams Playing Themselves',
        passed: selfPlayingCount === 0,
        message: `Found ${selfPlayingCount} games where team plays itself`,
        critical: true
      });
    } catch (error) {
      this.addResult({
        name: 'No Teams Playing Themselves',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: true
      });
    }
  }

  private async testSeasonDataConsistency(): Promise<void> {
    try {
      const { stdout } = await execAsync(`
        psql "${process.env.DATABASE_URL}" -c "
          SELECT COUNT(*) FROM games 
          WHERE season < 2009 OR season > 2025 OR week < 1 OR week > 20;
        " -t
      `);
      
      const invalidDataCount = parseInt(stdout.trim());

      this.addResult({
        name: 'Season Data Within Valid Ranges',
        passed: invalidDataCount === 0,
        message: `Found ${invalidDataCount} games with invalid season/week data`,
        critical: false
      });
    } catch (error) {
      this.addResult({
        name: 'Season Data Within Valid Ranges',
        passed: false,
        message: `Database query failed: ${error}`,
        critical: false
      });
    }
  }

  private addResult(result: TestResult): void {
    this.results.push(result);
  }

  private printResults(): void {
    console.log('\n📊 REGRESSION TEST RESULTS\n');
    console.log('=' .repeat(60));

    const criticalTests = this.results.filter(r => r.critical);
    const nonCriticalTests = this.results.filter(r => !r.critical);

    console.log('\n🚨 CRITICAL TESTS:');
    criticalTests.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });

    console.log('\n📋 NON-CRITICAL TESTS:');
    nonCriticalTests.forEach(result => {
      const status = result.passed ? '✅' : '⚠️';
      console.log(`${status} ${result.name}: ${result.message}`);
    });

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const criticalFailures = criticalTests.filter(r => !r.passed).length;

    console.log('\n' + '=' .repeat(60));
    console.log(`📈 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (criticalFailures > 0) {
      console.log(`🚨 ${criticalFailures} CRITICAL failures detected!`);
      console.log('❌ DO NOT DEPLOY until critical issues are resolved.');
      process.exit(1);
    } else {
      console.log('✅ All critical tests passed - safe to deploy!');
      process.exit(0);
    }
  }
}

// Auto-run if called directly
const tester = new RegressionTester();
tester.runAllTests().catch(console.error);

export { RegressionTester };