import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/app.config';
import { tenants } from '../src/models/tenants.model';
import { facilities } from '../src/models/facilities.model';
import { users } from '../src/models/users.model';
import { moduleCatalog } from '../src/models/module-catalog.model';
import { moduleConfigurations } from '../src/models/module-configurations.model';

const seedDatabase = async () => {
  const client = postgres(config.database.url, { prepare: false });
  const db = drizzle(client);

  console.log('🌱 Seeding database...');

  try {
    // Tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Oluchukwu Specialist Hospital and Endoscopy',
      organizationType: 'hospital',
      subdomain: 'oluchukwu-specialist-hospital',
      subscriptionPlan: 'premium',
      maxFacilities: 5,
      maxUsers: 100,
      allowedModules: JSON.stringify(['patients', 'doctors', 'pharmacy', 'lab', 'inventory', 'billing', 'admissions', 'reports']),
      billingEmail: 'admin@oluchukwuspecialisthospital.com',
      isActive: true,
      setupCompleted: true,
    }).returning();
    console.log('✅ Tenant:', tenant.name);

    // Facility
    const [facility] = await db.insert(facilities).values({
      tenantId: tenant.id,
      name: 'Oluchukwu Specialist Hospital and Endoscopy',
      type: 'hospital',
      address: 'Raphael Obimdike Street, Inyagba Ngo Umudim Nnewi, Along Traffic Light - Ozubulu Rd Axis, Anambra State',
      contactPhone: '+2348106666850',
      contactEmail: 'info@oluchukwuspecialisthospital.com',
      description: 'A leading specialist hospital in Nnewi providing comprehensive surgical and endoscopic services.',
      isActive: true,
    }).returning();
    console.log('✅ Facility:', facility.name);

    // Users
    const roles = [
      { firstName: 'System',      lastName: 'Administrator', email: 'admin@oluchukwuspecialisthospital.com',      password: 'Admin@123456',      role: 'admin',       department: 'Administration'   },
      { firstName: 'Dr. Sarah',   lastName: 'Johnson',       email: 'doctor@oluchukwuspecialisthospital.com',     password: 'Doctor@123456',     role: 'doctor',      department: 'General Medicine' },
      { firstName: 'Mary',        lastName: 'Williams',      email: 'nurse@oluchukwuspecialisthospital.com',      password: 'Nurse@123456',      role: 'nurse',       department: 'General Ward'     },
      { firstName: 'James',       lastName: 'Okafor',        email: 'pharmacist@oluchukwuspecialisthospital.com', password: 'Pharma@123456',     role: 'pharmacist',  department: 'Pharmacy'         },
      { firstName: 'Amina',       lastName: 'Bello',         email: 'lab@oluchukwuspecialisthospital.com',        password: 'Lab@123456',        role: 'lab_tech',    department: 'Laboratory'       },
      { firstName: 'Chidi',       lastName: 'Eze',           email: 'reception@oluchukwuspecialisthospital.com',  password: 'Recept@123456',     role: 'receptionist',department: 'Reception'        },
    ];

    for (const u of roles) {
      const hash = await bcrypt.hash(u.password, 10);
      const [created] = await db.insert(users).values({
        facilityId: facility.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash: hash,
        role: u.role,
        department: u.department,
        isActive: true,
      }).returning();
      console.log(`✅ User (${created.role}): ${created.email}`);
    }

    // Module configurations — enable all core modules for the facility
    const coreModules = ['patients', 'doctors', 'pharmacy', 'lab', 'inventory', 'billing', 'admissions', 'appointments', 'reports', 'documents'];
    for (const mod of coreModules) {
      await db.insert(moduleConfigurations).values({
        facilityId: facility.id,
        moduleName: mod,
        isEnabled: true,
        configuration: JSON.stringify({}),
      });
    }
    console.log('✅ Module configurations enabled');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin:        admin@oluchukwuspecialisthospital.com        / Admin@123456');
    console.log('  Doctor:       doctor@oluchukwuspecialisthospital.com       / Doctor@123456');
    console.log('  Nurse:        nurse@oluchukwuspecialisthospital.com        / Nurse@123456');
    console.log('  Pharmacist:   pharmacist@oluchukwuspecialisthospital.com   / Pharma@123456');
    console.log('  Lab Tech:     lab@oluchukwuspecialisthospital.com          / Lab@123456');
    console.log('  Receptionist: reception@oluchukwuspecialisthospital.com    / Recept@123456');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

seedDatabase();
