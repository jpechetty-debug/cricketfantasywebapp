#!/usr/bin/env bash
# Exit on error
set -o errexit

# 1. Build the React frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..
