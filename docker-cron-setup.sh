#!/bin/bash
# Docker-based Cron Setup for Rick's Picks
# Alternative approach using docker exec commands

echo "🐳 Setting up Docker-based cron jobs for Rick's Picks..."

# Create cron jobs that execute within Docker container
cat > /tmp/ricks-picks-docker-cron << 'EOF'
# Rick's Picks Weekly Sync Schedule (Docker version)
# Uses docker exec to run commands inside container where ADMIN_API_KEY is available

# Monday 6:00 AM - Post-weekend comprehensive sync
0 6 * * 1 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-monday" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Tuesday 2:00 PM - AP Rankings sync
0 14 * * 2 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-rankings" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Wednesday 2:00 PM - Backup rankings sync
0 14 * * 3 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-rankings" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Thursday 6:00 PM - Mid-week betting lines
0 18 * * 4 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-thursday" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Friday 12:00 PM - Final prep
0 12 * * 5 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-friday" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Saturday 8:00 AM - Game day updates
0 8 * * 6 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-saturday" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

# Sunday 9:00 PM - Weekly wrap-up
0 21 * * 0 cd /home/ubuntu/ricks-picks && docker-compose --env-file .env.production exec -T app curl -X POST "http://localhost:3000/api/admin/sync-comprehensive" -H "Authorization: Bearer $ADMIN_API_KEY" >> /var/log/ricks-picks-sync.log 2>&1

EOF

# Install the cron jobs
crontab /tmp/ricks-picks-docker-cron

# Create log file
sudo touch /var/log/ricks-picks-sync.log
sudo chmod 644 /var/log/ricks-picks-sync.log

echo "✅ Docker-based cron jobs installed!"
echo ""
echo "🐳 This approach:"
echo "  ✅ Uses ADMIN_API_KEY from docker-compose environment"
echo "  ✅ No need to export variables on host system"
echo "  ✅ Runs commands inside container context"
echo ""
echo "📝 Logs: /var/log/ricks-picks-sync.log"
echo ""
echo "🔍 To verify cron jobs: crontab -l"
echo "📊 To check logs: tail -f /var/log/ricks-picks-sync.log"