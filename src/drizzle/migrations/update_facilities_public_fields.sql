-- Add missing public content fields to facilities table
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS website varchar(255),
ADD COLUMN IF NOT EXISTS emergency_contact varchar(50),
ADD COLUMN IF NOT EXISTS contact_email varchar(150),
ADD COLUMN IF NOT EXISTS contact_phone varchar(50),
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS mission text,
ADD COLUMN IF NOT EXISTS vision text,
ADD COLUMN IF NOT EXISTS services json,
ADD COLUMN IF NOT EXISTS departments json,
ADD COLUMN IF NOT EXISTS operating_hours json;

-- Add public booking fields to appointments table if not exists
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_public_booking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS patient_name varchar(255),
ADD COLUMN IF NOT EXISTS email varchar(255),
ADD COLUMN IF NOT EXISTS phone varchar(20);