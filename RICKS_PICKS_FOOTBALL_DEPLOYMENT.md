# Rick's Picks Football - AWS Lightsail Deployment Guide

Deploy your complete Rick's Picks platform with enhanced algorithm (52.9% ATS) to AWS Lightsail using the domain "ricks-picks.football"

## Quick Deployment Summary

**Domain**: `ricks-picks.football`  
**Branch**: `main` (complete app with algorithm enhancements)  
**Infrastructure**: AWS Lightsail + Docker + PostgreSQL + SSL  
**Estimated Cost**: $17-29/month (First 90 days FREE!)  

## Step 1: AWS Lightsail Instance Setup

### 1.1 Create Instance
1. Log into AWS Lightsail Console
2. Create Instance:
   - **Platform**: Linux/Unix  
   - **Blueprint**: Ubuntu 22.04 LTS
   - **Instance Plan**: $12/month (2 GB RAM, 2 vCPU) or $24/month (4 GB RAM, 2 vCPU)
   - **Instance Name**: `ricks-picks-football-prod`
   - Click "Create instance"

### 1.2 Configure Networking (After Instance Creation)

Once your instance is running:

1. **Go to the Networking tab** of your instance
2. **Open required ports**:
   - Port 22 (SSH) - Usually open by default
   - Port 80 (HTTP) - Click "Add rule" → HTTP
   - Port 443 (HTTPS) - Click "Add rule" → HTTPS

**Visual Reference - Networking Tab:**
![Networking Configuration](attached_assets/Screenshot%202025-08-03%20at%206.17.04%20PM_1754259436609.png)

3. **Assign Static IP**:
   - Click "Attach static IP" link in the IPv4 networking section
   - You can reuse an existing static IP or create a new one
   - **Important**: Note this IP address for DNS configuration

**Visual Reference - Static IP Attachment:**
![Static IP Attached](attached_assets/Screenshot%202025-08-03%20at%206.20.43%20PM_1754259655045.png)

### 1.3 Domain Configuration
Configure your `ricks-picks.football` domain DNS:

1. **Go to your domain's DNS records section** in Lightsail
2. **Click "Add record"** to create two A records:

```
A Record: @ → Your Lightsail Static IP (e.g., 44.205.204.78)
A Record: www → Your Lightsail Static IP (e.g., 44.205.204.78)
```

**Visual Reference - DNS Records Setup:**
![DNS Records Interface](attached_assets/Screenshot%202025-08-03%20at%206.22.01%20PM_1754259729734.png)

**Visual Reference - Completed DNS Records:**
![DNS Records Configured](attached_assets/Screenshot%202025-08-03%20at%206.23.28%20PM_1754259815961.png)

3. **Verify DNS propagation** (may take 24-48 hours):
```bash
nslookup ricks-picks.football
```

**Example DNS Verification Output:**
```
➜ nslookup ricks-picks.football
Server:         2603:7001:2c40:1d::1
Address:        2603:7001:2c40:1d::1#53

Non-authoritative answer:
Name:   ricks-picks.football
Address: 44.205.204.78
```

✅ **DNS is working!** Your domain now points to your server.

## Step 2: Server Setup and Security

### 2.1 Connect to Instance

**Download SSH Key:**
1. In Lightsail console, go to your instance
2. Click "Connect" tab
3. Download the default SSH key (usually named `LightsailDefaultKey-us-east-1.pem`)

**Connect via SSH:**
```bash
# Set correct permissions on SSH key
chmod 400 ~/Downloads/LightsailDefaultKey-us-east-1.pem

# Connect to your server (using your static IP)
ssh -i ~/Downloads/LightsailDefaultKey-us-east-1.pem ubuntu@44.205.204.78
```

**Alternative - Browser-based SSH:**
You can also use the browser-based SSH in Lightsail console by clicking "Connect using SSH" button.

✅ **Using Lightsail Browser Terminal** - This is the easiest option!

### 2.2 Install Docker and Dependencies
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

# Install tools
sudo apt install -y git curl wget unzip htop

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

**Visual Reference - Firewall Configuration:**
![UFW Firewall Setup](attached_assets/Screenshot%202025-08-03%20at%206.29.36%20PM_1754260185184.png)

✅ **Firewall configured successfully!** Your server is now secured.

```bash
# Logout and login for Docker group changes
exit
```

## Step 3: SSL Certificate (Let's Encrypt)

```bash
# SSH back in
ssh -i ~/Downloads/LightsailDefaultKey-us-east-1.pem ubuntu@YOUR_STATIC_IP

# Install Certbot
sudo apt install -y snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate for ricks-picks.football
sudo certbot certonly --standalone -d ricks-picks.football -d www.ricks-picks.football

# When prompted:
# Email: rickspickscfb@gmail.com
# Terms: Yes (Y)
# Share email with EFF: No (N) - optional

**SSL Certificate Success Output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/ricks-picks.football/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/ricks-picks.football/privkey.pem
This certificate expires on 2025-11-01.
Certbot has set up a scheduled task to automatically renew this certificate in the background.
```

