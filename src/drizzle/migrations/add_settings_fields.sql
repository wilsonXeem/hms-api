-- Add settings fields to users table
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN notification_settings JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN security_settings JSONB DEFAULT '{}';

-- Add settings fields to tenants table  
ALTER TABLE tenants ADD COLUMN facility_settings JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN system_settings JSONB DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
CREATE INDEX idx_users_notification_settings ON users USING GIN (notification_settings);
CREATE INDEX idx_users_security_settings ON users USING GIN (security_settings);
CREATE INDEX idx_tenants_facility_settings ON tenants USING GIN (facility_settings);
CREATE INDEX idx_tenants_system_settings ON tenants USING GIN (system_settings);