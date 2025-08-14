/**
 * Debug Production Blog API
 * Run this with: docker-compose --env-file .env.production exec app node debug-production-blog-api.js
 */

import { Client } from 'pg';

async function debugProductionBlogAPI() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to production database');

    // Check table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'blog_posts'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Production blog_posts table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Test the exact query that the API uses
    console.log('\n🔍 Testing API query...');
    const apiQuery = `
      SELECT
        id, title, slug, excerpt, content, category, tags, published, featured,
        seo_title, seo_description, view_count, created_at, published_at
      FROM blog_posts
      WHERE published = true
      ORDER BY created_at DESC
    `;

    const { rows: posts } = await client.query(apiQuery);
    console.log(`✓ Query returned ${posts.length} published posts`);

    // Show first post details
    if (posts.length > 0) {
      console.log('\n📝 First post sample:');
      const firstPost = posts[0];
      console.log(`  ID: ${firstPost.id}`);
      console.log(`  Title: ${firstPost.title}`);
      console.log(`  Slug: ${firstPost.slug}`);
      console.log(`  Category: ${firstPost.category}`);
      console.log(`  Published: ${firstPost.published}`);
      console.log(`  Featured: ${firstPost.featured}`);
      console.log(`  Tags: ${JSON.stringify(firstPost.tags)}`);
      console.log(`  Created: ${firstPost.created_at}`);
      console.log(`  Published At: ${firstPost.published_at}`);
    }

    // Test the field that might be causing issues - check for naming differences
    console.log('\n🔍 Checking for field naming issues...');
    try {
      const devQuery = `SELECT published_at, publishedAt FROM blog_posts LIMIT 1`;
      const result = await client.query(devQuery);
      console.log('✓ Both published_at and publishedAt fields exist');
    } catch (error) {
      console.log(`❌ Field naming issue: ${error.message}`);

      // Check which published field exists
      try {
        await client.query(`SELECT published_at FROM blog_posts LIMIT 1`);
        console.log('✓ published_at field exists (snake_case)');
      } catch (e) {
        console.log('❌ published_at field missing');
      }

      try {
        await client.query(`SELECT "publishedAt" FROM blog_posts LIMIT 1`);
        console.log('✓ publishedAt field exists (camelCase)');
      } catch (e) {
        console.log('❌ publishedAt field missing');
      }
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
  }
}

debugProductionBlogAPI();