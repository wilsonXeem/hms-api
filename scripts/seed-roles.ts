import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { config } from '../src/config/app.config';
import { facilities } from '../src/models/facilities.model';
import { roles } from '../src/models/roles.model';

const seedRoles = async () => {
  const client = postgres(config.database.url, { prepare: false });
  const db = drizzle(client);

  console.log('🌱 Seeding roles...');

  try {
    const [facility] = await db.select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.isActive, true))
      .limit(1);

    if (!facility) {
      console.error('❌ No active facility found. Run seed-database.ts first.');
      process.exit(1);
    }

    const roleData = [
      {
        name: 'System Administrator',
        description: 'Full access to all modules and system settings',
        isSystem: true,
        permissions: [
          'patients.read', 'patients.write',
          'appointments.read', 'appointments.write',
          'prescriptions.read', 'prescriptions.write',
          'inventory.read', 'inventory.write',
          'lab.read', 'lab.write',
          'pharmacy.read', 'pharmacy.write',
          'admissions.read', 'admissions.write',
          'billing.read', 'billing.write',
          'reports.read', 'reports.export',
          'admin.read', 'admin.write',
        ],
      },
      {
        name: 'Consultant Surgeon',
        description: 'Full clinical access — consultations, prescriptions, lab requests, admissions',
        isSystem: false,
        permissions: [
          'patients.read', 'patients.write',
          'appointments.read', 'appointments.write',
          'prescriptions.read', 'prescriptions.write',
          'lab.read', 'lab.write',
          'admissions.read', 'admissions.write',
          'reports.read',
        ],
      },
      {
        name: 'Medical Officer',
        description: 'Outpatient consultations, prescriptions and lab requests',
        isSystem: false,
        permissions: [
          'patients.read', 'patients.write',
          'appointments.read', 'appointments.write',
          'prescriptions.read', 'prescriptions.write',
          'lab.read', 'lab.write',
          'reports.read',
        ],
      },
      {
        name: 'Ward Nurse',
        description: 'Patient care, vitals recording and ward management',
        isSystem: false,
        permissions: [
          'patients.read',
          'appointments.read',
          'admissions.read', 'admissions.write',
          'prescriptions.read',
        ],
      },
      {
        name: 'Chief Pharmacist',
        description: 'Full pharmacy access including dispensing and drug catalog management',
        isSystem: false,
        permissions: [
          'patients.read',
          'prescriptions.read',
          'pharmacy.read', 'pharmacy.write',
          'inventory.read', 'inventory.write',
          'reports.read', 'reports.export',
        ],
      },
      {
        name: 'Pharmacist',
        description: 'Prescription dispensing and stock checks',
        isSystem: false,
        permissions: [
          'patients.read',
          'prescriptions.read',
          'pharmacy.read', 'pharmacy.write',
          'inventory.read',
        ],
      },
      {
        name: 'Lab Technician',
        description: 'Lab test processing, result entry and sample tracking',
        isSystem: false,
        permissions: [
          'patients.read',
          'lab.read', 'lab.write',
          'reports.read',
        ],
      },
      {
        name: 'Receptionist',
        description: 'Patient registration, appointment booking and payment collection',
        isSystem: false,
        permissions: [
          'patients.read', 'patients.write',
          'appointments.read', 'appointments.write',
          'billing.read', 'billing.write',
        ],
      },
      {
        name: 'Billing Officer',
        description: 'Payment processing, receipts and financial reports',
        isSystem: false,
        permissions: [
          'patients.read',
          'billing.read', 'billing.write',
          'reports.read', 'reports.export',
        ],
      },
      {
        name: 'Inventory Manager',
        description: 'Stock management, purchase orders and expiry tracking',
        isSystem: false,
        permissions: [
          'inventory.read', 'inventory.write',
          'reports.read', 'reports.export',
        ],
      },
    ];

    for (const r of roleData) {
      await db.insert(roles).values({
        facilityId: facility.id,
        name: r.name,
        description: r.description,
        permissions: JSON.stringify(r.permissions),
        isSystem: r.isSystem,
        isActive: true,
      });
      console.log(`✅ Role: ${r.name}`);
    }

    console.log('\n🎉 Roles seeded successfully!');
    console.log(`   ${roleData.length} roles created`);

  } catch (error) {
    console.error('❌ Role seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

seedRoles();
