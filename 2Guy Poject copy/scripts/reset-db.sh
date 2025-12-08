#!/bin/bash

# Reset Database Script
# Deletes the current database and optionally seeds demo data

set -e

DB_PATH="./data/app.db"

echo "🗑️  Removing existing database..."
rm -f "$DB_PATH"

if [ "$1" == "--seed" ]; then
  echo "🌱 Starting server with demo data seeding enabled..."
  SEED_DB=true npm run serve
else
  echo "✨ Starting server with empty database (no seeding)..."
  npm run serve
fi
