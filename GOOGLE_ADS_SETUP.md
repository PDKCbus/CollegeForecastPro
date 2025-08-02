# Google Ads Integration Setup Guide

This guide walks you through setting up Google AdSense monetization for Rick's Picks.

## Step 1: Google AdSense Account Setup

1. **Create Google AdSense Account**
   - Go to [Google AdSense](https://www.google.com/adsense/)
   - Sign up with your Google account
   - Enter your website URL: `https://rickiespicks.com`
   - Choose your country/region and payment currency

2. **Add Your Site**
   - In AdSense dashboard, go to "Sites"
   - Add your site: `rickiespicks.com`
   - Wait for site review and approval (can take 1-7 days)

## Step 2: Get Your AdSense Client ID

1. Once approved, go to "Ads" → "By site"
2. Click on your site
3. Your client ID will look like: `ca-pub-1234567890123456`
4. Copy this ID - you'll need it for the environment variable

## Step 3: Configure Environment Variables

1. **Development Environment (.env)**:
   ```
   VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-your-actual-client-id
   ```

2. **Production Environment (Replit Secrets)**:
   - In Replit, go to the "Secrets" tab
   - Add a new secret:
     - Key: `VITE_GOOGLE_ADSENSE_CLIENT_ID`
     - Value: `ca-pub-your-actual-client-id`

## Step 4: Create Ad Units

In your AdSense dashboard:

1. **Header Ad Unit**:
   - Type: Display ad
   - Size: Responsive or 728x90 leaderboard
   - Copy the ad slot ID (e.g., `1234567890`)

2. **In-Content Ad Unit**:
   - Type: In-article ad
   - Size: Responsive
   - Copy the ad slot ID

3. **Sidebar Ad Unit** (optional):
   - Type: Display ad
   - Size: 300x250 rectangle
   - Copy the ad slot ID

## Step 5: Update Ad Slot IDs

Edit `client/src/components/google-ads.tsx` and replace placeholder slot IDs:

```typescript
export function HeaderAd() {
  return (
    <GoogleAd 
      adSlot="YOUR_HEADER_AD_SLOT_ID"  // Replace with actual slot ID
      adFormat="horizontal"
      className="mb-4"
      adStyle={{ width: '100%', height: '90px' }}
    />
  );
}

export function InContentAd() {
  return (
    <GoogleAd 
      adSlot="YOUR_IN_CONTENT_AD_SLOT_ID"  // Replace with actual slot ID
      adFormat="fluid"
      className="my-6"
    />
  );
}
```

## Step 6: Ad Placement Strategy

Current ad placements:

1. **Header Ad**: Below hero section, above filter bar
   - High visibility, doesn't interfere with navigation
   - Horizontal format works well on all devices

2. **In-Content Ad**: Between featured game and game list
   - Natural break in content flow
   - Users are engaged but not frustrated

3. **Future Placements** (add as traffic grows):
   - Sidebar ads on desktop (300x250)
   - Footer ads
   - Between game cards (every 6th card)

## Step 7: Testing

1. **Development Testing**:
   - Ads show as gray placeholders in development
   - This is normal and expected behavior

2. **Production Testing**:
   - Deploy to production
   - Ads should appear within 24 hours
   - Use Chrome DevTools to verify ad scripts load

## Step 8: Monitoring & Optimization

1. **AdSense Dashboard**:
   - Monitor earnings, impressions, CTR
   - Check for policy violations
   - Review performance reports

2. **Key Metrics to Watch**:
   - Page RPM (Revenue per 1000 page views)
   - CTR (Click-through rate)
   - CPC (Cost per click)
   - Viewability percentage

## Best Practices

### Content Policy Compliance
- Keep content family-friendly
- Avoid gambling-related language
- Focus on "analytics" and "predictions" rather than "betting"
- Don't encourage excessive gambling

### User Experience
- Ads are responsive and mobile-friendly
- Placeholders in development prevent layout shifts
- Strategic placement doesn't disrupt core functionality
- Fast loading with async script loading

### Revenue Optimization
- Start with conservative placement
- Add more ads as traffic increases
- Test different ad formats and sizes
- Monitor user engagement metrics

## Troubleshooting

### Ads Not Showing
1. Check console for JavaScript errors
2. Verify client ID is correct
3. Ensure site is approved in AdSense
4. Wait 24-48 hours after setup

### Policy Violations
1. Review AdSense policy emails
2. Remove problematic content
3. Submit reconsideration request if needed

### Low Revenue
1. Increase traffic through SEO
2. Improve content quality and engagement
3. Test different ad placements
4. Consider adding more ad units gradually

## Revenue Expectations

Realistic expectations for a college football analytics site:
- **Early Stage** (0-10K monthly views): $10-50/month
- **Growing** (10-50K monthly views): $50-200/month  
- **Established** (50K-200K monthly views): $200-800/month
- **Peak Season** (College football season): 2-3x normal revenue

Revenue factors:
- Traffic volume and quality
- User engagement and time on site
- Ad placement and optimization
- Seasonal trends (higher during football season)
- Geographic audience (US traffic pays more)

Remember: Focus on building great content and user experience first. The revenue will follow naturally as your audience grows.