import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from './users.model';
import { patients } from './patients.model';

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id),
  documentType: varchar("document_type", { length: 100 }),
  relatedTo: varchar("related_to", { length: 50 }),
  relatedId: uuid("related_id"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  description: text("description"),
  ocrProcessed: boolean("ocr_processed").default(false),
  ocrContent: text("ocr_content"),
  // Permissions
  accessLevel: varchar("access_level", { length: 20 }).default('private'),
  permissions: jsonb("permissions"),
  sharedWith: jsonb("shared_with"),
  // Categories & Tags
  categoryId: uuid("category_id"),
  tags: jsonb("tags"),
  folder: varchar("folder", { length: 255 }),
  // Notifications
  expirationDate: timestamp("expiration_date"),
  reminderDate: timestamp("reminder_date"),
  // Mobile
  capturedFromMobile: boolean("captured_from_mobile").default(false),
  location: jsonb("location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentCategories = pgTable("document_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  parentId: uuid("parent_id"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documentNotifications = pgTable("document_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  type: varchar("type", { length: 20 }).notNull(),
  message: text("message").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sent: boolean("sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
