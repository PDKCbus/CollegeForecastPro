# AWS Lightsail Deployment Guide for Rick's Picks

This comprehensive guide walks you through dockerizing Rick's Picks and deploying it to AWS Lightsail with SSL, monitoring, and production-ready configuration.

## Prerequisites

1. **AWS Account** with Lightsail access
2. **Domain name** pointed to your Lightsail instance
3. **Docker** installed locally for testing
4. **SSH key pair** for server access

## Step 1: Local Docker Setup and Testing

### 1.1 Build and Test Locally

```bash
# Clone your repository
git clone your-repo-url
cd ricks-picks

# Create production environment file
cp .env.example .env.production

# Edit .env.production with your production values
nano .env.production
```

**Required environment variables:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@db:5432/rickspicks
CFBD_API_KEY=your_cfbd_api_key
OPENWEATHER_API_KEY=your_openweather_key
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-your-adsense-id
SESSION_SECRET=your-super-secure-session-secret
POSTGRES_DB=rickspicks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-db-password
```

### 1.2 Test Docker Build

```bash
# Build the Docker image
docker build -t ricks-picks .

# Test run locally
docker run -p 5000:5000 --env-file .env.production ricks-picks

# Or use Docker Compose for full stack testing
docker-compose --env-file .env.production up -d
```

## Step 2: AWS Lightsail Instance Setup

### 2.1 Create Lightsail Instance

1. **Log into AWS Lightsail Console**
2. **Create Instance**:
   - Platform: Linux/Unix
   - Blueprint: Ubuntu 22.04 LTS
   - Instance plan: $20/month (2 GB RAM, 1 vCPU) minimum
   - Instance name: `ricks-picks-prod`

3. **Configure Networking**:
   - Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Assign static IP address

### 2.2 Domain Configuration

1. **DNS Setup**:
   ```
   A Record: @ → Your Lightsail Static IP
   A Record: www → Your Lightsail Static IP
   ```

2. **Verify DNS propagation**:
   ```bash
   nslookup rickiespicks.com
   ```

## Step 3: Server Preparation

### 3.1 Connect to Your Instance

```bash
# Download your Lightsail SSH key from the console
chmod 400 ~/Downloads/LightsailDefaultKey-us-east-1.pem

# Connect to your instance
ssh -i ~/Downloads/LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_STATIC_IP
```

### 3.2 Install Docker and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo apt install -y git curl wget unzip htop

# Logout and login again for Docker group changes
exit
```

### 3.3 Configure Firewall

```bash
# SSH back in
ssh -i ~/Downloads/LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_STATIC_IP

# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## Step 4: SSL Certificate Setup

### 4.1 Install Certbot

```bash
# Install Certbot
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 4.2 Obtain SSL Certificate

```bash
# Stop any running web servers
sudo systemctl stop apache2 nginx 2>/dev/null || true

# Get certificate
sudo certbot certonly --standalone -d rickiespicks.com -d www.rickiespicks.com

# Set up auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 5: Application Deployment

### 5.1 Clone and Configure Application

```bash
# Create application directory
mkdir -p /home/ubuntu/ricks-picks
cd /home/ubuntu/ricks-picks

# Clone your repository
git clone YOUR_REPO_URL .

# Create production environment file
cp .env.example .env.production
nano .env.production
```

**Production .env.production:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:your-secure-password@db:5432/rickspicks
CFBD_API_KEY=your_real_cfbd_key
OPENWEATHER_API_KEY=your_real_weather_key
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-your-real-adsense-id
SESSION_SECRET=your-super-secure-session-secret-64-chars-long
POSTGRES_DB=rickspicks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
```

### 5.2 Configure SSL for Nginx

```bash
# Create SSL directory for Docker
mkdir -p ssl
sudo cp /etc/letsencrypt/live/rickiespicks.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/rickiespicks.com/privkey.pem ssl/
sudo chown -R ubuntu:ubuntu ssl/
```

### 5.3 Deploy with Docker Compose

