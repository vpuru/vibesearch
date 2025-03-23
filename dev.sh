#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting VIBESearch development servers with hot reloading...${NC}"

# Determine the platform and set the appropriate command for opening new terminals
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  TERM_CMD="osascript -e 'tell app \"Terminal\" to do script \"cd $(pwd) && "
  TERM_END="\"'"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux with gnome-terminal
  if command -v gnome-terminal >/dev/null 2>&1; then
    TERM_CMD="gnome-terminal -- bash -c \"cd $(pwd) && "
    TERM_END="; exec bash\""
  # Linux with xterm
  elif command -v xterm >/dev/null 2>&1; then
    TERM_CMD="xterm -e \"cd $(pwd) && "
    TERM_END="; bash\""
  else
    echo "Could not find a supported terminal emulator"
    exit 1
  fi
else
  echo "Unsupported operating system"
  exit 1
fi

# Start backend server with hot reloading
echo -e "${YELLOW}Starting backend server...${NC}"
$TERM_CMD cd backend && python3 run.py --debug $TERM_END

# Wait a moment to allow backend to start
sleep 1

# Start frontend server with hot reloading
echo -e "${YELLOW}Starting frontend server...${NC}"
$TERM_CMD cd frontend && npm run dev:hot $TERM_END

echo -e "${GREEN}Servers started:${NC}"
echo -e "${YELLOW}Backend:${NC} http://localhost:5000"
echo -e "${YELLOW}Frontend:${NC} http://localhost:8080"