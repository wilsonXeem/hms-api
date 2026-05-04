import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { config } from '../src/config/app.config';
import { facilities } from '../src/models/facilities.model';

const seedFacilityData = async () => {
  const client = postgres(config.database.url, { prepare: false });
  const db = drizzle(client);

  console.log('🌱 Seeding facility data...');

  try {
    const departments = [
      { name: 'Surgery & Endoscopy',    head: 'Consultant Surgeon',   status: 'Open', services: 6 },
      { name: 'Emergency',              head: 'Medical Officer',       status: 'Open', services: 4 },
      { name: 'Outpatient Clinic',      head: 'Medical Officer',       status: 'Open', services: 8 },
      { name: 'Laboratory',             head: 'Lab Manager',           status: 'Open', services: 12 },
      { name: 'Pharmacy',               head: 'Chief Pharmacist',      status: 'Open', services: 5 },
      { name: 'Admissions & Wards',     head: 'Ward Manager',          status: 'Open', services: 4 },
      { name: 'Billing & Accounts',     head: 'Billing Officer',       status: 'Open', services: 3 },
      { name: 'Radiology & Imaging',    head: 'Radiologist',           status: 'Open', services: 5 },
    ];

    const servicesOffered = [
      // Endoscopy
      { name: 'Upper GI Endoscopy (Gastroscopy)',  department: 'Surgery & Endoscopy', price: 45000  },
      { name: 'Colonoscopy',                        department: 'Surgery & Endoscopy', price: 55000  },
      { name: 'Flexible Sigmoidoscopy',             department: 'Surgery & Endoscopy', price: 35000  },

      // Laparoscopic Surgery
      { name: 'Laparoscopic Cholecystectomy',       department: 'Surgery & Endoscopy', price: 350000 },
      { name: 'Laparoscopic Appendectomy',          department: 'Surgery & Endoscopy', price: 280000 },
      { name: 'Laparoscopic Hernia Repair',         department: 'Surgery & Endoscopy', price: 250000 },

      // General Surgery
      { name: 'Open Cholecystectomy',               department: 'Surgery & Endoscopy', price: 200000 },
      { name: 'Hernia Repair (Open)',               department: 'Surgery & Endoscopy', price: 150000 },
      { name: 'Thyroid Surgery',                    department: 'Surgery & Endoscopy', price: 300000 },
      { name: 'Breast Surgery',                     department: 'Surgery & Endoscopy', price: 180000 },

      // Outpatient
      { name: 'General Consultation',               department: 'Outpatient Clinic',   price: 5000   },
      { name: 'Specialist Consultation',            department: 'Outpatient Clinic',   price: 10000  },
      { name: 'Follow-up Consultation',             department: 'Outpatient Clinic',   price: 3000   },
      { name: 'Pre-operative Assessment',           department: 'Outpatient Clinic',   price: 8000   },

      // Emergency
      { name: 'Emergency Registration',             department: 'Emergency',           price: 10000  },
      { name: 'Emergency Consultation',             department: 'Emergency',           price: 15000  },
      { name: 'Emergency Surgery',                  department: 'Emergency',           price: 500000 },

      // Laboratory
      { name: 'Full Blood Count (FBC)',             department: 'Laboratory',          price: 3500   },
      { name: 'Liver Function Test (LFT)',          department: 'Laboratory',          price: 5000   },
      { name: 'Kidney Function Test (KFT)',         department: 'Laboratory',          price: 5000   },
      { name: 'Blood Group & Genotype',             department: 'Laboratory',          price: 2500   },
      { name: 'Fasting Blood Sugar (FBS)',          department: 'Laboratory',          price: 1500   },
      { name: 'Hepatitis B & C Screening',          department: 'Laboratory',          price: 4000   },
      { name: 'HIV Screening',                      department: 'Laboratory',          price: 2000   },
      { name: 'Urinalysis',                         department: 'Laboratory',          price: 1500   },
      { name: 'Stool Microscopy & Culture',         department: 'Laboratory',          price: 3000   },
      { name: 'Electrolytes & Urea',                department: 'Laboratory',          price: 4500   },
      { name: 'Thyroid Function Test (TFT)',        department: 'Laboratory',          price: 8000   },
      { name: 'Tumour Markers (CEA, AFP, PSA)',     department: 'Laboratory',          price: 12000  },

      // Radiology
      { name: 'Abdominal Ultrasound',               department: 'Radiology & Imaging', price: 8000   },
      { name: 'Pelvic Ultrasound',                  department: 'Radiology & Imaging', price: 8000   },
      { name: 'Chest X-Ray',                        department: 'Radiology & Imaging', price: 5000   },
      { name: 'Abdominal X-Ray',                    department: 'Radiology & Imaging', price: 5000   },
      { name: 'CT Scan (Abdomen/Pelvis)',           department: 'Radiology & Imaging', price: 60000  },

      // Admissions
      { name: 'Ward Admission Deposit',             department: 'Admissions & Wards',  price: 50000  },
      { name: 'Private Room (per day)',             department: 'Admissions & Wards',  price: 25000  },
      { name: 'General Ward (per day)',             department: 'Admissions & Wards',  price: 10000  },
      { name: 'ICU (per day)',                      department: 'Admissions & Wards',  price: 80000  },
    ];

    await db.update(facilities)
      .set({
        name:            'Oluchukwu Specialist Hospital and Endoscopy',
        description:     'A leading specialist hospital in Nnewi, Anambra State, providing comprehensive surgical and endoscopic services with experienced medical professionals and modern facilities.',
        mission:         'To provide accessible, high-quality specialist surgical and endoscopic care to every patient with compassion, precision, and integrity.',
        vision:          'To be the foremost specialist surgical and endoscopy centre in South-East Nigeria, setting the standard for clinical excellence and patient-centred care.',
        address:         'Raphael Obimdike Street, Inyagba Ngo Umudim Nnewi, Along Traffic Light - Ozubulu Rd Axis, Anambra State',
        contactPhone:    '+2348106666850',
        contactEmail:    'info@oluchukwuspecialisthospital.com',
        emergencyContact:'+2348106666850',
        website:         'https://oluchukwuspecialisthospital.com',
        departments:     departments as any,
        servicesOffered: servicesOffered as any,
        updatedAt:       new Date(),
      })
      .where(eq(facilities.id, '7fe3bb5f-9f8e-4a01-b623-189352fa9373'));

    console.log(`✅ Facility profile updated`);
    console.log(`✅ ${departments.length} departments seeded`);
    console.log(`✅ ${servicesOffered.length} services seeded`);
    console.log('\n🎉 Facility data seeded successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

seedFacilityData();