```bash
# Build and start services
docker-compose --env-file .env.production up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

## Step 6: Health Monitoring and Maintenance

### 6.1 Add Health Check Endpoint

Add to your Express server (`server/index.ts`):

```typescript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### 6.2 Set Up Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/docker-ricks-picks

# Add content:
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
```

### 6.3 Create Update Script

```bash
# Create update script
nano ~/update-app.sh

# Add content:
#!/bin/bash
cd /home/ubuntu/ricks-picks
git pull origin main
docker-compose --env-file .env.production down
docker-compose --env-file .env.production up -d --build
docker system prune -f

# Make executable
chmod +x ~/update-app.sh
```

## Step 7: Database Management

### 7.1 Database Backups

```bash
# Create backup script
nano ~/backup-db.sh

# Add content:
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose exec -T db pg_dump -U postgres rickspicks > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Make executable and add to cron
chmod +x ~/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -
```

### 7.2 Database Migration on First Deploy

```bash
# Run initial database setup
docker-compose exec app npm run db:push
```

## Step 8: Performance Optimization

### 8.1 System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Check system resources
htop
docker stats
```

### 8.2 Configure Swap (for small instances)

```bash
# Create swap file (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Step 9: Security Best Practices

### 9.1 Server Security

```bash
# Disable root login and password auth
sudo nano /etc/ssh/sshd_config

# Ensure these settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart ssh
```

### 9.2 Application Security

1. **Environment Variables**: Never commit secrets to git
2. **Database**: Use strong passwords and limit connections
3. **HTTPS**: Always use SSL in production
4. **Updates**: Keep dependencies and system updated

## Step 10: Monitoring and Alerts

### 10.1 Simple Uptime Monitoring

```bash
# Create monitoring script
nano ~/monitor.sh

# Add content:
#!/bin/bash
if ! curl -f -s http://localhost/api/health > /dev/null; then
    echo "$(date): Application is down, restarting..." >> /var/log/app-monitor.log
    cd /home/ubuntu/ricks-picks
    docker-compose restart app
fi

# Add to cron (check every 5 minutes)
chmod +x ~/monitor.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/monitor.sh") | crontab -
```

## Step 11: Going Live Checklist

### Before Deployment:
- [ ] Google AdSense account approved
- [ ] All API keys obtained and tested
- [ ] Domain DNS configured
- [ ] SSL certificate obtained
- [ ] Database backup strategy in place
- [ ] Monitoring configured

### After Deployment:
- [ ] Health check endpoint responding
- [ ] SSL certificate valid (check at ssllabs.com)
- [ ] Google Ads appearing correctly
- [ ] Database connections working
- [ ] Email alerts configured
- [ ] Performance metrics baseline established

## Troubleshooting Guide

### Common Issues:

1. **Port Already in Use**:
   ```bash
   sudo netstat -tulpn | grep :80
   sudo kill -9 PID_NUMBER
   ```

2. **SSL Certificate Issues**:
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

3. **Database Connection Failures**:
   ```bash
   docker-compose logs db
   docker-compose exec db psql -U postgres -d rickspicks
   ```

4. **Out of Memory**:
   ```bash
   free -h
   docker system prune -a
   ```

5. **Slow Performance**:
   ```bash
   htop
   docker stats
   # Consider upgrading Lightsail instance
   ```

## Scaling Considerations

As your traffic grows:

1. **Upgrade Lightsail Instance**: Move to higher CPU/RAM plans
2. **Add Load Balancer**: Use Lightsail Load Balancer for multiple instances
3. **Database Optimization**: Consider managed PostgreSQL
4. **CDN**: Add CloudFront for static assets
5. **Monitoring**: Implement comprehensive logging with ELK stack

## Cost Estimation

**Monthly AWS Costs:**
- Lightsail Instance ($20-40): $20-40
- Static IP: $5
- SSL Certificate: Free (Let's Encrypt)
- Data Transfer: $0.09/GB after 3TB
- Backups: Minimal storage costs

**Total: ~$25-45/month** for a production-ready deployment.

This deployment guide provides a robust, scalable foundation for Rick's Picks that can handle significant traffic while maintaining security and performance standards.