✅ **SSL certificates successfully created and auto-renewal configured!**

# Set up auto-renewal (Certbot automatically sets this up)
# Manual cron setup (optional, already done automatically):
# sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 4: Deploy Rick's Picks Application

### 4.1 Clone Main Branch
```bash
# Create app directory
mkdir -p /home/ubuntu/ricks-picks
cd /home/ubuntu/ricks-picks

# Clone your main branch
git clone https://github.com/PDKCbus/CollegeForecastPro.git .
git checkout main
```

✅ **COMPLETED**: Repository cloned, now at main branch

### 4.2 Install Node.js and Dependencies
```bash
# Install Node.js and npm (required for package management)
sudo apt update
sudo apt install nodejs npm -y

# Verify installation
node --version
npm --version

# Install project dependencies (fixes Docker build issues)
npm install
```

**Note**: This resolves package-lock.json sync issues that can cause Docker builds to fail.

### 4.3 Configure Production Environment
```bash
# Create production environment file
vim .env.production
```

**Production .env.production Configuration (CURRENT STATUS):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:SecureRicksPicks2025!@db:5432/rickspicks
CFBD_API_KEY=KAqoGKrTLrTxJd5y/YJ+UhqsJFXnN4F6nHllM9VDFsE4sAR1F7CwI4BlKqB0A3DI
OPENWEATHER_API_KEY=c86af39e6eaab7b4f0e7a3e18e5ef4d5
VITE_GOOGLE_ADSENSE_CLIENT_ID=ca-pub-your-adsense-id-when-ready
SESSION_SECRET=RicksPicksFootballSecureSessionSecret2025VeryLongAndSecureString123!
POSTGRES_DB=rickspicks
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SecureRicksPicks2025!
```

✅ **COMPLETED**: Environment file configured with working API keys

### 4.4 Install Nginx and Copy Configuration
```bash
# Install nginx web server
sudo apt install nginx -y

# Copy the project nginx configuration to system location
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test configuration (will fail until Docker containers are running)
sudo nginx -t
```

✅ **COMPLETED**: Nginx installed and configured

### 4.5 Deploy with Docker
```bash
# Build and start Docker containers (this may take several minutes first time)
docker-compose up -d --build

# Check container status
docker-compose ps

# View application logs
docker-compose logs -f app
```

**Expected Output After Successful Build:**
```
Name                    Command               State                         Ports
app_1                   docker-entrypoint.sh npm ...   Up      0.0.0.0:5000->5000/tcp
db_1                    docker-entrypoint.sh postgres  Up      5432/tcp
nginx_1                 /docker-entrypoint.sh nginx   Up      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 4.6 Configure SSL Certificates for Nginx
```bash
# Create SSL certificate directory for nginx
sudo mkdir -p /etc/ssl/certs

# Copy Let's Encrypt certificates to nginx expected location
sudo cp /etc/letsencrypt/live/ricks-picks.football/fullchain.pem /etc/ssl/certs/
sudo cp /etc/letsencrypt/live/ricks-picks.football/privkey.pem /etc/ssl/certs/

# Test nginx configuration (should work now that containers are running)
sudo nginx -t

# Start nginx with new configuration
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 5: Final Deployment Verification

### 5.1 Current Deployment Status

**COMPLETED STEPS:**
✅ AWS Lightsail instance created with static IP (44.205.204.78)  
✅ DNS configured: ricks-picks.football → static IP  
✅ SSL certificates created with Let's Encrypt  
✅ Repository cloned to `/home/ubuntu/ricks-picks`  
✅ Production environment file configured with working API keys  
✅ Nginx installed and configuration copied  

**CURRENT STEP: Pull Updated Dockerfile and Build Docker Containers**
```bash
# From /home/ubuntu/ricks-picks directory:

# Pull the fixed Dockerfile from main branch
git pull origin main

# Clean Docker cache and rebuild with fixed Dockerfile
docker-compose down
docker system prune -af
docker-compose --env-file .env.production build --no-cache
docker-compose --env-file .env.production up -d

# Fix port conflict and start containers (NEXT)
sudo systemctl stop nginx
sudo systemctl disable nginx
docker-compose --env-file .env.production down
docker-compose --env-file .env.production up -d

