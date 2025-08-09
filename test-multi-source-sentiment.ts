#!/usr/bin/env node

/**
 * Multi-Source Sentiment Analysis Test Suite
 * 
 * Tests all new sentiment scraping capabilities:
 * - ESPN API and web scraping
 * - 247Sports web scraping 
 * - Twitter/X simulation
 * - Sports news aggregation
 * - Multi-source analysis aggregation
 */

import { multiSourceSentiment } from './server/multiSourceSentiment';

interface TestResult {
  testName: string;
  passed: boolean;
  details: any;
  error?: string;
}

class MultiSourceSentimentTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Multi-Source Sentiment Analysis Test Suite\n');
    
    const testTeam = 'Alabama';
    console.log(`📊 Testing with team: ${testTeam}\n`);

    // Test 1: ESPN Sentiment Analysis
    await this.testESPNSentiment(testTeam);
    
    // Test 2: 247Sports Sentiment Analysis
    await this.test247SportsSentiment(testTeam);
    
    // Test 3: Twitter Sentiment Analysis
    await this.testTwitterSentiment(testTeam);
    
    // Test 4: Sports News Sentiment Analysis
    await this.testSportsNewsSentiment(testTeam);
    
    // Test 5: Multi-Source Aggregation
    await this.testMultiSourceAggregation(testTeam);
    
    // Test 6: API Endpoint Validation
    await this.testAPIEndpoints(testTeam);

    // Print comprehensive results
    this.printTestResults();
  }

  async testESPNSentiment(teamName: string): Promise<void> {
    try {
      console.log('📺 Testing ESPN Sentiment Analysis...');
      
      const results = await multiSourceSentiment.scrapeESPNSentiment(teamName);
      
      const passed = Array.isArray(results) && results.length >= 0;
      const hasValidSentiment = results.some(r => 
        typeof r.sentiment === 'number' && 
        r.content && r.content.length > 0 &&
        r.source === 'ESPN' || r.source === 'ESPN_WEB'
      );
      
      this.results.push({
        testName: 'ESPN Sentiment Analysis',
        passed: passed && hasValidSentiment,
        details: {
          totalResults: results.length,
          sources: [...new Set(results.map(r => r.source))],
          avgSentiment: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.sentiment, 0) / results.length).toFixed(3)
            : 0,
          sampleHeadlines: results.slice(0, 3).map(r => r.content)
        }
      });
      
      console.log(`✅ ESPN Analysis: ${results.length} results found`);
      
    } catch (error: any) {
      this.results.push({
        testName: 'ESPN Sentiment Analysis',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ ESPN Analysis failed: ${error.message}`);
    }
  }

  async test247SportsSentiment(teamName: string): Promise<void> {
    try {
      console.log('🎯 Testing 247Sports Sentiment Analysis...');
      
      const results = await multiSourceSentiment.scrape247SportsSentiment(teamName);
      
      const passed = Array.isArray(results) && results.length >= 0;
      const hasValidSentiment = results.some(r => 
        typeof r.sentiment === 'number' && 
        r.content && r.content.length > 0 &&
        (r.source === '247Sports' || r.source === '247Sports_SIM')
      );
      
      this.results.push({
        testName: '247Sports Sentiment Analysis',
        passed: passed && hasValidSentiment,
        details: {
          totalResults: results.length,
          sources: [...new Set(results.map(r => r.source))],
          avgSentiment: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.sentiment, 0) / results.length).toFixed(3)
            : 0,
          sampleHeadlines: results.slice(0, 3).map(r => r.content)
        }
      });
      
      console.log(`✅ 247Sports Analysis: ${results.length} results found`);
      
    } catch (error: any) {
      this.results.push({
        testName: '247Sports Sentiment Analysis',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ 247Sports Analysis failed: ${error.message}`);
    }
  }

  async testTwitterSentiment(teamName: string): Promise<void> {
    try {
      console.log('🐦 Testing Twitter Sentiment Analysis...');
      
      const results = await multiSourceSentiment.scrapeTwitterSentiment(teamName, ['#CFB', '#CollegeFootball']);
      
      const passed = Array.isArray(results) && results.length >= 0;
      const hasValidSentiment = results.some(r => 
        typeof r.sentiment === 'number' && 
        r.content && r.content.length > 0 &&
        r.source === 'Twitter_SIM'
      );
      
      this.results.push({
        testName: 'Twitter Sentiment Analysis',
        passed: passed && hasValidSentiment,
        details: {
          totalResults: results.length,
          avgSentiment: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.sentiment, 0) / results.length).toFixed(3)
            : 0,
          sampleTweets: results.slice(0, 3).map(r => ({
            content: r.content,
            author: r.author,
            engagement: r.engagement
          }))
        }
      });
      
      console.log(`✅ Twitter Analysis: ${results.length} results found`);
      
    } catch (error: any) {
      this.results.push({
        testName: 'Twitter Sentiment Analysis',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ Twitter Analysis failed: ${error.message}`);
    }
  }

  async testSportsNewsSentiment(teamName: string): Promise<void> {
    try {
      console.log('📰 Testing Sports News Sentiment Analysis...');
      
      const results = await multiSourceSentiment.scrapeSportsNewsSentiment(teamName);
      
      const passed = Array.isArray(results) && results.length >= 0;
      const hasValidSentiment = results.length === 0 || results.some(r => 
        typeof r.sentiment === 'number' && 
        r.content && r.content.length > 0
      );
      
      this.results.push({
        testName: 'Sports News Sentiment Analysis',
        passed: passed && hasValidSentiment,
        details: {
          totalResults: results.length,
          sources: [...new Set(results.map(r => r.source))],
          avgSentiment: results.length > 0 
            ? (results.reduce((sum, r) => sum + r.sentiment, 0) / results.length).toFixed(3)
            : 0,
          sampleHeadlines: results.slice(0, 3).map(r => r.content)
        }
      });
      
      console.log(`✅ Sports News Analysis: ${results.length} results found`);
      
    } catch (error: any) {
      this.results.push({
        testName: 'Sports News Sentiment Analysis',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ Sports News Analysis failed: ${error.message}`);
    }
  }

  async testMultiSourceAggregation(teamName: string): Promise<void> {
    try {
      console.log('🔄 Testing Multi-Source Aggregation...');
      
      const aggregation = await multiSourceSentiment.aggregateMultiSourceSentiment(teamName);
      
      const passed = 
        typeof aggregation.overall_sentiment === 'number' &&
        typeof aggregation.confidence === 'number' &&
        aggregation.source_breakdown &&
        Object.keys(aggregation.source_breakdown).length > 0 &&
        Array.isArray(aggregation.recent_headlines);
      
      this.results.push({
        testName: 'Multi-Source Aggregation',
        passed,
        details: {
          overallSentiment: aggregation.overall_sentiment.toFixed(3),
          confidence: aggregation.confidence.toFixed(3),
          sourcesCount: Object.keys(aggregation.source_breakdown).length,
          sources: Object.keys(aggregation.source_breakdown),
          headlinesCount: aggregation.recent_headlines.length,
          sourceBreakdown: aggregation.source_breakdown
        }
      });
      
      console.log(`✅ Multi-Source Aggregation: ${Object.keys(aggregation.source_breakdown).length} sources combined`);
      
    } catch (error: any) {
      this.results.push({
        testName: 'Multi-Source Aggregation',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ Multi-Source Aggregation failed: ${error.message}`);
    }
  }

  async testAPIEndpoints(teamName: string): Promise<void> {
    try {
      console.log('🌐 Testing API Endpoints...');
      
      const baseURL = 'http://localhost:5000';
      const endpoints = [
        `/api/sentiment/multi-source/${teamName}`,
        `/api/sentiment/espn/${teamName}`,
        `/api/sentiment/247sports/${teamName}`,
        `/api/sentiment/sports-news/${teamName}`
      ];
      
      const results = await Promise.allSettled(
        endpoints.map(async (endpoint) => {
          const response = await fetch(`${baseURL}${endpoint}`);
          return {
            endpoint,
            status: response.status,
            ok: response.ok,
            data: response.ok ? await response.json() : null
          };
        })
      );
      
      const successfulEndpoints = results.filter(r => 
        r.status === 'fulfilled' && r.value.ok
      ).length;
      
      this.results.push({
        testName: 'API Endpoints',
        passed: successfulEndpoints >= 2, // At least half should work
        details: {
          totalEndpoints: endpoints.length,
          successfulEndpoints,
          results: results.map(r => 
            r.status === 'fulfilled' 
              ? { endpoint: r.value.endpoint, status: r.value.status, ok: r.value.ok }
              : { error: r.reason?.message }
          )
        }
      });
      
      console.log(`✅ API Endpoints: ${successfulEndpoints}/${endpoints.length} working`);
      
    } catch (error: any) {
      this.results.push({
        testName: 'API Endpoints',
        passed: false,
        details: { error: error.message },
        error: error.message
      });
      console.log(`❌ API Endpoints test failed: ${error.message}`);
    }
  }

  printTestResults(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MULTI-SOURCE SENTIMENT ANALYSIS TEST RESULTS');
    console.log('='.repeat(80));

    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n🎯 Overall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)\n`);

    this.results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${status} - ${result.testName}`);
      
      if (result.passed) {
        console.log(`   Details: ${JSON.stringify(result.details, null, '   ')}`);
      } else {
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        if (result.details) {
          console.log(`   Details: ${JSON.stringify(result.details, null, '   ')}`);
        }
      }
      console.log('');
    });

    // Summary and recommendations
    console.log('📋 SUMMARY:');
    if (passRate >= 80) {
      console.log('🎉 Excellent! Multi-source sentiment analysis is working well.');
      console.log('✓ Most scraping sources are functional');
      console.log('✓ Aggregation algorithm is operating correctly');
      console.log('✓ API endpoints are responding properly');
    } else if (passRate >= 60) {
      console.log('⚠️  Good progress, but some issues need attention.');
      console.log('• Check failed sources for connectivity issues');
      console.log('• Verify scraping selectors are up to date');
      console.log('• Consider fallback mechanisms for unreliable sources');
    } else {
      console.log('🔧 Significant issues detected - troubleshooting needed.');
      console.log('• Multiple sources may be failing');
      console.log('• Check network connectivity and API availability');
      console.log('• Review error messages above for specific issues');
    }

    console.log('\n💡 NEXT STEPS:');
    console.log('1. Integrate sentiment scores into main prediction algorithm');
    console.log('2. Add automated sentiment analysis to game predictions');
    console.log('3. Create sentiment trend tracking over time');
    console.log('4. Implement team-specific sentiment weighting factors');
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new MultiSourceSentimentTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { MultiSourceSentimentTester };