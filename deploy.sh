#!/usr/bin/env bash
# One-command deploy for the admin panel (pm2 process "privily-admin").
# Run on the server:  bash /var/www/privily-admin/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
echo "==> pulling latest main"
git pull --ff-only origin main
echo "==> installing dependencies"
npm install --no-audit --no-fund
echo "==> building"
npm run build
echo "==> restarting pm2 process"
pm2 restart privily-admin --update-env
echo "==> last 15 log lines"
pm2 logs privily-admin --lines 15 --nostream
