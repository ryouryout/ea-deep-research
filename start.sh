#!/bin/bash

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start the server
echo "Starting EA Deep Research server..."
cd "$(dirname "$0")"
node server.js