ALTER TABLE "patients" ADD COLUMN "middle_name" varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "marital_status" varchar(30);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "occupation" varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "alternate_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "emergency_contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "emergency_contact_relationship" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_name" varchar(150);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_relationship" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_address" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "genotype" varchar(10);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "known_allergies" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "chronic_conditions" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "current_medications" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "registration_type" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "visit_reason" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "service_needed" varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "visit_priority" varchar(30);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "payment_category" varchar(50);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "hmo_provider" varchar(150);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "hmo_number" varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "consent_to_treatment" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "consent_to_data_processing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "sms_consent" boolean DEFAULT false;