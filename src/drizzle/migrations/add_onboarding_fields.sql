-- Add onboarding fields to facilities table
ALTER TABLE facilities 
ADD COLUMN about_content TEXT,
ADD COLUMN services_offered JSON,
ADD COLUMN logo_url VARCHAR(255),
ADD COLUMN social_media_links JSON;

-- Update existing facilities with default values
UPDATE facilities 
SET 
  about_content = COALESCE(description, 'Welcome to our healthcare facility'),
  services_offered = COALESCE(services, '[]'::json),
  social_media_links = '{}'::json
WHERE about_content IS NULL;