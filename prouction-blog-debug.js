#!/usr/bin/env node

// Comprehensive production blog debugging
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

console.log('🔍 PRODUCTION BLOG COMPREHENSIVE DEBUG');
console.log('====================================');

const connectionString = process.env.DATABASE_URL;
console.log('Database URL exists:', !!connectionString);

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const connection = postgres(connectionString);
const db = drizzle(connection);

try {
  // 1. Test basic connection
  console.log('\n1. Testing database connection...');
  await db.execute(sql`SELECT 1 as test`);
  console.log('✅ Database connection successful');

  // 2. Check table structure
  console.log('\n2. Checking blog_posts table structure...');
  const columns = await db.execute(sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'blog_posts'
    ORDER BY ordinal_position
  `);
  console.log('✅ Table structure:');
  columns.forEach(col => {
    console.log(`   ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
  });

  // 3. Add author column if missing
  const hasAuthor = columns.some(col => col.column_name === 'author');
  if (!hasAuthor) {
    console.log('\n3. Adding missing author column...');
    await db.execute(sql`
      ALTER TABLE blog_posts
      ADD COLUMN author VARCHAR DEFAULT 'Rick''s Picks Editorial Team'
    `);
    console.log('✅ Author column added');
  } else {
    console.log('\n3. ✅ Author column exists');
  }

  // 4. Count and sample data
  console.log('\n4. Checking blog data...');
  const totalCount = await db.execute(sql`SELECT COUNT(*) as count FROM blog_posts`);
  const publishedCount = await db.execute(sql`SELECT COUNT(*) as count FROM blog_posts WHERE published = true`);
  console.log(`   Total posts: ${totalCount[0]?.count || 0}`);
  console.log(`   Published posts: ${publishedCount[0]?.count || 0}`);

  // 5. Test the exact API queries
  console.log('\n5. Testing API queries...');

  // Test posts query
  const postsQuery = await db.execute(sql`
    SELECT id, title, slug, excerpt, author, category, published, featured, created_at
    FROM blog_posts
    WHERE published = true
    ORDER BY created_at DESC
    LIMIT 3
  `);
  console.log(`✅ Posts query: ${postsQuery.length} results`);
  if (postsQuery.length > 0) {
    console.log(`   First post: "${postsQuery[0].title}" by ${postsQuery[0].author}`);
  }

  // Test featured query
  const featuredQuery = await db.execute(sql`
    SELECT id, title, featured, published
    FROM blog_posts
    WHERE published = true AND featured = true
    LIMIT 3
  `);
  console.log(`✅ Featured query: ${featuredQuery.length} results`);

  // 6. Test a simple HTTP request to our own API
  console.log('\n6. Testing internal API call...');
  try {
    const response = await fetch('http://localhost:5000/api/blog/posts');
    console.log(`   API status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log(`   API returned: ${data.length} posts`);
    } else {
      const errorText = await response.text();
      console.log(`   API error: ${errorText}`);
    }
  } catch (fetchError) {
    console.log(`   API fetch error: ${fetchError.message}`);
  }

} catch (error) {
  console.error('❌ Debug failed:', error);
} finally {
  await connection.end();
}