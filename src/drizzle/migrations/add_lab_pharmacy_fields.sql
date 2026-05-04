-- Add new fields to lab_requests table
ALTER TABLE lab_requests ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'routine';

-- Add new fields to lab_results table
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS result_value VARCHAR(100);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS unit VARCHAR(20);
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'normal';
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false;

-- Add new fields to dispensations table
ALTER TABLE dispensations ADD COLUMN IF NOT EXISTS patient_counseled BOOLEAN DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lab_results_critical ON lab_results(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_lab_requests_priority ON lab_requests(priority);
CREATE INDEX IF NOT EXISTS idx_dispensations_patient_counseled ON dispensations(patient_counseled);