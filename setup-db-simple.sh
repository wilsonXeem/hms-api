#!/bin/bash

echo "🏥 Setting up Hospital Management System Database..."

# Simple database setup for development
DB_NAME="hospital_management"
DB_USER="postgres"
DB_PASSWORD="postgres"

echo "📝 Creating database if it doesn't exist..."

# Try to create database using psql
psql -h localhost -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database $DB_NAME already exists or connection failed"

echo "✅ Database setup completed!"
echo "📊 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo "🔗 Connection URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "If PostgreSQL is not running, please:"
echo "1. Open Postgres.app"
echo "2. Click 'Start' to start the server"
echo "3. Run this script again"