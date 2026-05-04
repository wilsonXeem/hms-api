-- Insert tenant
INSERT INTO tenants (name, domain, subscription_plan, is_active) 
VALUES ('Demo Hospital', 'demo-hospital', 'premium', true)
ON CONFLICT (domain) DO NOTHING;

-- Insert facility
INSERT INTO facilities (tenant_id, name, address, phone, email, license_number, is_active)
SELECT t.id, 'Main Hospital', '123 Healthcare Street, Medical City', '+1-555-0123', 'info@demohospital.com', 'LIC-2024-001', true
FROM tenants t WHERE t.domain = 'demo-hospital'
ON CONFLICT DO NOTHING;

-- Insert admin user
INSERT INTO users (facility_id, first_name, last_name, email, password_hash, role, department, phone, is_active)
SELECT f.id, 'System', 'Administrator', 'admin@demohospital.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administration', '+1-555-0100', true
FROM facilities f 
JOIN tenants t ON f.tenant_id = t.id 
WHERE t.domain = 'demo-hospital'
ON CONFLICT (email) DO NOTHING;

-- Insert doctor user
INSERT INTO users (facility_id, first_name, last_name, email, password_hash, role, department, phone, is_active)
SELECT f.id, 'Dr. Sarah', 'Johnson', 'doctor@demohospital.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'doctor', 'General Medicine', '+1-555-0101', true
FROM facilities f 
JOIN tenants t ON f.tenant_id = t.id 
WHERE t.domain = 'demo-hospital'
ON CONFLICT (email) DO NOTHING;

-- Insert nurse user
INSERT INTO users (facility_id, first_name, last_name, email, password_hash, role, department, phone, is_active)
SELECT f.id, 'Mary', 'Williams', 'nurse@demohospital.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'nurse', 'General Ward', '+1-555-0102', true
FROM facilities f 
JOIN tenants t ON f.tenant_id = t.id 
WHERE t.domain = 'demo-hospital'
ON CONFLICT (email) DO NOTHING;