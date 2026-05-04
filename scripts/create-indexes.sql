-- Performance optimization indexes for Hospital Management System

-- Patient indexes
CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients(facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON patients(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_facility_status ON appointments(facility_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);

-- Admission indexes
CREATE INDEX IF NOT EXISTS idx_admissions_status_facility ON admissions(status, facility_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient_id ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_admission_date ON admissions(admission_date);
CREATE INDEX IF NOT EXISTS idx_admissions_bed_id ON admissions(bed_id) WHERE bed_id IS NOT NULL;

-- Consultation indexes
CREATE INDEX IF NOT EXISTS idx_consultations_patient_doctor ON consultations(patient_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_facility_date ON consultations(facility_id, consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_admission_id ON consultations(admission_id) WHERE admission_id IS NOT NULL;

-- Prescription indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescribed_by ON prescriptions(prescribed_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

-- Lab request indexes
CREATE INDEX IF NOT EXISTS idx_lab_requests_patient_id ON lab_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_lab_requests_requested_by ON lab_requests(requested_by);

-- Vitals indexes
CREATE INDEX IF NOT EXISTS idx_vitals_patient_created ON vitals(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_by ON vitals(recorded_by);

-- User session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_facility_id ON inventory_items(facility_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item_id ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);

-- Bed and ward indexes
CREATE INDEX IF NOT EXISTS idx_beds_ward_id ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_facility_status ON beds(facility_id, is_occupied);
CREATE INDEX IF NOT EXISTS idx_wards_facility_id ON wards(facility_id);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_facility_created ON activity_logs(facility_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patients_facility_created ON patients(facility_id, created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date_status ON appointments(doctor_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_date ON consultations(patient_id, consultation_date DESC);