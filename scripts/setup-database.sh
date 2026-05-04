#!/bin/bash

# Hospital Management System Database Setup Script
echo "🏥 Setting up Hospital Management System Database..."

# Database configuration - Use environment variables
DB_NAME="${DB_NAME:-hospital_management}"
DB_USER="${DB_USER:-hms_user}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB_PASSWORD environment variable is required for security"
    echo "   Set it with: export DB_PASSWORD='your_secure_password'"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   macOS: brew services start postgresql"
    echo "   Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create database user if it doesn't exist
echo "📝 Creating database user..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User $DB_USER already exists"

# Create database if it doesn't exist
echo "📝 Creating database..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database $DB_NAME already exists"

# Grant privileges
echo "📝 Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"

echo "✅ Database setup completed!"
echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🔗 Connection URL: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"