#!/bin/bash

# Rick's Picks Monitoring Script
# Usage: ./scripts/monitor.sh

PROJECT_DIR="/home/ubuntu/ricks-picks"
LOG_DIR="/var/log/ricks-picks"
ALERT_EMAIL="your-email@domain.com"  # Replace with your email

# Create log directory
sudo mkdir -p $LOG_DIR

# Function to log with timestamp
log_message() {
    echo "$(date): $1" | sudo tee -a $LOG_DIR/monitor.log
}

# Function to send alert (configure with your preferred method)
send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Uncomment and configure your preferred alerting method:
    # echo "$message" | mail -s "Rick's Picks Alert" $ALERT_EMAIL
    # curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$message\"}" YOUR_SLACK_WEBHOOK
}

# Check application health
check_health() {
    if curl -f -s http://localhost/api/health > /dev/null; then
        log_message "Health check: PASSED"
        return 0
    else
        log_message "Health check: FAILED"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $usage -gt 85 ]; then
        send_alert "Disk usage is at ${usage}% - cleanup required"
    fi
}

# Check memory usage
check_memory() {
    local mem_usage=$(free | awk 'FNR==2{printf "%.2f", $3/($3+$4)*100}')
    local mem_usage_int=${mem_usage%.*}
    if [ $mem_usage_int -gt 90 ]; then
        send_alert "Memory usage is at ${mem_usage}% - high memory usage detected"
    fi
}

# Check Docker containers
check_containers() {
    cd $PROJECT_DIR
    local down_containers=$(docker-compose ps --filter "status=exited" -q | wc -l)
    if [ $down_containers -gt 0 ]; then
        send_alert "$down_containers container(s) are down"
        return 1
    fi
    return 0
}

# Main monitoring
log_message "Starting health check..."

# Perform checks
health_ok=true

if ! check_health; then
    health_ok=false
fi

if ! check_containers; then
    health_ok=false
fi

check_disk_space
check_memory

# If health check failed, attempt restart
if [ "$health_ok" = false ]; then
    log_message "Health check failed, attempting restart..."
    cd $PROJECT_DIR
    docker-compose restart app
    
    # Wait and check again
    sleep 30
    if check_health; then
        log_message "Restart successful"
        send_alert "Application was down but has been automatically restarted"
    else
        send_alert "Application is down and restart failed - manual intervention required"
    fi
fi

log_message "Monitoring check completed"