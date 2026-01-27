#!/bin/bash

# Example curl commands for testing the n8n webhook
# Replace YOUR_N8N_URL with your actual n8n webhook URL

N8N_URL="${N8N_WEBHOOK_URL:-https://n8n.wastrilith2k.net/webhook/search}"

echo "Testing n8n webhook at: $N8N_URL"
echo "---"

# Basic search
echo "1. Basic search for 'meeting notes':"
curl -s -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "meeting notes"}' | jq '.'

echo ""
echo "---"

# Search for project-related content
echo "2. Search for 'project plan':"
curl -s -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "project plan"}' | jq '.'

echo ""
echo "---"

# Search with special characters
echo "3. Search with date range:"
curl -s -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "2024 budget"}' | jq '.'

echo ""
echo "---"

# Verbose output for debugging
echo "4. Verbose request (for debugging):"
curl -v -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

echo ""
echo "---"

# Test with timing
echo "5. Search with timing:"
time curl -s -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "important"}' | jq '.totalResults'

echo ""
echo "---"

# Check just the response headers
echo "6. Check response headers:"
curl -s -I -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
