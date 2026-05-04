-- Create wards table
CREATE TABLE IF NOT EXISTS "wards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"department" varchar(100),
	"floor" integer,
	"total_beds" integer DEFAULT 0,
	"available_beds" integer DEFAULT 0,
	"ward_type" varchar(50) DEFAULT 'general',
	"is_active" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create beds table
CREATE TABLE IF NOT EXISTS "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"ward_id" uuid,
	"bed_number" varchar(20) NOT NULL,
	"bed_type" varchar(50) DEFAULT 'general',
	"is_occupied" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"current_patient_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create admissions table
CREATE TABLE IF NOT EXISTS "admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid,
	"patient_id" uuid,
	"admission_number" varchar(50) UNIQUE NOT NULL,
	"admission_type" varchar(50) NOT NULL,
	"admission_date" timestamp NOT NULL,
	"discharge_date" timestamp,
	"bed_id" uuid,
	"ward_id" uuid,
	"admitting_doctor_id" uuid,
	"discharging_doctor_id" uuid,
	"status" varchar(20) DEFAULT 'admitted',
	"admission_reason" text,
	"discharge_reason" text,
	"discharge_summary" text,
	"total_charges" numeric(10,2) DEFAULT 0.00,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "wards" ADD CONSTRAINT "wards_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "beds" ADD CONSTRAINT "beds_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_patient_id_patients_id_fk" FOREIGN KEY ("current_patient_id") REFERENCES "patients"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "admissions" ADD CONSTRAINT "admissions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admitting_doctor_id_users_id_fk" FOREIGN KEY ("admitting_doctor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_discharging_doctor_id_users_id_fk" FOREIGN KEY ("discharging_doctor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_wards_facility_id" ON "wards"("facility_id");
CREATE INDEX IF NOT EXISTS "idx_beds_facility_id" ON "beds"("facility_id");
CREATE INDEX IF NOT EXISTS "idx_beds_ward_id" ON "beds"("ward_id");
CREATE INDEX IF NOT EXISTS "idx_beds_occupied" ON "beds"("is_occupied");
CREATE INDEX IF NOT EXISTS "idx_admissions_facility_id" ON "admissions"("facility_id");
CREATE INDEX IF NOT EXISTS "idx_admissions_patient_id" ON "admissions"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_admissions_status" ON "admissions"("status");
CREATE INDEX IF NOT EXISTS "idx_admissions_date" ON "admissions"("admission_date");