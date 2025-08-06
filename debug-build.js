// Simple test to check if React Query is properly installed and importable
console.log('Testing React Query import...');

try {
  const reactQuery = require('@tanstack/react-query');
  console.log('✅ React Query imported successfully');
  console.log('Available exports:', Object.keys(reactQuery));
} catch (error) {
  console.log('❌ React Query import failed:', error.message);
}

try {
  const { useQuery } = require('@tanstack/react-query');
  console.log('✅ useQuery imported successfully');
} catch (error) {
  console.log('❌ useQuery import failed:', error.message);
}