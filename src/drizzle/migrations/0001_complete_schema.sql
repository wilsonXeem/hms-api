-- Complete Hospital Management System Schema

-- Tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(100) UNIQUE NOT NULL,
	"subscription_plan" varchar(50) DEFAULT 'basic' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Facilities table
CREATE TABLE IF NOT EXISTS "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"license_number" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) UNIQUE NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"phone" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade
);

-- Patients table
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_code" varchar(50) UNIQUE NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"gender" varchar(10),
	"dob" date,
	"phone" varchar(20),
	"address" text,
	"emergency_contact" varchar(255),
	"blood_group" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patients_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade
);

-- Consultations table
CREATE TABLE IF NOT EXISTS "consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"diagnosis" text,
	"notes" text,
	"recommended_tests" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consultations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade,
	CONSTRAINT "consultations_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Vitals table
CREATE TABLE IF NOT EXISTS "vitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"blood_pressure" varchar(20),
	"temperature" decimal(4,1),
	"pulse" integer,
	"respiration" integer,
	"weight" decimal(5,2),
	"height" decimal(5,2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vitals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade,
	CONSTRAINT "vitals_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Prescriptions table
CREATE TABLE IF NOT EXISTS "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"prescribed_by" uuid NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE cascade,
	CONSTRAINT "prescriptions_prescribed_by_users_id_fk" FOREIGN KEY ("prescribed_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Prescription Items table
CREATE TABLE IF NOT EXISTS "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"drug_id" uuid,
	"dosage" varchar(100) NOT NULL,
	"frequency" varchar(100) NOT NULL,
	"duration" varchar(100) NOT NULL,
	"quantity_prescribed" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE cascade
);

-- Lab Requests table
CREATE TABLE IF NOT EXISTS "lab_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" uuid,
	"patient_id" uuid NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"requested_by" uuid NOT NULL,
	"assigned_lab_id" uuid NOT NULL,
	"priority" varchar(20) DEFAULT 'routine' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_requests_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE cascade,
	CONSTRAINT "lab_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade,
	CONSTRAINT "lab_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Lab Results table
CREATE TABLE IF NOT EXISTS "lab_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"result_value" varchar(255),
	"unit" varchar(50),
	"normal_range" varchar(100),
	"validation_status" varchar(20) DEFAULT 'normal',
	"is_critical" boolean DEFAULT false,
	"notes" text,
	"tested_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_results_request_id_lab_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "lab_requests"("id") ON DELETE cascade,
	CONSTRAINT "lab_results_tested_by_users_id_fk" FOREIGN KEY ("tested_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Inventory Items table
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"min_stock_level" integer DEFAULT 10 NOT NULL,
	"max_stock_level" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade
);

-- Inventory Batches table
CREATE TABLE IF NOT EXISTS "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"batch_number" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"cost_price" decimal(10,2) NOT NULL,
	"selling_price" decimal(10,2) NOT NULL,
	"expiry_date" date,
	"supplier" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_batches_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE cascade
);

-- Dispensations table
CREATE TABLE IF NOT EXISTS "dispensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_item_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"quantity_dispensed" integer NOT NULL,
	"dispensed_by" uuid NOT NULL,
	"patient_counseled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dispensations_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "prescription_items"("id") ON DELETE cascade,
	CONSTRAINT "dispensations_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE cascade,
	CONSTRAINT "dispensations_dispensed_by_users_id_fk" FOREIGN KEY ("dispensed_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Payments table
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"department" varchar(100) NOT NULL,
	"reference_code" varchar(100) UNIQUE NOT NULL,
	"amount" decimal(10,2) NOT NULL,
	"method" varchar(50),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"transaction_id" varchar(255),
	"approved_by" uuid,
	"refund_amount" decimal(10,2),
	"refund_reason" text,
	"refunded_by" uuid,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade,
	CONSTRAINT "payments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id"),
	CONSTRAINT "payments_refunded_by_users_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "users"("id")
);

-- Documents table
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"related_to" varchar(50) NOT NULL,
	"related_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"performed_by" uuid NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "activity_logs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade,
	CONSTRAINT "activity_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE cascade
);

-- Appointments table
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" varchar(10) NOT NULL,
	"duration" varchar(20) DEFAULT '30 minutes',
	"reason" text,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade,
	CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade,
	CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Test Catalog table
CREATE TABLE IF NOT EXISTS "test_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"normal_range" varchar(100),
	"unit" varchar(50),
	"price" decimal(10,2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_catalog_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade
);

-- Drug Catalog table
CREATE TABLE IF NOT EXISTS "drug_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"category" varchar(100) NOT NULL,
	"dosage_form" varchar(100),
	"strength" varchar(100),
	"interactions" text,
	"contraindications" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drug_catalog_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade
);

-- Patient Allergies table
CREATE TABLE IF NOT EXISTS "patient_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergen" varchar(255) NOT NULL,
	"severity" varchar(50) NOT NULL,
	"reaction" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade
);

-- Patient Conditions table
CREATE TABLE IF NOT EXISTS "patient_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"condition_name" varchar(255) NOT NULL,
	"diagnosed_date" date,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_conditions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE cascade
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_users_facility_id" ON "users" ("facility_id");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_patients_facility_id" ON "patients" ("facility_id");
CREATE INDEX IF NOT EXISTS "idx_patients_patient_code" ON "patients" ("patient_code");
CREATE INDEX IF NOT EXISTS "idx_consultations_patient_id" ON "consultations" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_consultations_doctor_id" ON "consultations" ("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_lab_requests_patient_id" ON "lab_requests" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_lab_requests_status" ON "lab_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_appointments_doctor_id" ON "appointments" ("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments" ("appointment_date");
CREATE INDEX IF NOT EXISTS "idx_payments_patient_id" ON "payments" ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "idx_inventory_batches_expiry" ON "inventory_batches" ("expiry_date");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_facility_id" ON "activity_logs" ("facility_id");