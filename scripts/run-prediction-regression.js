#!/usr/bin/env node
/**
 * Prediction Engine Regression Test Runner
 * Run this before any production deployments to ensure algorithm accuracy
 */

const { spawn } = require('child_process');
const path = require('path');

async function runRegressionTests() {
  console.log('🧪 Starting Prediction Engine Regression Tests...');
  console.log('=' * 60);

  const testProcess = spawn('npm', ['test', '--', 'tests/prediction-engine-regression.test.js'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
  });

  return new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ All regression tests passed!');
        console.log('🚀 Algorithm is ready for production deployment');
        resolve(true);
      } else {
        console.log('\n❌ Regression tests failed!');
        console.log('⚠️  Do not deploy to production until issues are resolved');
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    testProcess.on('error', (error) => {
      console.error('Error running tests:', error);
      reject(error);
    });
  });
}

// Command line execution
if (require.main === module) {
  runRegressionTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runRegressionTests };