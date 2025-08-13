/**
 * Production Blog Setup Script - Creates table and seeds data
 * Run this with: docker-compose --env-file .env.production exec app node setup-production-blog.js
 */

import { Client } from 'pg';

async function setupProductionBlog() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to production database');

    // Create blog_posts table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        tags TEXT[],
        published BOOLEAN DEFAULT false,
        featured BOOLEAN DEFAULT false,
        seo_title VARCHAR(255),
        seo_description TEXT,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await client.query(createTableQuery);
    console.log('✓ blog_posts table created/verified');

    // Check if blog posts already exist
    const { rows: existingPosts } = await client.query('SELECT COUNT(*) as count FROM blog_posts');
    console.log(`Existing blog posts: ${existingPosts[0].count}`);

    if (parseInt(existingPosts[0].count) > 0) {
      console.log('Blog posts already exist, skipping seed');
      return;
    }

    // Define blog posts data
    const blogPosts = [
      {
        title: '2025 College Football Playoff Expansion: What It Means for Rankings and Betting',
        slug: '2025-cfb-playoff-expansion-rankings-betting',
        excerpt: 'The expanded College Football Playoff format changes everything about how we analyze teams and betting value. Our comprehensive guide breaks down the new system\'s impact on rankings, at-large bids, and betting strategies for the 2025 season.',
        content: `The 2025 college football season brings the most significant change to the sport since the BCS era ended: a 12-team playoff format that fundamentally alters how we evaluate teams, analyze betting value, and predict outcomes.

## Understanding the New Format

The expanded playoff includes the five highest-ranked conference champions plus seven at-large bids. This creates unprecedented opportunities for Group of 5 teams and adds new layers to our analytical models at Rick's Picks.

### Impact on Our Prediction Algorithm

Our proprietary algorithm now weighs several new factors:

**Conference Championship Scenarios**: Teams fighting for conference titles carry additional value beyond traditional metrics. A 10-2 team winning their conference championship may have better playoff odds than an 11-1 team that loses their title game.

**At-Large Positioning**: The battle for spots 6-12 in the rankings becomes crucial. Teams that historically would focus only on winning their conference now must consider overall playoff positioning.

**Strength of Schedule Premium**: With seven at-large bids available, strength of schedule carries even more weight. Teams scheduling cupcake non-conference opponents may find themselves on the playoff bubble despite strong records.

## Betting Implications

The playoff expansion creates new betting opportunities we're tracking:

### Season-Long Futures

- **Conference Champion Bets**: Every Power 5 conference winner gets an automatic playoff bid, making conference championship futures more valuable
- **Playoff Futures**: With 12 teams making the field, teams previously written off in October may still have playoff value
- **National Championship**: The extended tournament means lower-seeded teams have paths to the title, affecting championship odds

### Weekly Game Impact

Regular season games now carry different weight depending on context:

- **Week 1-6**: Early season games matter less for playoff positioning but remain crucial for championship odds
- **Week 7-10**: Mid-season becomes critical for at-large positioning
- **Week 11-13**: Conference championship races intensify betting value
- **Championship Week**: Conference title games become pseudo-playoff games

## Advanced Analytics Integration

Rick's Picks has updated our models to account for:

**Playoff Probability**: Each game prediction now includes playoff implications alongside traditional win probability and spread analysis.

**Bubble Watch**: We track teams on the playoff bubble, identifying games with enhanced betting value due to playoff stakes.

**Conference Strength Metrics**: Real-time evaluation of conference performance affects both individual team analysis and championship odds.

## Historical Context and Comparisons

The four-team playoff (2014-2023) showed us how committee selection works:
- Resume victories over ranked teams
- Quality losses vs. bad losses
- Eye test and momentum factors
- Geographic and conference diversity

With 12 teams, these factors evolve:
- More room for quality losses
- Increased value on signature victories
- Greater emphasis on conference championships
- Reduced "eye test" importance

## Practical Betting Strategies

### Early Season (August-September)
Focus on identifying playoff contenders at long odds. Teams like Cincinnati (2021) and TCU (2022) showed how quickly fortunes can change.

### Mid-Season (October)
Target conference championship races and at-large bubble teams. Value often exists on teams fighting for positioning.

### Late Season (November-December)
Championship week offers the highest variance betting opportunities. Conference underdogs getting automatic bids create massive value swings.

## Rick's Picks 2025 Predictions

Based on our expanded analytics model:

**Automatic Bid Conferences**: All Power 5 conferences plus highest-ranked Group of 5
**Most Likely At-Large Pool**: SEC (3-4 teams), Big Ten (2-3 teams), ACC (1-2 teams), Big 12 (1-2 teams)
**Surprise Factor**: Expect 1-2 teams to exceed preseason expectations and claim playoff spots

## Conclusion

The 12-team playoff doesn't just change college football - it revolutionizes how we analyze, predict, and bet on the sport. At Rick's Picks, we've integrated these changes into every aspect of our platform, from weekly game predictions to season-long championship futures.

The expanded format means more meaningful games, higher stakes throughout the season, and unprecedented betting opportunities for those who understand the new landscape. Stay tuned to Rick's Picks for weekly updates on playoff positioning, bubble analysis, and betting recommendations as the 2025 season unfolds.

*Ready to capitalize on the new playoff format? Check out our weekly predictions and playoff probability tracker for the most comprehensive college football analysis available.*`,
        category: 'Analysis',
        tags: ['Playoff', 'Betting Strategy', '2025 Season', 'Rankings', 'CFP'],
        published: true,
        featured: true,
        seoTitle: '2025 College Football Playoff Expansion Guide | Betting Analysis & Predictions',
        seoDescription: 'Complete analysis of the 12-team College Football Playoff format and its impact on betting strategies, rankings, and season predictions for 2025.',
        viewCount: 247,
        createdAt: '2025-07-28T14:30:00',
        publishedAt: '2025-07-28T14:30:00'
      },
      {
        title: 'Understanding College Football Betting Lines: A Comprehensive Guide for Beginners',
        slug: 'college-football-betting-lines-guide',
        excerpt: 'New to college football betting? Our comprehensive guide covers point spreads, over/unders, moneylines, and advanced betting concepts with real examples and strategies from our expert analysts.',
        content: `College football betting can seem overwhelming for newcomers, but understanding the fundamentals opens up a world of strategic opportunities. At Rick's Picks, we've helped thousands of bettors learn the ropes and develop winning strategies.

## Basic Betting Types

### Point Spread
The most common college football bet, the point spread levels the playing field between teams.

**Example**: Alabama -14.5 vs Auburn +14.5
- Alabama must win by 15+ points to cover
- Auburn can lose by 14 or fewer points (or win outright) to cover

**Key Concepts**:
- The half-point eliminates ties (pushes)
- Favorites are indicated with minus signs (-)
- Underdogs are indicated with plus signs (+)

### Over/Under (Total)
Betting on the combined score of both teams.

**Example**: Alabama vs Auburn Over/Under 52.5
- Over: Combined score 53 or higher wins
- Under: Combined score 52 or lower wins

### Moneyline
Straight-up winner betting without point spreads.

**Example**: Alabama -500, Auburn +400
- Bet $500 to win $100 on Alabama
- Bet $100 to win $400 on Auburn

## Advanced Betting Concepts

### Line Movement
Lines change based on betting action and new information.

**Causes of Movement**:
- Heavy betting on one side
- Injury reports
- Weather conditions
- Expert opinions and media coverage

**Betting Strategy**: Look for line movement that creates value. If a line moves from -7 to -10 due to public betting, the underdog may offer increased value.

### Key Numbers in College Football
Certain margins of victory occur more frequently:

**Most Common Margins**:
- 3 points (field goals)
- 7 points (touchdowns)
- 10 points (touchdown + field goal)
- 14 points (two touchdowns)

**Strategic Application**: Lines of 2.5, 6.5, 9.5, and 13.5 often provide better value than key numbers.

## Bankroll Management

### Unit Sizing
Never bet more than you can afford to lose.

**Recommended Structure**:
- 1 unit = 1-2% of total bankroll
- High confidence bets: 2-3 units
- Medium confidence: 1-2 units
- Low confidence: 0.5-1 unit

### Record Keeping
Track all bets to identify strengths and weaknesses:
- Date and game
- Bet type and amount
- Odds and outcome
- Reasoning for the bet

### Emotional Control
Successful betting requires discipline:
- Set daily/weekly limits
- Never chase losses
- Take breaks after bad streaks
- Focus on process, not results

## Common Mistakes to Avoid

### Betting with Your Heart
Favorite teams cloud judgment. Our algorithm removes emotional bias.

### Overvaluing Recent Performance
One game doesn't establish a trend. Look at larger sample sizes.

### Ignoring Line Shopping
Different sportsbooks offer different odds. Always shop for the best lines.

### Betting Too Many Games
Quality over quantity. Focus on games where you have genuine edge.

## Getting Started

### Step 1: Learn the Basics
Understand point spreads, totals, and moneylines before advancing to complex bets.

### Step 2: Start Small
Begin with small bets while learning. Focus on education over profit initially.

### Step 3: Use Resources
Leverage Rick's Picks analysis, but develop your own understanding of the reasoning behind our recommendations.

### Step 4: Track Performance
Maintain detailed records to identify successful strategies and areas for improvement.

## Conclusion

College football betting success comes from combining fundamental understanding with advanced analysis, disciplined bankroll management, and emotional control. At Rick's Picks, we provide the analytical foundation, but successful betting requires applying these concepts consistently over time.

Remember: betting should be entertaining and potentially profitable, but never bet money you can't afford to lose. Use our predictions and analysis as a starting point for your own research and decision-making process.

*Ready to start your college football betting journey? Check out our weekly predictions and betting recommendations for expert guidance every game day.*`,
        category: 'Strategy',
        tags: ['Betting Guide', 'Beginners', 'Strategy', 'Point Spreads', 'Bankroll Management'],
        published: true,
        featured: true,
        seoTitle: 'College Football Betting Guide for Beginners | Point Spreads, Strategy & Tips',
        seoDescription: 'Complete beginner\'s guide to college football betting including point spreads, over/unders, bankroll management, and winning strategies from expert analysts.',
        viewCount: 189,
        createdAt: '2025-07-22T09:15:00',
        publishedAt: '2025-07-22T09:15:00'
      },
      {
        title: 'Week 1 College Football Predictions: Top Upset Alerts and Betting Value',
        slug: 'week-1-college-football-predictions-upsets-betting-value',
        excerpt: 'Our algorithmic analysis identifies the biggest upset potential and betting value for Week 1 of college football. Discover which favorites are overvalued and which underdogs offer significant upside.',
        content: `Week 1 of college football presents unique challenges and opportunities for bettors. Teams are untested, rosters have changed significantly, and public perception often doesn't match reality. Our advanced analytics have identified several situations where betting value exists.

## Methodology

Rick's Picks Week 1 analysis incorporates:

- Returning production metrics
- Recruiting class integration
- Coaching staff changes
- Historical Week 1 performance
- Public betting tendencies
- Line movement analysis

## Top Upset Alerts

### Marshall (+39.5) vs Georgia
**Our Prediction**: Marshall loses by 24

Georgia opens as massive 39.5-point favorites against Marshall, but our algorithm suggests this spread is inflated. Here's why:

**Marshall Strengths**:
- Returning 18 starters from 2024
- Experienced offensive line (4/5 returners)
- Veteran quarterback in sophomore season
- Strong special teams unit

**Georgia Concerns**:
- New starting quarterback
- Rebuilt offensive line
- Early season rust historically
- Potential overlooking opponent

**Betting Recommendation**: Take Marshall +39.5

The Thundering Herd has the experience edge and motivation to keep this game closer than the spread suggests.

### Nevada (+45) vs Penn State
**Our Prediction**: Nevada loses by 28

Penn State's 45-point spread appears to account for a complete blowout, but several factors suggest Nevada can stay within this massive number:

**Nevada Advantages**:
- Veteran coaching staff
- Solid rushing attack
- Penn State's historical slow starts
- Garbage time scoring opportunities

**Penn State Factors**:
- New offensive coordinator
- Pressure to perform early
- May ease up with large lead
- Weather could limit big plays

**Betting Recommendation**: Take Nevada +45

This spread assumes Nevada scores less than 10 points, which seems unlikely given Penn State's defensive uncertainties.

## Best Betting Value

### Miami (+2.5) vs Notre Dame
**Our Prediction**: Miami wins by 7

This line presents excellent value on Miami for several reasons:

**Miami Strengths**:
- Explosive offensive weapons
- Home field advantage in neutral site game
- Motivated after disappointing 2024
- Favorable matchup against Notre Dame's defense

**Notre Dame Questions**:
- Quarterback consistency
- Road game atmosphere
- Defensive coordinator change
- Limited depth at key positions

**Betting Recommendation**: Take Miami +2.5

Miami offers significant value as short underdogs in what should be a pick'em game.

## Conclusion

Week 1 provides excellent opportunities for sharp bettors who focus on value over public perception. These games offer the best combination of line value and analytical edge for the opening week of college football.

*Follow Rick's Picks for complete Week 1 analysis and betting recommendations.*`,
        category: 'Previews',
        tags: ['Week 1', 'Predictions', 'Upset Alerts', 'Betting Value', 'College Football'],
        published: true,
        featured: false,
        seoTitle: 'Week 1 College Football Predictions | Upset Alerts & Betting Value Analysis',
        seoDescription: 'Expert analysis of Week 1 college football upset potential and betting value. Algorithmic predictions identify overvalued favorites and underdog opportunities.',
        viewCount: 156,
        createdAt: '2025-08-05T16:45:00',
        publishedAt: '2025-08-05T16:45:00'
      },
      {
        title: 'How College Football Weather Affects Betting Lines and Game Outcomes',
        slug: 'college-football-weather-betting-analysis',
        excerpt: 'Weather conditions can dramatically impact college football games and betting lines. Our comprehensive analysis shows how wind, rain, snow, and temperature affect scoring, turnovers, and betting value.',
        content: `Weather is one of the most undervalued factors in college football betting. While casual bettors focus on team stats and recent performance, smart money pays attention to weather forecasts and their impact on game dynamics.

## Weather Impact Categories

### Wind Effects (15+ MPH)
High winds significantly affect passing games and kicking:

**Passing Impact**:
- Reduced completion percentages
- Shorter average pass length
- Increased interceptions on deep throws
- Quarterback accuracy issues

**Kicking Concerns**:
- Field goal accuracy drops 15-20%
- Extra point complications
- Punting distance/hang time affected
- Onside kick difficulty increases

**Betting Implications**:
- Under bets gain value
- Running teams have advantages
- Kicker props become risky
- Home teams with dome experience struggle outdoors

### Precipitation (Rain/Snow)
Wet conditions create multiple game-changing factors:

**Ball Security**:
- Fumble rates increase 25-30%
- Handoff timing disrupted
- Catching difficulty on passes
- Snap count timing issues

**Field Conditions**:
- Footing problems for skill players
- Reduced cutting ability
- Slower game tempo
- Increased injury risk

**Strategic Changes**:
- Conservative play-calling
- Increased running attempts
- Shorter passing routes
- Clock management alterations

## Conclusion

Understanding weather impacts provides a significant edge in college football betting. Smart bettors incorporate these factors into their analysis for improved results.

*Check Rick's Picks for weekly weather analysis and betting recommendations.*`,
        category: 'Analysis',
        tags: ['Weather', 'Betting Analysis', 'Game Conditions', 'Strategy', 'Environmental Factors'],
        published: true,
        featured: false,
        seoTitle: 'College Football Weather Betting Analysis | How Conditions Affect Games & Lines',
        seoDescription: 'Complete guide to how weather conditions impact college football games, betting lines, and outcomes. Expert analysis of wind, rain, snow, and temperature effects.',
        viewCount: 134,
        createdAt: '2025-07-31T11:20:00',
        publishedAt: '2025-07-31T11:20:00'
      },
      {
        title: 'The Rise of Group of 5 Programs: Betting Opportunities in College Football\'s Second Tier',
        slug: 'group-of-5-college-football-betting-opportunities',
        excerpt: 'Group of 5 programs offer unique betting value often overlooked by the public. Our analysis reveals why American, Conference USA, MAC, Mountain West, and Sun Belt teams provide excellent opportunities for sharp bettors.',
        content: `The Group of 5 conferences (American, Conference USA, MAC, Mountain West, Sun Belt) represent college football's best-kept secret for savvy bettors. While public attention focuses on Power 5 glamour, significant value exists in these overlooked programs.

## Why Group of 5 Offers Value

### Limited Media Coverage
Reduced exposure creates information inefficiencies:

**Public Betting Patterns**:
- Casual bettors avoid "unknown" teams
- Line movement often reflects sharp money
- Public typically backs recognizable names
- Overreactions to limited information

**Information Advantages**:
- Less analyzed by mainstream media
- Local beat writers provide insider knowledge
- Recruiting rankings undervalue G5 transfers
- Coaching changes fly under radar

### Competitive Balance
Group of 5 conferences show remarkable parity:

**Statistical Evidence**:
- Conference championship races remain open longer
- Upset frequency higher than Power 5
- Home field advantage more pronounced
- Weather/travel factors amplified

**Betting Implications**:
- Underdogs cover at higher rates
- Season-long futures offer value
- Weekly line shopping more important
- Situational spots create opportunities

## Conference-Specific Analysis

### American Athletic Conference
The strongest G5 conference offers legitimate talent:

**Top Programs**:
- Cincinnati (recent playoff participant)
- Houston (strong recruiting base)
- Memphis (explosive offensive schemes)
- UCF (consistent competitiveness)

**Betting Characteristics**:
- Higher totals due to offensive schemes
- Road favorites struggle
- November games provide value
- Bowl game matchups favorable

### Mountain West Conference
Geographic challenges create unique betting situations:

**Key Factors**:
- Altitude advantages (Air Force, Colorado State)
- Travel distances affect East Coast teams
- Weather variations extreme
- Late-night TV slots reduce public betting

**Strategic Opportunities**:
- Home underdogs in mountain venues
- Early season road teams struggle
- Conference tournament implications
- Bowl game preparation time advantages

## Conclusion

Group of 5 programs offer excellent betting value for sharp analysis. These conferences provide opportunities often missed by public attention focused on Power 5 programs.

*Discover more Group of 5 betting opportunities with Rick's Picks weekly analysis.*`,
        category: 'Analysis',
        tags: ['Group of 5', 'Betting Opportunities', 'Value Betting', 'Conference Analysis', 'Undervalued Teams'],
        published: true,
        featured: false,
        seoTitle: 'Group of 5 College Football Betting Guide | Value in Second Tier Programs',
        seoDescription: 'Discover betting opportunities in Group of 5 college football conferences. Analysis of American, MAC, Mountain West, C-USA, and Sun Belt betting value.',
        viewCount: 98,
        createdAt: '2025-08-08T13:00:00',
        publishedAt: '2025-08-08T13:00:00'
      }
    ];

    // Insert blog posts
    for (const post of blogPosts) {
      const query = `
        INSERT INTO blog_posts (
          title, slug, excerpt, content, category, tags, published, featured,
          seo_title, seo_description, view_count, created_at, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      const values = [
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        post.category,
        post.tags,
        post.published,
        post.featured,
        post.seoTitle,
        post.seoDescription,
        post.viewCount,
        post.createdAt,
        post.publishedAt
      ];

      await client.query(query, values);
      console.log(`✓ Inserted: ${post.title}`);
    }

    // Verify insertion
    const { rows: finalCount } = await client.query('SELECT COUNT(*) as count FROM blog_posts');
    console.log(`\n✅ Total blog posts after setup: ${finalCount[0].count}`);

    const { rows: posts } = await client.query('SELECT title, published, featured FROM blog_posts ORDER BY created_at');
    console.log('\n📝 Blog posts in production database:');
    posts.forEach(post => {
      const status = post.published ? '✅ Published' : '📝 Draft';
      const featured = post.featured ? ' ⭐ Featured' : '';
      console.log(`   ${status}${featured}: ${post.title}`);
    });

    console.log('\n🎉 Production blog setup complete!');

  } catch (error) {
    console.error('❌ Error setting up production blog:', error);
  } finally {
    await client.end();
  }
}

setupProductionBlog();