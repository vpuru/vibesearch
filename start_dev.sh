#!/bin/bash

# Start Flask backend server
echo "Starting Flask backend server..."
cd "$(dirname "$0")/backend"

# Activate the virtual environment
source venv/bin/activate || { echo "Failed to activate virtual environment"; exit 1; }

# Start Flask server in background
python run.py &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Give the backend a moment to start
sleep 3

# Start frontend development server
echo "Starting frontend development server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Function to handle script termination
cleanup() {
  echo "Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Development environment started. Press Ctrl+C to stop."
wait