#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
    echo "Error: CRON_SECRET environment variable is not set"
    exit 1
fi

# Make the curl request
curl --fail -X POST http://localhost:3000/api/cron/retry \
  --header "Authorization: Bearer $CRON_SECRET" \
  --header "Content-Type: application/json"

echo "Cron job completed"
