#!/usr/bin/env node

// Simple production blog fix using raw SQL
const { Client } = require('pg');

console.log('🔧 Production Blog Database Fix');
console.log('==============================');

async function fixProductionBlog() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to production database');

    // Check if author column exists
    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'blog_posts' AND column_name = 'author'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding missing author column...');
      await client.query(`
        ALTER TABLE blog_posts
        ADD COLUMN author VARCHAR DEFAULT 'Rick''s Picks Editorial Team'
      `);
      console.log('✅ Author column added');
    } else {
      console.log('✅ Author column already exists');
    }

    // Test the blog query
    const testQuery = await client.query(`
      SELECT id, title, author, published
      FROM blog_posts
      WHERE published = true
      LIMIT 3
    `);

    console.log(`✅ Found ${testQuery.rows.length} published blog posts`);
    if (testQuery.rows.length > 0) {
      console.log(`   First post: "${testQuery.rows[0].title}"`);
      console.log(`   Author: "${testQuery.rows[0].author}"`);
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error.message);

    // Fallback: Just test if we can read the data without author
    try {
      const fallbackQuery = await client.query(`
        SELECT id, title, published, created_at
        FROM blog_posts
        WHERE published = true
        LIMIT 1
      `);
      console.log('✅ Fallback query successful - blog data exists');
      console.log('   The API routes have been updated to work without author column');
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError.message);
    }
  } finally {
    await client.end();
  }
}

fixProductionBlog();