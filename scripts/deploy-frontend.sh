#!/bin/bash
# Frontend deployment script for Rick's Picks production environment

echo "🏗️  Building and deploying frontend for Rick's Picks..."

# Build frontend inside the container
docker-compose --env-file .env.production exec app sh -c "
  echo 'Building frontend with Vite...'
  npx vite build

  echo 'Creating server/public directory...'
  mkdir -p /app/server/public

  echo 'Deploying frontend files...'
  if [ -d '/app/dist/public' ]; then
    cp -r /app/dist/public/* /app/server/public/
    echo '✅ Frontend deployed from dist/public'
  else
    cp -r /app/dist/* /app/server/public/
    echo '✅ Frontend deployed from dist'
  fi


  echo 'Frontend files deployed:'
  ls -la /app/server/public/
"

echo "🚀 Frontend deployment complete!"
echo "Platform should now be accessible at https://ricks-picks.football"