# Verify deployment
docker-compose --env-file .env.production ps
curl -I http://localhost
```

**Note**: The `--no-cache` flag forces Docker to rebuild all layers, fixing package-lock.json sync issues. The `--env-file .env.production` ensures your API keys are properly loaded.

### 5.2 Initialize Database
```bash
# Run database migrations (after Docker is running)
docker-compose exec app npm run db:push
```

## Step 6: Verify Deployment

### 6.1 Health Checks
```bash
# Test local health
curl http://localhost/api/health

# Test external access
curl https://ricks-picks.football/api/health
```

### 6.2 Algorithm Verification
Visit these URLs to verify your enhanced algorithm is working:

- **Home**: https://ricks-picks.football
- **Featured Game**: https://ricks-picks.football/games/82967
- **Algorithm Test**: Check for "🤓 ANALYSIS PICK" predictions
- **Edge Detection**: Look for games with high confidence and Vegas disagreement

## Step 7: Production Monitoring

### 7.1 Automated Backups
```bash
# Create backup script
nano ~/backup-db.sh

# Add content:
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker-compose exec -T db pg_dump -U postgres rickspicks > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# Make executable and schedule
chmod +x ~/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -
```

### 7.2 Application Monitoring
```bash
# Create app monitor
nano ~/monitor.sh

# Add content:
#!/bin/bash
if ! curl -f -s https://ricks-picks.football/api/health > /dev/null; then
    echo "$(date): App down, restarting..." >> /var/log/app-monitor.log
    cd /home/ubuntu/ricks-picks
    docker-compose restart app
fi

# Schedule monitoring
chmod +x ~/monitor.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/monitor.sh") | crontab -
```

### 7.3 Update Script
```bash
# Create update script for future deployments
nano ~/update-app.sh

# Add content:
#!/bin/bash
cd /home/ubuntu/ricks-picks
git pull origin main
docker-compose --env-file .env.production down
docker-compose --env-file .env.production up -d --build
docker system prune -f

chmod +x ~/update-app.sh
```

## Step 8: Performance Optimization

### 8.1 Add Swap (for smaller instances)
```bash
# Create 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 8.2 Log Rotation
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/docker-ricks-picks

# Add:
/var/lib/docker/containers/*/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 root root
}
```

## Step 9: Go Live Checklist

### Pre-Launch:
- [ ] Domain `ricks-picks.football` points to Lightsail IP
- [ ] SSL certificate valid and auto-renewing
- [ ] All API keys configured in .env.production
- [ ] Google AdSense account ready
- [ ] Database initialized with schema
- [ ] Monitoring and backups configured

### Post-Launch Verification:
- [ ] Homepage loads: https://ricks-picks.football
- [ ] Algorithm predictions working (52.9% ATS)
- [ ] "🤓 ANALYSIS PICK" labels showing
- [ ] Reddit sentiment integration working
- [ ] Game analysis pages functional
- [ ] Mobile responsive design working
- [ ] SSL A+ rating (test at ssllabs.com)

## Step 10: Algorithm Performance Monitoring

Your enhanced algorithm includes:
- **SP+ Integration**: Achieving 52.9% ATS accuracy
- **Player Efficiency**: Video game-style ratings
- **Team Efficiency**: Roster talent analysis  
- **Momentum Analysis**: Recent performance trends
- **Live Edge Detection**: Finding value vs Vegas lines

Monitor performance via:
```bash
# Check algorithm logs
docker-compose logs app | grep "Algorithm"
docker-compose logs app | grep "edge detected"
```

## Troubleshooting

### Common Issues:

1. **Domain not resolving**: Check DNS propagation (24-48 hours)
2. **SSL errors**: Verify certificate paths in nginx.conf
3. **Database connection**: Check .env.production DATABASE_URL
4. **Algorithm not loading**: Verify CFBD_API_KEY is valid
5. **Memory issues**: Add swap file or upgrade instance

### Performance Monitoring:
```bash
# System resources
htop
free -h
df -h

# Docker stats
docker stats
docker-compose logs -f app
```

## Cost Breakdown

**Monthly AWS Costs:**
- Lightsail Instance (2GB): $12 or (4GB): $24
- Static IP: $5  
- SSL Certificate: Free (Let's Encrypt)
- Data Transfer: Included (3TB or 4TB)
- **Total: $17-29/month** (FREE for first 90 days!)

## Scaling Path

As traffic grows:
1. **Start**: $12/month (2GB RAM, 2 vCPU) - Perfect for launch
2. **Scale Up**: $24/month (4GB RAM, 2 vCPU) - Handle more traffic  
3. **Growth**: $44/month (8GB RAM, 2 vCPU) - High traffic
4. **Enterprise**: Load Balancer + Multiple instances
5. **Advanced**: Managed Database + CDN

---

**Your Rick's Picks platform with enhanced 52.9% ATS algorithm is now ready for production deployment on ricks-picks.football!**