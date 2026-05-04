const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.hgclvyrjdvqwarzfwngr:Programmoceuticals@aws-1-eu-north-1.pooler.supabase.com:6543/postgres' });

const FID      = '7fe3bb5f-9f8e-4a01-b623-189352fa9373';
const DOCTOR   = 'd0caab1b-56e7-47ef-8ada-b7ba6a7807d0';
const NURSE    = '00b817e3-4dac-472f-9713-3cf441a82a7e';
const RECEPT   = 'fd49911d-58a6-423d-b84b-dab99775594a';
const LAB      = 'f18a1b5d-7930-485f-a917-693d89f06948';
const PHARMA   = 'd390e5a7-17f7-47cd-be32-6341fc2bb2ab';

// Wards
const WARDS = {
  general:   '521b38e1-1208-47ee-a1e3-cf4b122a1afe',
  surgical:  '62a2486b-20a5-4ecc-b68f-80785d0c1b0e',
  private:   '313ae069-3f2e-4b67-ba74-017bdbb1cc33',
  emergency: 'c08519c1-aedc-44e7-900f-4ae27b66cd1d',
  icu:       'db8ac2f0-8632-4126-b15d-2b9ecaacf637'
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n) { return String(n).padStart(2, '0'); }

const FIRST_NAMES = ['Chukwuemeka','Ngozi','Obiageli','Ifeanyi','Adaeze','Emeka','Chioma','Uchenna','Amaka','Obinna','Nkechi','Chidi','Ifeoma','Kelechi','Nneka','Chukwudi','Adaora','Ikenna','Chinwe','Obi','Chiamaka','Nnamdi','Ugochi','Chinedu','Oluchi','Ebuka','Chidinma','Uche','Onyeka','Aisha','Fatima','Ibrahim','Musa','Hauwa','Yusuf','Blessing','Emmanuel','Grace','Samuel','Esther','Daniel','Ruth','Joseph','Mary','Peter','Patience','John','Mercy','Paul','Faith'];
const LAST_NAMES  = ['Okonkwo','Eze','Nwosu','Obi','Chukwu','Nwachukwu','Okeke','Igwe','Onyekachi','Nwankwo','Okafor','Anyanwu','Obiora','Nzekwe','Uchenna','Onwudiwe','Mbah','Agbo','Nwofor','Ogbu','Musa','Ibrahim','Abubakar','Suleiman','Bello','Adeyemi','Ogundimu','Afolabi','Adeleke','Bakare'];
const OCCUPATIONS = ['Trader','Civil Servant','Teacher','Farmer','Engineer','Nurse','Driver','Mechanic','Tailor','Banker','Student','Retired','Business Owner','Artisan','Clergy'];
const ADDRESSES   = ['Uruagu Nnewi','Otolo Nnewi','Umudim Nnewi','Nnewichi Nnewi','Ozubulu Road Nnewi','Nkpor Idemili','Onitsha Road Nnewi','Awka Road Nnewi','Oba Nnewi','Ogidi Idemili'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const GENOTYPES    = ['AA','AS','AC','SS'];
const PAYMENT_CATS = ['self_pay','hmo','corporate','self_pay','self_pay','hmo'];
const HMO_PROVIDERS = ['Hygeia HMO','Reliance HMO','Leadway Health','AXA Mansard','Redcare HMO'];
const REG_TYPES    = ['outpatient','outpatient','outpatient','inpatient_referral','surgical_endoscopy_booking','emergency'];
const SERVICES     = ['General Consultation','Upper GI Endoscopy','Colonoscopy','Laparoscopic Cholecystectomy','Laparoscopic Appendectomy','Specialist Surgical Review'];
const PRIORITIES   = ['routine','routine','routine','urgent','emergency','routine'];

const DIAGNOSES = [
  'Hypertension Stage 2','Type 2 Diabetes Mellitus','Peptic Ulcer Disease','Acute Appendicitis',
  'Gallstone Disease','Colorectal Polyps','Upper GI Bleeding','Irritable Bowel Syndrome',
  'Gastroesophageal Reflux Disease','Chronic Gastritis','Intestinal Obstruction','Hernia',
  'Typhoid Fever','Malaria with Anaemia','Urinary Tract Infection','Pneumonia',
  'Hypertensive Heart Disease','Diabetic Nephropathy','Anaemia','Sepsis'
];
const COMPLAINTS = [
  'Epigastric pain and heartburn for 3 weeks','Recurrent abdominal pain and bloating',
  'Difficulty swallowing and weight loss','Persistent diarrhoea for 2 weeks',
  'Right upper quadrant pain after meals','Rectal bleeding and change in bowel habit',
  'Nausea, vomiting and loss of appetite','Severe abdominal pain radiating to back',
  'Headache, dizziness and blurred vision','Polyuria, polydipsia and weight loss',
  'Fever, chills and body aches for 5 days','Cough, chest pain and difficulty breathing',
  'Burning sensation during urination','Swelling of legs and shortness of breath',
  'Jaundice and dark urine for 1 week'
];
const DRUGS = [
  {name:'Omeprazole',dosage:'20mg',freq:'Once daily',dur:'4 weeks',qty:28},
  {name:'Metformin',dosage:'500mg',freq:'Twice daily',dur:'Ongoing',qty:60},
  {name:'Amlodipine',dosage:'5mg',freq:'Once daily',dur:'Ongoing',qty:30},
  {name:'Lisinopril',dosage:'10mg',freq:'Once daily',dur:'Ongoing',qty:30},
  {name:'Ciprofloxacin',dosage:'500mg',freq:'Twice daily',dur:'7 days',qty:14},
  {name:'Metronidazole',dosage:'400mg',freq:'Three times daily',dur:'5 days',qty:15},
  {name:'Paracetamol',dosage:'1g',freq:'Three times daily',dur:'5 days',qty:15},
  {name:'Ibuprofen',dosage:'400mg',freq:'Three times daily',dur:'5 days',qty:15},
  {name:'Artemether/Lumefantrine',dosage:'80/480mg',freq:'Twice daily',dur:'3 days',qty:6},
  {name:'Ceftriaxone',dosage:'1g',freq:'Once daily IV',dur:'5 days',qty:5},
  {name:'Atorvastatin',dosage:'20mg',freq:'Once daily at night',dur:'Ongoing',qty:30},
  {name:'Glibenclamide',dosage:'5mg',freq:'Once daily',dur:'Ongoing',qty:30},
];
const LAB_TESTS = [
  'Full Blood Count','Fasting Blood Sugar','HbA1c','Liver Function Test',
  'Kidney Function Test','Urinalysis','Stool Microscopy','Blood Culture',
  'Widal Test','Malaria Parasite Test','Electrolytes','Lipid Profile',
  'Thyroid Function Test','Hepatitis B Surface Antigen','HIV Screening'
];
const ALLERGIES_LIST = [
  {allergen:'Penicillin',type:'drug',severity:'severe',reaction:'Generalised urticaria and angioedema'},
  {allergen:'Aspirin',type:'drug',severity:'moderate',reaction:'Epigastric pain and GI bleeding'},
  {allergen:'Sulphur drugs',type:'drug',severity:'moderate',reaction:'Skin rash and itching'},
  {allergen:'Chloroquine',type:'drug',severity:'mild',reaction:'Nausea and visual disturbance'},
  {allergen:'Dust mites',type:'environmental',severity:'mild',reaction:'Sneezing and nasal congestion'},
  {allergen:'Peanuts',type:'food',severity:'severe',reaction:'Anaphylaxis'},
];
const CONDITIONS_LIST = [
  {condition:'Hypertension',notes:'On Amlodipine 5mg OD. BP monitoring monthly.'},
  {condition:'Type 2 Diabetes Mellitus',notes:'HbA1c 7.8%. On Metformin 500mg BD.'},
  {condition:'Peptic Ulcer Disease',notes:'H. pylori positive. On triple therapy.'},
  {condition:'Asthma',notes:'Mild intermittent. Uses salbutamol inhaler PRN.'},
  {condition:'Sickle Cell Disease',notes:'HbSS. On folic acid and hydroxyurea.'},
  {condition:'Chronic Kidney Disease Stage 3',notes:'eGFR 45. Nephrology follow-up.'},
];

async function run() {
  console.log('🌱 Starting comprehensive hospital seed...\n');

  // Get available beds
  const bedsRes = await pool.query('SELECT id, bed_number, ward_id FROM beds WHERE is_occupied = false AND is_active = true ORDER BY bed_number');
  const availableBeds = bedsRes.rows;
  let bedIndex = 0;

  const patientIds = [];

  // ── 1. SEED 50 PATIENTS ──────────────────────────────────────────────────
  console.log('Seeding 50 patients...');
  for (let i = 1; i <= 50; i++) {
    const firstName = FIRST_NAMES[i - 1] || FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName  = LAST_NAMES[i % LAST_NAMES.length];
    const gender    = i % 3 === 0 ? 'male' : i % 2 === 0 ? 'female' : 'male';
    const dob       = `${1950 + (i % 50)}-${pad((i % 12) + 1)}-${pad((i % 28) + 1)}`;
    const paycat    = PAYMENT_CATS[i % PAYMENT_CATS.length];
    const priority  = PRIORITIES[i % PRIORITIES.length];
    const code      = `OSH-P-${String(i).padStart(3,'0')}`;

    const res = await pool.query(`
      INSERT INTO patients (
        facility_id, patient_code, first_name, last_name, gender, dob,
        marital_status, occupation, phone, address,
        emergency_contact, emergency_contact_phone, emergency_contact_relationship,
        blood_group, genotype, known_allergies, chronic_conditions, current_medications,
        registration_type, visit_reason, service_needed, visit_priority,
        payment_category, hmo_provider, hmo_number,
        consent_to_treatment, consent_to_data_processing, sms_consent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,true,true,true)
      ON CONFLICT (patient_code) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    `, [
      FID, code, firstName, lastName, gender, dob,
      randomFrom(['single','married','married','widowed']),
      randomFrom(OCCUPATIONS),
      `+23480${String(10000000 + i).substring(1)}`,
      `${randomFrom(ADDRESSES)}, Anambra State`,
      `${FIRST_NAMES[(i+5)%FIRST_NAMES.length]} ${LAST_NAMES[(i+3)%LAST_NAMES.length]}`,
      `+23480${String(20000000 + i).substring(1)}`,
      randomFrom(['Spouse','Parent','Sibling','Child']),
      randomFrom(BLOOD_GROUPS), randomFrom(GENOTYPES),
      i % 4 === 0 ? 'Penicillin' : i % 7 === 0 ? 'Aspirin' : null,
      i % 3 === 0 ? 'Hypertension' : i % 5 === 0 ? 'Diabetes' : null,
      i % 3 === 0 ? 'Amlodipine 5mg OD' : i % 5 === 0 ? 'Metformin 500mg BD' : null,
      randomFrom(REG_TYPES), randomFrom(COMPLAINTS),
      randomFrom(SERVICES), priority,
      paycat,
      paycat === 'hmo' ? randomFrom(HMO_PROVIDERS) : null,
      paycat === 'hmo' ? `HMO-${String(1000+i)}` : null,
    ]);
    patientIds.push(res.rows[0].id);
  }
  console.log(`✅ ${patientIds.length} patients seeded\n`);

  // ── 2. VITALS for all patients ───────────────────────────────────────────
  console.log('Seeding vitals...');
  for (let i = 0; i < patientIds.length; i++) {
    const pid = patientIds[i];
    // 1-3 vitals readings per patient
    const readings = 1 + (i % 3);
    for (let r = 0; r < readings; r++) {
      const sys = 110 + (i % 60);
      const dia = 70 + (i % 30);
      await pool.query(`
        INSERT INTO vitals (patient_id, recorded_by, blood_pressure, temperature, pulse, respiration, weight, height, recorded_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [pid, NURSE, `${sys}/${dia}`, (36 + (i%2) + (r*0.3)).toFixed(1),
          60 + (i%40), 14 + (i%8), 55 + (i%40), 155 + (i%30),
          daysAgo(r * 7 + (i % 5))]);
    }
  }
  console.log('✅ Vitals seeded\n');

  // ── 3. ALLERGIES for 20 patients ─────────────────────────────────────────
  console.log('Seeding allergies...');
  for (let i = 0; i < 20; i++) {
    const a = ALLERGIES_LIST[i % ALLERGIES_LIST.length];
    await pool.query(`
      INSERT INTO patient_allergies (patient_id, allergen, allergen_type, severity, reaction, recorded_by)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [patientIds[i], a.allergen, a.type, a.severity, a.reaction, DOCTOR]);
  }
  console.log('✅ Allergies seeded\n');

  // ── 4. CONDITIONS for 25 patients ────────────────────────────────────────
  console.log('Seeding conditions...');
  for (let i = 0; i < 25; i++) {
    const c = CONDITIONS_LIST[i % CONDITIONS_LIST.length];
    await pool.query(`
      INSERT INTO patient_conditions (patient_id, condition, is_active, notes, recorded_by)
      VALUES ($1,$2,$3,$4,$5)
    `, [patientIds[i], c.condition, i % 5 !== 0, c.notes, DOCTOR]);
  }
  console.log('✅ Conditions seeded\n');

  // ── 5. APPOINTMENTS ───────────────────────────────────────────────────────
  console.log('Seeding appointments...');
  const apptIds = [];
  for (let i = 0; i < 50; i++) {
    const pid = patientIds[i];
    const daysOffset = i < 20 ? -(i % 14) : (i % 14) + 1; // past and future
    const status = daysOffset < 0 ? (i % 5 === 0 ? 'no_show' : 'completed') : 'scheduled';
    const hour = 8 + (i % 9);
    const min  = i % 2 === 0 ? '00' : '30';
    const res = await pool.query(`
      INSERT INTO appointments (facility_id, patient_id, doctor_id, patient_name, phone,
        appointment_date, appointment_time, duration, reason, status)
      VALUES ($1,$2,$3,(SELECT first_name||' '||last_name FROM patients WHERE id=$2),
        (SELECT phone FROM patients WHERE id=$2),$4,$5,'30 minutes',$6,$7)
      RETURNING id
    `, [FID, pid, DOCTOR, daysFromNow(daysOffset), `${pad(hour)}:${min}`,
        randomFrom(COMPLAINTS), status]);
    apptIds.push({id: res.rows[0].id, patientId: pid, status});
  }
  console.log('✅ Appointments seeded\n');

  // ── 6. CONSULTATIONS for completed appointments ───────────────────────────
  console.log('Seeding consultations...');
  const consultIds = [];
  const completedAppts = apptIds.filter(a => a.status === 'completed');
  for (let i = 0; i < completedAppts.length; i++) {
    const appt = completedAppts[i];
    const diagnosis = DIAGNOSES[i % DIAGNOSES.length];
    const complaint = COMPLAINTS[i % COMPLAINTS.length];
    const res = await pool.query(`
      INSERT INTO consultations (facility_id, patient_id, doctor_id, consultation_type,
        consultation_date, chief_complaint, diagnosis, notes, status)
      VALUES ($1,$2,$3,'outpatient',$4,$5,$6,$7,'completed')
      RETURNING id
    `, [FID, appt.patientId, DOCTOR, daysAgo(i % 14 + 1),
        complaint, diagnosis,
        `Patient presented with ${complaint.toLowerCase()}. Examination findings consistent with ${diagnosis}. Treatment initiated. Follow-up in 2 weeks.`]);
    consultIds.push({id: res.rows[0].id, patientId: appt.patientId, diagnosis});
  }
  console.log(`✅ ${consultIds.length} consultations seeded\n`);

  // ── 7. PRESCRIPTIONS for 25 consultations ────────────────────────────────
  console.log('Seeding prescriptions...');
  const rxIds = [];
  for (let i = 0; i < Math.min(25, consultIds.length); i++) {
    const c = consultIds[i];
    const status = i < 15 ? 'dispensed' : i < 20 ? 'pending' : 'pending';
    const res = await pool.query(`
      INSERT INTO prescriptions (consultation_id, patient_id, prescribed_by, remarks, status)
      VALUES ($1,$2,$3,$4,$5) RETURNING id
    `, [c.id, c.patientId, DOCTOR,
        `Prescribed for ${c.diagnosis}. Take as directed. Return if symptoms worsen.`, status]);
    rxIds.push({id: res.rows[0].id, patientId: c.patientId});

    // 1-3 drugs per prescription
    const numDrugs = 1 + (i % 3);
    for (let d = 0; d < numDrugs; d++) {
      const drug = DRUGS[(i + d) % DRUGS.length];
      await pool.query(`
        INSERT INTO prescription_items (prescription_id, drug_name, dosage, frequency, duration, quantity_prescribed)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [res.rows[0].id, drug.name, drug.dosage, drug.freq, drug.dur, drug.qty]);
    }
  }
  console.log(`✅ ${rxIds.length} prescriptions seeded\n`);

  // ── 8. LAB REQUESTS for 20 consultations ─────────────────────────────────
  console.log('Seeding lab requests...');
  for (let i = 0; i < Math.min(20, consultIds.length); i++) {
    const c = consultIds[i];
    const numTests = 1 + (i % 3);
    for (let t = 0; t < numTests; t++) {
      const testName = LAB_TESTS[(i + t) % LAB_TESTS.length];
      const status = i < 12 ? 'completed' : i < 16 ? 'in_progress' : 'pending';
      const res = await pool.query(`
        INSERT INTO lab_requests (consultation_id, patient_id, test_name, requested_by, assigned_lab_id, priority, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
      `, [c.id, c.patientId, testName, DOCTOR, FID,
          i % 5 === 0 ? 'urgent' : 'routine', status]);

      // Add result for completed tests
      if (status === 'completed') {
        await pool.query(`
          INSERT INTO lab_results (request_id, patient_id, result_text, validation_status, uploaded_by)
          VALUES ($1,$2,$3,'validated',$4)
        `, [res.rows[0].id, c.patientId,
            `${testName}: Within normal limits. No significant abnormality detected.`, LAB]);
      }
    }
  }
  console.log('✅ Lab requests and results seeded\n');

  // ── 9. ADMISSIONS for 10 patients ────────────────────────────────────────
  console.log('Seeding admissions...');
  const admissionPatients = patientIds.slice(10, 20);
  for (let i = 0; i < admissionPatients.length; i++) {
    const pid = admissionPatients[i];
    const status = i < 6 ? 'admitted' : 'discharged';
    const admNum = `ADM-OSH-${String(100 + i).padStart(3,'0')}`;
    const wardKey = Object.keys(WARDS)[i % Object.keys(WARDS).length];
    const wardId = WARDS[wardKey];

    // Get a bed for admitted patients
    let bedId = null;
    if (status === 'admitted' && bedIndex < availableBeds.length) {
      const bed = availableBeds[bedIndex++];
      if (bed.ward_id === wardId || true) {
        bedId = bed.id;
        await pool.query('UPDATE beds SET is_occupied = true, current_patient_id = $1 WHERE id = $2', [pid, bedId]);
      }
    }

    const admRes = await pool.query(`
      INSERT INTO admissions (facility_id, patient_id, admission_number, admission_type,
        admission_date, bed_id, ward_id, admitting_doctor_id, status, priority, admission_reason, total_charges)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (admission_number) DO NOTHING
      RETURNING id
    `, [FID, pid, admNum,
        i % 3 === 0 ? 'emergency' : i % 2 === 0 ? 'inpatient' : 'day_care',
        daysAgo(i * 2 + 1), bedId, wardId, DOCTOR,
        status, i % 4 === 0 ? 'urgent' : 'routine',
        randomFrom(COMPLAINTS),
        String((15000 + i * 8500).toFixed(2))]);

    if (status === 'discharged' && admRes.rows.length > 0) {
      await pool.query(`
        UPDATE admissions SET discharge_date = $1, discharging_doctor_id = $2,
        discharge_reason = 'Recovered. Stable for discharge.'
        WHERE id = $3
      `, [daysAgo(i % 3), DOCTOR, admRes.rows[0].id]);
    }
  }
  console.log('✅ Admissions seeded\n');

  // ── 10. PAYMENTS ──────────────────────────────────────────────────────────
  console.log('Seeding payments...');
  const depts = ['Consultation','Laboratory','Pharmacy','Admissions','Surgery','Radiology'];
  const methods = ['cash','transfer','cash','cash','paystack','transfer'];
  for (let i = 0; i < 50; i++) {
    const pid = patientIds[i % patientIds.length];
    const status = i < 35 ? 'completed' : 'pending';
    await pool.query(`
      INSERT INTO payments (facility_id, patient_id, department, reference_code, amount, method, status, approved_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (reference_code) DO NOTHING
    `, [FID, pid, depts[i % depts.length],
        `PAY-SEED-${String(100 + i).padStart(3,'0')}`,
        String((2500 + i * 1750).toFixed(2)),
        methods[i % methods.length], status, RECEPT]);
  }
  console.log('✅ Payments seeded\n');

  // ── Summary ───────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    pool.query('SELECT COUNT(*) FROM patients WHERE facility_id = $1', [FID]),
    pool.query('SELECT COUNT(*) FROM appointments WHERE facility_id = $1', [FID]),
    pool.query('SELECT COUNT(*) FROM consultations WHERE facility_id = $1', [FID]),
    pool.query('SELECT COUNT(*) FROM prescriptions WHERE patient_id IN (SELECT id FROM patients WHERE facility_id = $1)', [FID]),
    pool.query('SELECT COUNT(*) FROM lab_requests WHERE assigned_lab_id = $1', [FID]),
    pool.query('SELECT COUNT(*) FROM admissions WHERE facility_id = $1', [FID]),
    pool.query('SELECT COUNT(*) FROM payments WHERE facility_id = $1', [FID]),
  ]);

  console.log('🎉 Seed complete!\n');
  console.log('📊 Final counts:');
  console.log('  Patients:      ', counts[0].rows[0].count);
  console.log('  Appointments:  ', counts[1].rows[0].count);
  console.log('  Consultations: ', counts[2].rows[0].count);
  console.log('  Prescriptions: ', counts[3].rows[0].count);
  console.log('  Lab Requests:  ', counts[4].rows[0].count);
  console.log('  Admissions:    ', counts[5].rows[0].count);
  console.log('  Payments:      ', counts[6].rows[0].count);

  await pool.end();
}

run().catch(e => { console.error('❌ Error:', e.message); pool.end(); });
