export { db } from '../config/db.config';

// Multi-tenancy
export { tenants } from '../models/tenants.model';
export { facilities } from '../models/facilities.model';

// Auth & Users
export { users } from '../models/users.model';
export { userSessions } from '../models/user-sessions.model';
export { roles, userRoles } from '../models/roles.model';

// Patients
export { patients } from '../models/patients.model';
export { patientAllergies } from '../models/patient-allergies.model';
export { patientConditions } from '../models/patient-conditions.model';
export { vitals } from '../models/vitals.model';

// Admissions
export { wards } from '../models/wards.model';
export { beds } from '../models/beds.model';
export { admissions } from '../models/admissions.model';
export { admissionCharges } from '../models/admission-charges.model';
export { roomCharges } from '../models/room-charges.model';

// Clinical
export { appointments } from '../models/appointments.model';
export { consultations } from '../models/consultations.model';

// Prescriptions
export { prescriptions } from '../models/prescriptions.model';
export { prescriptionItems } from '../models/prescription-items.model';
export { prescriptionRefills } from '../models/prescription-refills.model';

// Pharmacy
export { drugCatalog } from '../models/drug-catalog.model';
export { dispensations } from '../models/dispensations.model';
export { controlledSubstances, controlledSubstanceLog } from '../models/controlled-substances.model';

// Lab
export { testCatalog } from '../models/test-catalog.model';
export { labRequests } from '../models/lab-requests.model';
export { labResults } from '../models/lab-results.model';
export { sampleTracking } from '../models/sample-tracking.model';
export { equipmentCalibration } from '../models/equipment-calibration.model';
export { resultTemplates } from '../models/result-templates.model';
export { externalLabConfigs } from '../models/external-lab-configs.model';
export { labAnalytics } from '../models/lab-analytics.model';
export { qualityControlChecks } from '../models/quality-control.model';

// Inventory
export { inventoryItems } from '../models/inventory-items.model';
export { inventoryBatches } from '../models/inventory-batches.model';
export { stockMovements } from '../models/stock-movements.model';
export { purchaseOrders } from '../models/purchase-orders.model';

// Payments & Documents
export { payments } from '../models/payments.model';
export { documents, documentCategories, documentNotifications } from '../models/documents.model';

// Modules & Subscriptions
export { moduleCatalog } from '../models/module-catalog.model';
export { modulePackages } from '../models/module-packages.model';
export { moduleConfigurations } from '../models/module-configurations.model';
export { tenantSubscriptions } from '../models/tenant-subscriptions.model';
export { modulePermissions } from '../models/module-permissions.model';
export { moduleUsage } from '../models/module-usage.model';

// System
export { notifications } from '../models/notifications.model';
export { activityLogs } from '../models/activity-logs.model';
export { contactSubmissions } from '../models/contact-submissions.model';
