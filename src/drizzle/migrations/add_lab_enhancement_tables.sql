-- Add sample tracking table
CREATE TABLE IF NOT EXISTS "sample_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"request_id" uuid,
	"barcode" varchar(50) NOT NULL,
	"sample_type" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'collected' NOT NULL,
	"current_location" varchar(100),
	"collected_at" timestamp DEFAULT now(),
	"tracking_events" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sample_tracking_barcode_unique" UNIQUE("barcode")
);

-- Add equipment calibration table
CREATE TABLE IF NOT EXISTS "equipment_calibration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"equipment_name" varchar(100) NOT NULL,
	"model" varchar(100),
	"serial_number" varchar(100),
	"last_calibration_date" date,
	"next_calibration_date" date,
	"calibration_status" varchar(20) DEFAULT 'current',
	"performed_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add result templates table
CREATE TABLE IF NOT EXISTS "result_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"test_type" varchar(100) NOT NULL,
	"fields" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"version" varchar(10) DEFAULT '1.0',
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add external lab configs table
CREATE TABLE IF NOT EXISTS "external_lab_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"lab_name" varchar(100) NOT NULL,
	"api_endpoint" varchar(255) NOT NULL,
	"integration_type" varchar(20) NOT NULL,
	"credentials" jsonb,
	"is_active" boolean DEFAULT true,
	"connection_status" varchar(20) DEFAULT 'disconnected',
	"last_sync_time" timestamp,
	"auto_sync" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "sample_tracking" ADD CONSTRAINT "sample_tracking_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "sample_tracking" ADD CONSTRAINT "sample_tracking_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "sample_tracking" ADD CONSTRAINT "sample_tracking_request_id_lab_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "lab_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "equipment_calibration" ADD CONSTRAINT "equipment_calibration_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "equipment_calibration" ADD CONSTRAINT "equipment_calibration_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "result_templates" ADD CONSTRAINT "result_templates_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "result_templates" ADD CONSTRAINT "result_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "external_lab_configs" ADD CONSTRAINT "external_lab_configs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;