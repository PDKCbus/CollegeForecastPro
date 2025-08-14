#!/usr/bin/env node

// Add missing author column to production blog_posts table
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('🔧 Adding missing author column to production blog_posts table...');

try {
  // Add the missing author column
  await sql`
    ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS author VARCHAR DEFAULT 'Rick''s Picks Editorial Team'
  `;

  console.log('✅ Author column added successfully');

  // Update any existing posts to have the default author
  const updateResult = await sql`
    UPDATE blog_posts
    SET author = 'Rick''s Picks Editorial Team'
    WHERE author IS NULL
  `;

  console.log(`✅ Updated ${updateResult.count || 0} posts with default author`);

  // Verify the column exists
  const columns = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'blog_posts' AND column_name = 'author'
  `;

  if (columns.length > 0) {
    console.log('✅ Author column verified:');
    console.log(`   Name: ${columns[0].column_name}`);
    console.log(`   Type: ${columns[0].data_type}`);
    console.log(`   Default: ${columns[0].column_default}`);
  }

  // Test a simple select to make sure everything works
  const testQuery = await sql`
    SELECT id, title, author, published
    FROM blog_posts
    WHERE published = true
    LIMIT 1
  `;

  if (testQuery.length > 0) {
    console.log('✅ Test query successful:');
    console.log(`   Post: ${testQuery[0].title}`);
    console.log(`   Author: ${testQuery[0].author}`);
  }

  console.log('\n🚀 Production blog API should now work!');
  console.log('Test the endpoints:');
  console.log('- https://ricks-picks.football/api/blog/posts');
  console.log('- https://ricks-picks.football/api/blog/featured');

} catch (error) {
  console.error('❌ Failed to add author column:', error);
  process.exit(1);
}