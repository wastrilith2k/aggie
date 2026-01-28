#!/bin/bash
# Sync .env variables to GitHub Secrets
# Usage: ./scripts/sync-env-to-gh.sh [path/to/.env]

ENV_FILE="${1:-frontend/.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

echo "Reading secrets from $ENV_FILE..."

# Read .env and set each variable as a GitHub secret
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    # Extract key and value
    key="${line%%=*}"
    value="${line#*=}"

    # Skip if no key or value
    [[ -z "$key" || -z "$value" ]] && continue

    echo "Setting $key..."
    gh secret set "$key" --body "$value"
done < "$ENV_FILE"

echo "Done! Secrets synced to GitHub."
echo ""
echo "Current secrets:"
gh secret list
