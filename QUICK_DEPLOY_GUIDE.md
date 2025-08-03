# Quick Deploy Guide - Rick's Picks to AWS Lightsail

This is a condensed deployment guide for getting Rick's Picks running on AWS Lightsail quickly.

## Prerequisites Checklist

- [ ] AWS Lightsail account
- [ ] Domain name (e.g., rickiespicks.com)
- [ ] Google AdSense account approved
- [ ] API keys ready (CFBD, OpenWeather)

## 1. Local Testing (5 minutes)

```bash
# Test Docker build locally
docker build -t ricks-picks .
docker run -p 5000:5000 --env-file .env.example ricks-picks
```

Visit `http://localhost:5000` to verify it works.

## 2. AWS Lightsail Setup (10 minutes)

1. **Create Instance**:
   - Ubuntu 22.04 LTS
   - $20/month plan (2GB RAM minimum)
   - Open ports: 22, 80, 443
   - Assign static IP

2. **Point Domain**:
   ```
   A Record: @ → Your Static IP
   A Record: www → Your Static IP
   ```

## 3. Server Setup (15 minutes)

```bash
# Connect to server
ssh -i your-key.pem ubuntu@YOUR_IP

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again
exit
```

## 4. SSL Certificate (5 minutes)

```bash
# SSH back in
ssh -i your-key.pem ubuntu@YOUR_IP

# Install Certbot
sudo apt update
sudo apt install -y snapd
sudo snap install --classic certbot

# Get certificate
sudo certbot certonly --standalone -d rickiespicks.com -d www.rickiespicks.com
```

## 5. Deploy Application (10 minutes)

```bash
# Clone repository
git clone YOUR_REPO_URL /home/ubuntu/ricks-picks
cd /home/ubuntu/ricks-picks

# Create production environment
cp .env.example .env.production
nano .env.production
```

**Required .env.production values:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:SECURE_PASSWORD@db:5432/rickspicks
CFBD_API_KEY=your_real_cfbd_key
OPENWEATHER_API_KEY=your_real_weather_key
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-your-adsense-id
SESSION_SECRET=64-character-random-string
POSTGRES_DB=rickspicks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SECURE_PASSWORD
```

```bash
# Setup SSL for Docker
mkdir ssl
sudo cp /etc/letsencrypt/live/rickiespicks.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/rickiespicks.com/privkey.pem ssl/
sudo chown -R ubuntu:ubuntu ssl/

# Deploy
docker-compose --env-file .env.production up -d --build

# Check status
docker-compose ps
curl http://localhost/api/health
```

## 6. Setup Monitoring (5 minutes)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Setup automated backups (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/ricks-picks/scripts/backup.sh") | crontab -

# Setup monitoring (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/ricks-picks/scripts/monitor.sh") | crontab -

# Setup SSL renewal (monthly)
(crontab -l 2>/dev/null; echo "0 3 1 * * /usr/bin/certbot renew --quiet") | crontab -
```

## 7. Verification Checklist

- [ ] Site loads at https://rickiespicks.com
- [ ] SSL certificate valid (green lock)
- [ ] Health endpoint returns 200: https://rickiespicks.com/api/health
- [ ] Games data loading correctly
- [ ] Google Ads appearing (may take 24 hours)
- [ ] Mobile responsive design working

## 8. Update Your Ad Slot IDs

Edit `client/src/components/google-ads.tsx`:

```typescript
// Replace placeholder slot IDs with your real ones from AdSense
export function HeaderAd() {
  return (
    <GoogleAd 
      adSlot="YOUR_ACTUAL_HEADER_SLOT_ID"  // Get from AdSense dashboard
      adFormat="horizontal"
      className="mb-4"
      adStyle={{ width: '100%', height: '90px' }}
    />
  );
}
```

Then redeploy:
```bash
cd /home/ubuntu/ricks-picks
git pull origin main
docker-compose --env-file .env.production up -d --build
```

## Common Issues & Solutions

**Port already in use:**
```bash
sudo lsof -i :80
sudo kill -9 PID_NUMBER
```

**SSL issues:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

**Database connection failed:**
```bash
docker-compose logs db
docker-compose restart db
```

**Out of memory:**
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Estimated Timeline
- **Total deployment time**: ~50 minutes
- **Monthly cost**: ~$25-30 (Lightsail + domain)
- **Expected revenue**: $50-200/month (depending on traffic)

## Post-Deployment Tasks

1. **Submit to Google**: Add site to Google Search Console
2. **Analytics**: Add Google Analytics if desired
3. **Monitoring**: Set up email alerts in monitoring script
4. **Backup Testing**: Test restore from backup
5. **Performance**: Monitor with `htop` and `docker stats`

## Quick Commands Reference

```bash
# Deploy updates
cd /home/ubuntu/ricks-picks && ./scripts/deploy.sh

# View logs
docker-compose logs -f app

# Backup database
./scripts/backup.sh

# Check health
curl https://rickiespicks.com/api/health

# View system resources
htop
docker stats
```

Your Rick's Picks site is now live and monetized! 🚀