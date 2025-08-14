/**
 * Fix Blog API with Snake Case Compatibility
 * Run this with: docker-compose --env-file .env.production exec app node fix-blog-api-snake-case.js
 */

const { Client } = require('pg');
const express = require('express');

const app = express();

async function createFixedBlogAPI() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  console.log('✓ Connected to production database');

  // Test current production API
  console.log('\n🔍 Testing current production API...');
  try {
    const response = await fetch('http://localhost:5000/api/blog/posts');
    console.log(`Current API Status: ${response.status}`);
    if (response.status !== 200) {
      const error = await response.text();
      console.log(`API Error: ${error}`);
    }
  } catch (e) {
    console.log(`API Connection Error: ${e.message}`);
  }

  // Create fixed endpoints
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const { rows } = await client.query(`
        SELECT
          id, title, slug, excerpt, content, category, tags, published, featured,
          seo_title as "seoTitle", seo_description as "seoDescription",
          view_count as "viewCount", created_at as "createdAt",
          published_at as "publishedAt", updated_at as "updatedAt"
        FROM blog_posts
        WHERE published = true
        ORDER BY created_at DESC
      `);

      res.json(rows);
    } catch (error) {
      console.error('Blog posts error:', error);
      res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
  });

  app.get('/api/blog/featured', async (req, res) => {
    try {
      const { rows } = await client.query(`
        SELECT
          id, title, slug, excerpt, content, category, tags, published, featured,
          seo_title as "seoTitle", seo_description as "seoDescription",
          view_count as "viewCount", created_at as "createdAt",
          published_at as "publishedAt", updated_at as "updatedAt"
        FROM blog_posts
        WHERE published = true AND featured = true
        ORDER BY created_at DESC
        LIMIT 3
      `);

      res.json(rows);
    } catch (error) {
      console.error('Featured posts error:', error);
      res.status(500).json({ error: 'Failed to fetch featured posts' });
    }
  });

  const port = 3002;
  app.listen(port, () => {
    console.log(`\n🚀 Fixed blog API running on port ${port}`);
    console.log('\nTest the fixed endpoints:');
    console.log(`curl http://localhost:${port}/api/blog/posts`);
    console.log(`curl http://localhost:${port}/api/blog/featured`);
    console.log('\nIf these work, the issue is in the main server routing.');
  });
}

createFixedBlogAPI().catch(console.error);