#!/usr/bin/env node

// Add author column via the same database connection the app uses
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const connection = postgres(connectionString);
const db = drizzle(connection);

console.log('🔧 Adding missing author column to production blog_posts...');

try {
  // Add the missing author column using raw SQL
  await db.execute(sql`
    ALTER TABLE blog_posts
    ADD COLUMN IF NOT EXISTS author VARCHAR DEFAULT 'Rick''s Picks Editorial Team'
  `);

  console.log('✅ Author column added successfully');

  // Update any existing posts
  await db.execute(sql`
    UPDATE blog_posts
    SET author = 'Rick''s Picks Editorial Team'
    WHERE author IS NULL OR author = ''
  `);

  console.log('✅ Updated existing posts with default author');

  // Test the query that was failing
  const testPosts = await db.execute(sql`
    SELECT id, title, author, published
    FROM blog_posts
    WHERE published = true
    LIMIT 2
  `);

  console.log(`✅ Test query successful - found ${testPosts.length} published posts`);
  if (testPosts.length > 0) {
    console.log(`   First post: "${testPosts[0].title}" by ${testPosts[0].author}`);
  }

  console.log('\n🚀 Production blog API should now work!');

} catch (error) {
  console.error('❌ Failed to add author column:', error);
} finally {
  await connection.end();
}