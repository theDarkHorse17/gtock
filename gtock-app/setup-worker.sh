#!/bin/bash

# gtock Worker Setup Script
# This script sets up the Cloudflare Worker with the service account

echo "=== gtock Worker Setup ==="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Login to Cloudflare
echo "Logging in to Cloudflare..."
wrangler login

# Create the worker secret with the service account
echo ""
echo "Setting up service account..."
echo "Please paste your service account JSON key when prompted:"
echo ""

# Read the service account JSON from stdin
SERVICE_ACCOUNT_JSON=$(cat)

# Store the secret
echo "$SERVICE_ACCOUNT_JSON" | wrangler secret put SERVICE_ACCOUNT

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Deploy the worker: wrangler deploy"
echo "2. Copy the worker URL and add it to your .env file"
echo "3. Share your Google Drive folders with: gtock-api@gtock-501911.iam.gserviceaccount.com"
echo ""
echo "Worker URL format: https://gtock-cors.your-subdomain.workers.dev"
