#!/bin/bash

# CircaV2 Migration Project Setup Script
# This script sets up the development environment for the project

echo "🚀 Setting up CircaV2 Migration Project..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    brew install node
fi

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "📦 Installing Python3..."
    brew install python
fi

# Check if PostgreSQL is installed (needed for psycopg2-binary)
if ! command -v pg_config &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    brew install postgresql
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "🐍 Setting up Python virtual environment..."
# Remove existing venv if it exists
if [ -d ".venv" ]; then
    rm -rf .venv
fi

# Create new virtual environment
python3 -m venv .venv

# Activate virtual environment and install dependencies
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure you have a .env file with your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. For Python scripts, activate the virtual environment with 'source .venv/bin/activate'"
echo ""
echo "🌐 Development server will be available at: http://localhost:8080" 