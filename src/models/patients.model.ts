import {
  pgTable, uuid, varchar, text, date, timestamp, boolean
} from "drizzle-orm/pg-core";
import { facilities } from './facilities.model';

export const patients = pgTable("patients", {
  id:                           uuid("id").defaultRandom().primaryKey(),
  facilityId:                   uuid("facility_id").references(() => facilities.id, { onDelete: 'cascade' }),
  patientCode:                  varchar("patient_code", { length: 50 }).unique().notNull(),
  firstName:                    varchar("first_name", { length: 100 }).notNull(),
  middleName:                   varchar("middle_name", { length: 100 }),
  lastName:                     varchar("last_name", { length: 100 }).notNull(),
  email:                        varchar("email", { length: 150 }).unique(),
  gender:                       varchar("gender", { length: 10 }),
  dob:                          date("dob"),
  phone:                        varchar("phone", { length: 50 }),
  alternatePhone:               varchar("alternate_phone", { length: 50 }),
  nationalId:                   varchar("national_id", { length: 50 }).unique(),
  address:                      text("address"),
  maritalStatus:                varchar("marital_status", { length: 20 }),
  occupation:                   varchar("occupation", { length: 100 }),
  // Emergency contact
  emergencyContact:             varchar("emergency_contact", { length: 100 }),
  emergencyContactPhone:        varchar("emergency_contact_phone", { length: 50 }),
  emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 50 }),
  // Next of kin
  nextOfKinName:                varchar("next_of_kin_name", { length: 100 }),
  nextOfKinPhone:               varchar("next_of_kin_phone", { length: 50 }),
  nextOfKinRelationship:        varchar("next_of_kin_relationship", { length: 50 }),
  nextOfKinAddress:             text("next_of_kin_address"),
  // Medical
  bloodGroup:                   varchar("blood_group", { length: 10 }),
  genotype:                     varchar("genotype", { length: 10 }),
  knownAllergies:               text("known_allergies"),
  chronicConditions:            text("chronic_conditions"),
  currentMedications:           text("current_medications"),
  // Visit
  registrationType:             varchar("registration_type", { length: 50 }),
  visitReason:                  text("visit_reason"),
  serviceNeeded:                varchar("service_needed", { length: 100 }),
  visitPriority:                varchar("visit_priority", { length: 20 }),
  // Payment
  paymentCategory:              varchar("payment_category", { length: 30 }),
  hmoProvider:                  varchar("hmo_provider", { length: 100 }),
  hmoNumber:                    varchar("hmo_number", { length: 50 }),
  // Consent
  consentToTreatment:           boolean("consent_to_treatment").default(false),
  consentToDataProcessing:      boolean("consent_to_data_processing").default(false),
  smsConsent:                   boolean("sms_consent").default(false),
  // Timestamps
  createdAt:                    timestamp("created_at").defaultNow(),
  updatedAt:                    timestamp("updated_at").defaultNow(),
});
