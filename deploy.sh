#!/bin/bash

# Source NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js version 18
nvm use 18

# Pull the latest changes from the main branch
git pull origin main

# install pm2
npm install -g pm2
pnpm setup
source ~/.bashrc
pnpm install -g pm2

# Run the push and restart commands using pnpm
pnpm run push
pnpm run restart