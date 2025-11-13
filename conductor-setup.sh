#!/bin/bash

# Conductor Setup Script for Dorkroom
# This script sets up a new workspace with dependencies and environment configuration

set -e  # Exit on any error

echo "🚀 Starting Dorkroom workspace setup..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed on this system."
    echo "Please install Bun from https://bun.sh before setting up this workspace."
    exit 1
fi

echo "✓ Bun detected: $(bun --version)"

# Install dependencies
echo "📦 Installing dependencies with Bun..."
bun install

# Set up .env file
# Use CONDUCTOR_ROOT_PATH if available, otherwise assume we're in the root
ROOT_PATH="${CONDUCTOR_ROOT_PATH:-.}"

if [ -f "$ROOT_PATH/.env" ]; then
    echo "🔗 Symlinking .env from repository root..."
    ln -sf "$ROOT_PATH/.env" .env
    echo "✓ .env symlink created"

    # Validate required environment variables
    if ! grep -q "SUPABASE_ENDPOINT=" "$ROOT_PATH/.env" || ! grep -q "SUPABASE_MASTER_API_KEY=" "$ROOT_PATH/.env"; then
        echo "⚠️  Warning: .env file exists but may be missing required variables."
        echo "Please ensure SUPABASE_ENDPOINT and SUPABASE_MASTER_API_KEY are set."
        echo "See .env.example for reference."
    fi
else
    echo "⚠️  Warning: No .env file found at $ROOT_PATH/.env"

    # Check if we can create it (writable directory)
    if [ -w "$ROOT_PATH" ]; then
        echo "Creating .env from .env.example template at $ROOT_PATH/.env"
        cp .env.example "$ROOT_PATH/.env"
        ln -sf "$ROOT_PATH/.env" .env
        echo ""
        echo "⚠️  IMPORTANT: Please edit $ROOT_PATH/.env with your actual Supabase credentials!"
        echo "Required variables:"
        echo "  - SUPABASE_ENDPOINT"
        echo "  - SUPABASE_MASTER_API_KEY"
    else
        echo "Cannot create .env at $ROOT_PATH (read-only)"
        echo "Please manually create .env file with your Supabase credentials."
        echo "See .env.example for reference."
    fi
fi

echo ""
echo "✅ Workspace setup complete!"
echo ""
echo "Next steps:"
echo "  1. Verify your .env configuration at: $ROOT_PATH/.env"
echo "  2. Click 'Run' to start the development server"
echo ""
