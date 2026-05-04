import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { config } from '../src/config/app.config';
import { facilities } from '../src/models/facilities.model';

const seedSchedules = async () => {
  const client = postgres(config.database.url, { prepare: false });
  const db = drizzle(client);

  console.log('🌱 Seeding doctor schedules...');

  try {
    const [facility] = await db.select({ id: facilities.id, operatingHours: facilities.operatingHours })
      .from(facilities)
      .where(eq(facilities.isActive, true))
      .limit(1);

    if (!facility) {
      console.error('❌ No active facility found.');
      process.exit(1);
    }

    const schedules = [
      { doctor: 'Dr. Oluchukwu',      department: 'Surgery & Endoscopy', days: 'Mon, Wed, Fri', hours: '08:00–14:00' },
      { doctor: 'Dr. Okafor',         department: 'Surgery & Endoscopy', days: 'Tue, Thu, Sat', hours: '09:00–15:00' },
      { doctor: 'Medical Officer',    department: 'Outpatient Clinic',   days: 'Mon–Fri',       hours: '08:00–16:00' },
      { doctor: 'Medical Officer',    department: 'Emergency',           days: 'Mon–Sun',       hours: '24 hours'    },
      { doctor: 'Dr. Sarah Johnson',  department: 'General Medicine',    days: 'Mon–Fri',       hours: '09:00–17:00' },
    ];

    const existing = facility.operatingHours
      ? (typeof facility.operatingHours === 'string' ? JSON.parse(facility.operatingHours) : facility.operatingHours)
      : {};

    await db.update(facilities)
      .set({
        operatingHours: { ...existing, schedules } as any,
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, facility.id));

    console.log(`✅ ${schedules.length} doctor schedules seeded`);
    console.log('\n🎉 Schedules seeded successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

seedSchedules();
