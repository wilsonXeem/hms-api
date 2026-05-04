ALTER TABLE "patients" ALTER COLUMN "marital_status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "next_of_kin_name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "visit_priority" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "payment_category" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "hmo_provider" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "patients" ALTER COLUMN "hmo_number" SET DATA TYPE varchar(50);