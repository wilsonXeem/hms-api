import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { config } from '../src/config/app.config';
import { facilities } from '../src/models/facilities.model';
import { wards } from '../src/models/wards.model';
import { beds } from '../src/models/beds.model';

const seedWards = async () => {
  const client = postgres(config.database.url, { prepare: false });
  const db = drizzle(client);

  console.log('🌱 Seeding wards and beds...');

  try {
    // Get the facility
    const [facility] = await db.select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.isActive, true))
      .limit(1);

    if (!facility) {
      console.error('❌ No active facility found. Run seed-database.ts first.');
      process.exit(1);
    }

    const wardData = [
      { name: 'General Ward',           code: 'GW',  department: 'General Medicine', floor: 1, totalBeds: 20, wardType: 'general'   },
      { name: 'Surgical Ward',          code: 'SW',  department: 'Surgery',          floor: 2, totalBeds: 12, wardType: 'general'   },
      { name: 'Private Ward',           code: 'PW',  department: 'General',          floor: 2, totalBeds: 8,  wardType: 'general'   },
      { name: 'Emergency Observation',  code: 'EO',  department: 'Emergency',        floor: 1, totalBeds: 6,  wardType: 'emergency' },
      { name: 'ICU',                    code: 'ICU', department: 'Critical Care',    floor: 3, totalBeds: 4,  wardType: 'icu'       },
    ];

    for (const w of wardData) {
      const [ward] = await db.insert(wards).values({
        facilityId: facility.id,
        name: w.name,
        code: w.code,
        department: w.department,
        floor: w.floor,
        totalBeds: w.totalBeds,
        availableBeds: w.totalBeds,
        wardType: w.wardType,
        isActive: true,
      }).returning();

      console.log(`✅ Ward: ${ward.name} (${w.totalBeds} beds)`);

      // Seed beds for each ward
      for (let i = 1; i <= w.totalBeds; i++) {
        await db.insert(beds).values({
          facilityId: facility.id,
          wardId: ward.id,
          bedNumber: `${w.code}-${String(i).padStart(2, '0')}`,
          bedType: w.wardType === 'icu' ? 'icu' : w.wardType === 'emergency' ? 'general' : 'general',
          isOccupied: false,
          isActive: true,
        });
      }

      console.log(`   └─ ${w.totalBeds} beds created`);
    }

    console.log('\n🎉 Wards and beds seeded successfully!');
    console.log('  Total wards: 5');
    console.log('  Total beds:  50');

  } catch (error) {
    console.error('❌ Ward seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

seedWards();
