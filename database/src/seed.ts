/**
 * Abay General Hospital — Database Seed Script
 * Run with: npm run db:seed (from the database/ folder)
 *
 * Seeds:
 *  - All system roles
 *  - All hospital departments
 *  - One staff account per role with a bcrypt-hashed password
 *
 * Safe to re-run: uses ON CONFLICT DO NOTHING for all inserts.
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const connectionString =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/abay_hms';

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// ─── 1. ROLES ────────────────────────────────────────────────────────────────
const ROLES = [
    { name: 'ADMIN',           description: 'System administrator with full access' },
    { name: 'RECEPTIONIST',    description: 'Front-desk staff managing patient registration and queues' },
    { name: 'DOCTOR',          description: 'Licensed physician in Outpatient Department' },
    { name: 'NURSE',           description: 'Ward nurse managing admissions and patient care' },
    { name: 'LAB_TECHNICIAN',  description: 'Laboratory staff processing test orders and results' },
    { name: 'RADIOLOGIST',     description: 'Radiology staff handling imaging orders and reports' },
    { name: 'PHARMACIST',      description: 'Pharmacy staff managing drug dispensing' },
    { name: 'CASHIER',         description: 'Billing and payment processing staff' },
];

// ─── 2. DEPARTMENTS ───────────────────────────────────────────────────────────
const DEPARTMENTS = [
    { name: 'Administration',          code: 'DEP-ADMIN',  description: 'Hospital administration and management' },
    { name: 'Outpatient Department',   code: 'DEP-OPD',    description: 'General outpatient consultation and doctor queue' },
    { name: 'Reception',               code: 'DEP-REC',    description: 'Patient registration, triage, and front desk' },
    { name: 'Laboratory',              code: 'DEP-LAB',    description: 'Clinical laboratory and diagnostic testing' },
    { name: 'Radiology',               code: 'DEP-RAD',    description: 'Medical imaging — X-ray, ultrasound, CT scan' },
    { name: 'Pharmacy',                code: 'DEP-PHARM',  description: 'Drug dispensing and prescription management' },
    { name: 'Finance',                 code: 'DEP-FIN',    description: 'Billing, invoicing, and cashier operations' },
    { name: 'General Ward',            code: 'DEP-WARD',   description: 'Inpatient nursing care and ward management' },
];

// ─── 3. STAFF ACCOUNTS ────────────────────────────────────────────────────────
// Each entry maps to a role name and a department name (resolved at runtime)
const STAFF = [
    {
        staffId:    'ABAY-ADM-001',
        fullName:   'Abebe Girma',
        email:      'admin@abay-hospital.et',
        phone:      '+251911000001',
        password:   'Admin@1234',
        role:       'ADMIN',
        department: 'Administration',
    },
    {
        staffId:    'ABAY-REC-001',
        fullName:   'Tigist Bekele',
        email:      'reception@abay-hospital.et',
        phone:      '+251911000002',
        password:   'Staff@1234',
        role:       'RECEPTIONIST',
        department: 'Reception',
    },
    {
        staffId:    'ABAY-DOC-001',
        fullName:   'Dr. Yonas Tesfaye',
        email:      'doctor@abay-hospital.et',
        phone:      '+251911000003',
        password:   'Staff@1234',
        role:       'DOCTOR',
        department: 'Outpatient Department',
    },
    {
        staffId:    'ABAY-NUR-001',
        fullName:   'Mekdes Haile',
        email:      'nurse@abay-hospital.et',
        phone:      '+251911000004',
        password:   'Staff@1234',
        role:       'NURSE',
        department: 'General Ward',
    },
    {
        staffId:    'ABAY-LAB-001',
        fullName:   'Samuel Worku',
        email:      'lab@abay-hospital.et',
        phone:      '+251911000005',
        password:   'Staff@1234',
        role:       'LAB_TECHNICIAN',
        department: 'Laboratory',
    },
    {
        staffId:    'ABAY-RAD-001',
        fullName:   'Hiwot Alemu',
        email:      'radiology@abay-hospital.et',
        phone:      '+251911000006',
        password:   'Staff@1234',
        role:       'RADIOLOGIST',
        department: 'Radiology',
    },
    {
        staffId:    'ABAY-PH-001',
        fullName:   'Biruk Tadesse',
        email:      'pharmacy@abay-hospital.et',
        phone:      '+251911000007',
        password:   'Staff@1234',
        role:       'PHARMACIST',
        department: 'Pharmacy',
    },
    {
        staffId:    'ABAY-CASH-001',
        fullName:   'Rahel Seifu',
        email:      'cashier@abay-hospital.et',
        phone:      '+251911000008',
        password:   'Staff@1234',
        role:       'CASHIER',
        department: 'Finance',
    },
];

// ─── SEED RUNNER ─────────────────────────────────────────────────────────────
async function seed() {
    console.log('\n🌱  Starting Abay HMS database seed...\n');

    // ── Step 1: Roles ──────────────────────────────────────────────────────
    console.log('📋  Seeding roles...');
    for (const role of ROLES) {
        await db
            .insert(schema.roles)
            .values({ name: role.name, description: role.description, isSystemRole: true })
            .onConflictDoNothing({ target: schema.roles.name });
        console.log(`   ✔  Role: ${role.name}`);
    }

    // ── Step 2: Departments ────────────────────────────────────────────────
    console.log('\n🏢  Seeding departments...');
    for (const dept of DEPARTMENTS) {
        await db
            .insert(schema.departments)
            .values({ name: dept.name, code: dept.code, description: dept.description })
            .onConflictDoNothing({ target: schema.departments.name });
        console.log(`   ✔  Department: ${dept.name}`);
    }

    // ── Step 3: Fetch IDs for lookup ───────────────────────────────────────
    const allRoles = await db.select().from(schema.roles);
    const allDepts = await db.select().from(schema.departments);

    const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));
    const deptMap = Object.fromEntries(allDepts.map((d) => [d.name, d.id]));

    // ── Step 4: Staff Accounts ─────────────────────────────────────────────
    console.log('\n👤  Seeding staff accounts...');
    for (const staff of STAFF) {
        const roleId = roleMap[staff.role];
        const departmentId = deptMap[staff.department];

        if (!roleId) {
            console.warn(`   ⚠  Role "${staff.role}" not found — skipping ${staff.email}`);
            continue;
        }

        const passwordHash = await bcrypt.hash(staff.password, 12);

        await db
            .insert(schema.users)
            .values({
                staffId:      staff.staffId,
                fullName:     staff.fullName,
                email:        staff.email,
                phone:        staff.phone,
                passwordHash,
                roleId,
                departmentId: departmentId ?? null,
                isActive:     true,
            })
            .onConflictDoNothing({ target: schema.users.email });

        console.log(`   ✔  ${staff.role.padEnd(16)}  ${staff.email}  (password: ${staff.password})`);
    }

    // ── Step 5: Seeding Lab Catalog ─────────────────────────────────────────
    console.log('\n🔬  Seeding lab catalog...');
    const LAB_TESTS = [
        { testCode: 'LAB-CBC', testName: 'Complete Blood Count (CBC)', category: 'Hematology', sampleType: 'Whole Blood', containerType: 'EDTA (Purple Top)', price: '250.00' },
        { testCode: 'LAB-FBS', testName: 'Fasting Blood Sugar (FBS)', category: 'Clinical Chemistry', sampleType: 'Serum', containerType: 'Fluoride (Grey Top)', price: '120.00' },
        { testCode: 'LAB-LFT', testName: 'Liver Function Test (LFT)', category: 'Clinical Chemistry', sampleType: 'Serum', containerType: 'SST (Yellow Top)', price: '450.00' },
        { testCode: 'LAB-RFT', testName: 'Renal Function Test (RFT)', category: 'Clinical Chemistry', sampleType: 'Serum', containerType: 'SST (Yellow Top)', price: '400.00' },
        { testCode: 'LAB-MAL', testName: 'Malaria Blood Film', category: 'Parasitology', sampleType: 'Whole Blood', containerType: 'EDTA (Purple Top)', price: '100.00' },
        { testCode: 'LAB-URN', testName: 'Urinalysis', category: 'Urinalysis', sampleType: 'Urine', containerType: 'Urine Cup', price: '80.00' }
    ];

    for (const test of LAB_TESTS) {
        await db
            .insert(schema.labCatalog)
            .values(test)
            .onConflictDoNothing({ target: schema.labCatalog.testCode });
        console.log(`   ✔  Lab Test: ${test.testName}`);
    }

    // ── Step 6: Seeding Radiology Catalog ────────────────────────────────────
    console.log('\n☢  Seeding radiology catalog...');
    const RAD_EXAMS = [
        { examCode: 'RAD-CXR', examName: 'Chest X-Ray (CXR)', modality: 'X-RAY', bodyPart: 'Chest', price: '350.00' },
        { examCode: 'RAD-ABD-US', examName: 'Abdominal Ultrasound', modality: 'ULTRASOUND', bodyPart: 'Abdomen', price: '450.00' },
        { examCode: 'RAD-PEL-US', examName: 'Pelvic Ultrasound', modality: 'ULTRASOUND', bodyPart: 'Pelvis', price: '400.00' },
        { examCode: 'RAD-BRN-CT', examName: 'Brain CT Scan', modality: 'CT', bodyPart: 'Brain', price: '3000.00' }
    ];

    for (const exam of RAD_EXAMS) {
        await db
            .insert(schema.radiologyCatalog)
            .values(exam)
            .onConflictDoNothing({ target: schema.radiologyCatalog.examCode });
        console.log(`   ✔  Radiology Exam: ${exam.examName}`);
    }

    console.log('\n✅  Seed complete! Staff accounts and catalogs are ready.\n');
    console.log('─'.repeat(55));
    console.log('  Role              Email');
    console.log('─'.repeat(55));
    for (const s of STAFF) {
        console.log(`  ${s.role.padEnd(16)}  ${s.email}`);
    }
    console.log('─'.repeat(55));
    console.log('  Admin password : Admin@1234');
    console.log('  Staff password : Staff@1234');
    console.log('─'.repeat(55));
    console.log();

    await client.end();
    process.exit(0);
}

seed().catch((err) => {
    console.error('\n❌  Seed failed:', err);
    client.end();
    process.exit(1);
});
