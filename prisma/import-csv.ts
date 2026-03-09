/**
 * import-csv.ts
 *
 * Standalone Prisma seed script that reads a CSV export (Google Forms format)
 * and imports the data into the database as:
 *   - User (with auto-generated email if missing, default password Welcome@2025)
 *   - StudentProfile
 *   - Application (status: PENDING)
 *   - ApplicationDocument  (Google Drive upload links stored as filePath)
 *   - Geographic data (County / SubCounty / Ward) created on-the-fly if missing
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-csv.ts --file=data.csv
 *
 * Options:
 *   --file=<path>   Path to the CSV file (default: ./applications.csv)
 *   --dry-run       Parse & validate only, do not write to DB
 */

import { PrismaClient, ApplicationStatus, ApplicationDocumentType, EducationLevel, WhoLivesWith, HouseholdIncomeRange, OrphanStatus, UserRole, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
// @ts-ignore
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace(/^--/, '').split('=');
        return [k, v ?? true];
    })
);

const CSV_FILE = (args['file'] as string) ?? './applications.csv';
const DRY_RUN = args['dry-run'] === true || args['dry-run'] === 'true';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PASSWORD = 'Welcome@2025';
const IMPORT_EMAIL_DOMAIN = 'import.stf.org';
const CONSENT_VERSION = '1.0';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportResult {
    rowIndex: number;
    email: string;
    status: 'SUCCESS' | 'PARTIAL' | 'SKIPPED';
    flags: string[];
    error?: string;
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV file into an array of header→value maps.
 * Handles quoted fields with embedded commas and newlines.
 */
async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = splitCSVLines(content);

    if (lines.length < 2) throw new Error('CSV has no data rows.');

    const headers = parseCSVRow(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVRow(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h.trim()] = (values[idx] ?? '').trim();
        });
        rows.push(row);
    }

    return rows;
}

function splitCSVLines(content: string): string[] {
    const lines: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if (ch === '\n' && !inQuotes) {
            lines.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function parseCSVRow(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

// ─── Column name helpers ──────────────────────────────────────────────────────
// The Google Forms CSV has verbose/inconsistent column names.
// We normalise them to lowercase trimmed keys and match by substring.

function col(row: Record<string, string>, ...candidates: string[]): string {
    for (const candidate of candidates) {
        const lower = candidate.toLowerCase();
        for (const [key, value] of Object.entries(row)) {
            if (key.toLowerCase().includes(lower)) return value.trim();
        }
    }
    return '';
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapEducationLevel(raw: string): EducationLevel {
    const v = raw.toLowerCase();
    if (v.includes('university') || v.includes('college') || v.includes('post')) return EducationLevel.UNIVERSITY;
    if (v.includes('high school') || v.includes('secondary')) return EducationLevel.HIGH_SCHOOL;
    if (v.includes('tvet') || v.includes('polytechnic') || v.includes('technical')) return EducationLevel.TVET;
    if (v.includes('college')) return EducationLevel.COLLEGE;
    return EducationLevel.UNIVERSITY; // safest default for adult applicants
}

function mapWhoLivesWith(raw: string): WhoLivesWith | null {
    const v = raw.toLowerCase();
    if (v.includes('both parent')) return WhoLivesWith.BOTH_PARENTS;
    if (v.includes('single mother') || v.includes('mother')) return WhoLivesWith.SINGLE_MOTHER;
    if (v.includes('single father') || v.includes('father')) return WhoLivesWith.SINGLE_FATHER;
    if (v.includes('guardian')) return WhoLivesWith.GUARDIAN;
    if (v.includes('grandparent')) return WhoLivesWith.GRANDPARENT;
    if (v.includes('orphanage')) return WhoLivesWith.ORPHANAGE;
    if (v.includes('one parent')) return WhoLivesWith.SINGLE_MOTHER; // treat as single parent
    if (v.includes('self')) return WhoLivesWith.SELF;
    if (v.includes('relative')) return WhoLivesWith.GUARDIAN;
    return null;
}

function mapHouseholdIncome(raw: string): HouseholdIncomeRange | null {
    const v = raw.toLowerCase().replace(/\s/g, '');
    if (v.includes('below') || v.includes('under') || v.includes('<5')) return HouseholdIncomeRange.BELOW_5K;
    if (v.includes('5,000') || v.includes('5k') || v.includes('15,000')) return HouseholdIncomeRange.FROM_5K_TO_15K;
    if (v.includes('15') || v.includes('30')) return HouseholdIncomeRange.FROM_15K_TO_30K;
    if (v.includes('above') || v.includes('over') || v.includes('>30')) return HouseholdIncomeRange.ABOVE_30K;
    return null;
}

function mapOrphanStatus(raw: string): OrphanStatus | null {
    const v = raw.toLowerCase();
    if (v.includes('double') || v.includes('both parents dead')) return OrphanStatus.DOUBLE_ORPHAN;
    if (v.includes('single')) return OrphanStatus.SINGLE_ORPHAN;
    if (v.includes('both parents alive') || v.includes('both alive')) return OrphanStatus.BOTH_PARENTS_ALIVE;
    return null;
}

function parseDate(raw: string): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

function parseFeeBalance(raw: string): Prisma.Decimal | null {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : new Prisma.Decimal(n);
}

function extractDriveLinks(raw: string): string[] {
    const pattern = /https:\/\/drive\.google\.com\/[^\s,]+/g;
    return raw.match(pattern) ?? [];
}

function generateEmail(index: number, fullName: string): string {
    const slug = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/, '')
        .slice(0, 30);
    return `${slug || 'applicant'}.${index}@${IMPORT_EMAIL_DOMAIN}`;
}

function generatePhone(index: number): string {
    // Pad to give a unique placeholder
    return `+25400${String(index).padStart(7, '0')}`;
}

// ─── Geography helpers ───────────────────────────────────────────────────────

interface GeoIds { countyId: string; subCountyId: string; wardId: string }

async function resolveOrCreateGeo(
    countyName: string,
    subCountyName: string,
    wardName: string,
    flags: string[]
): Promise<GeoIds | null> {
    if (!countyName) { flags.push('Missing county – location not saved'); return null; }

    // County
    let county = await prisma.county.findFirst({ where: { name: { equals: countyName, mode: 'insensitive' } } });
    if (!county) {
        const code = countyName.toUpperCase().replace(/\s+/g, '_').slice(0, 10) + '_IMP';
        county = await prisma.county.create({ data: { name: countyName, code } });
        flags.push(`Created new county: ${countyName}`);
    }

    // Sub-county
    let subCounty = await prisma.subCounty.findFirst({
        where: { countyId: county.id, name: { equals: subCountyName || 'Unknown', mode: 'insensitive' } }
    });
    if (!subCounty) {
        const scName = subCountyName || 'Unknown';
        const code = `${county.code}_${scName.toUpperCase().replace(/\s+/g, '_').slice(0, 8)}_IMP`;
        subCounty = await prisma.subCounty.create({ data: { countyId: county.id, name: scName, code } });
        flags.push(`Created new sub-county: ${scName}`);
    }

    // Ward
    let ward = await prisma.ward.findFirst({
        where: { subCountyId: subCounty.id, name: { equals: wardName || 'Unknown', mode: 'insensitive' } }
    });
    if (!ward) {
        const wName = wardName || 'Unknown';
        const code = `${subCounty.code}_${wName.toUpperCase().replace(/\s+/g, '_').slice(0, 8)}_IMP`;
        ward = await prisma.ward.create({ data: { subCountyId: subCounty.id, name: wName, code } });
        flags.push(`Created new ward: ${wName}`);
    }

    return { countyId: county.id, subCountyId: subCounty.id, wardId: ward.id };
}

// ─── Application number generator ────────────────────────────────────────────

let appCounter = 0;

async function nextAppNumber(): Promise<string> {
    appCounter++;
    const year = new Date().getFullYear();
    // Find the highest existing import number to avoid collisions
    if (appCounter === 1) {
        const last = await prisma.application.findFirst({
            where: { applicationNumber: { contains: `IMP-${year}` } },
            orderBy: { applicationNumber: 'desc' }
        });
        if (last) {
            const n = parseInt(last.applicationNumber.split('-')[2] ?? '0', 10);
            appCounter = n + 1;
        }
    }
    return `IMP-${year}-${String(appCounter).padStart(5, '0')}`;
}

// ─── Row processor ───────────────────────────────────────────────────────────

async function processRow(row: Record<string, string>, rowIndex: number): Promise<ImportResult> {
    const flags: string[] = [];

    // ── 1. Extract fields ──────────────────────────────────────────────────────

    const studentType = col(row, 'which option best describes you');
    const fullNameRaw = col(row, 'full name (as per official records)', 'student full name');
    const nationalId = col(row, 'national id / passport number', 'national id');
    const ageRangeRaw = col(row, 'age range');
    const residence = col(row, 'current place of residence');
    const phoneRaw = col(row, 'phone number', 'parent/guardian phone');
    const emailRaw = col(row, 'email address (optional)', 'email address');
    const institution = col(row, 'institution name (university', 'name of school');
    const programme = col(row, 'programme / course');
    const yearOfStudy = col(row, 'year of study', 'current class/form');
    const sponsorship = col(row, 'mode of study sponsorship', 'main source of school support');
    const feeBalanceRaw = col(row, 'outstanding school fee balance', 'how much is outstanding');
    const howSupporting = col(row, 'how are you currently supporting your education');
    const feeAffecting = col(row, 'is your current fee balance affecting your studies');
    const missedExams = col(row, 'have you ever missed exams');
    const difficulties = col(row, 'which of the following best describes what is making it difficult');
    const narrative = col(row, 'please share how the situation', 'tell us about yourself');
    const goalRaw = col(row, 'one goal you are committed', 'why should you be considered');
    const driveLinks = col(row, 'supporting documents upload', 'please upload any supporting documents');
    const dobRaw = col(row, 'student date of birth', 'date of birth');
    const genderRaw = col(row, 'student gender', 'gender');
    const countyRaw = col(row, 'county of residence');
    const subCountyRaw = col(row, 'sub-county of residence');
    const wardRaw = col(row, 'ward of residence');
    const schoolType = col(row, 'school type');
    const whoLivesWithRaw = col(row, 'who do you live with');
    const feeSituationRaw = col(row, 'which statement best describes your current school fees situation');
    const guardianName = col(row, 'parent/guardian full name');
    const guardianPhone = col(row, 'parent/guardian phone');
    const guardianRel = col(row, 'relationship to you');
    const referral = col(row, 'where did you first hear about');
    const referralDetail = col(row, 'please specify');

    // ── 2. Determine name & email ──────────────────────────────────────────────

    const fullName = fullNameRaw || `Applicant ${rowIndex}`;
    if (!fullNameRaw) flags.push('Full name missing – placeholder used');

    let email = emailRaw;
    if (!email) {
        email = generateEmail(rowIndex, fullName);
        flags.push(`Email missing – generated: ${email}`);
    }
    // Make email lowercase + safe
    email = email.toLowerCase().trim();

    // ── 3. Determine phone ────────────────────────────────────────────────────

    let phone = phoneRaw.replace(/[^0-9+]/g, '');
    if (!phone || phone.length < 9) {
        phone = generatePhone(rowIndex);
        flags.push(`Phone missing/invalid – generated: ${phone}`);
    } else if (phone.startsWith('0')) {
        phone = '+254' + phone.slice(1);
    } else if (!phone.startsWith('+')) {
        phone = '+' + phone;
    }

    // ── 4. Education level ────────────────────────────────────────────────────

    const educationLevel = mapEducationLevel(studentType || schoolType || '');

    // ── 5. Date of birth ─────────────────────────────────────────────────────

    const dob = parseDate(dobRaw);
    if (!dob) flags.push('Date of birth missing or invalid – defaulted to 18 years ago');
    const dateOfBirth = dob ?? new Date(new Date().setFullYear(new Date().getFullYear() - 18));

    // ── 6. Fee balance ────────────────────────────────────────────────────────

    const feeBalance = parseFeeBalance(feeBalanceRaw);
    if (!feeBalance || feeBalance.isZero()) flags.push('Fee balance missing or zero');

    // ── 7. Narrative ─────────────────────────────────────────────────────────

    const hardshipNarrative = narrative || 'No narrative provided.';
    if (!narrative) flags.push('Hardship narrative missing');

    // ── 8. Geography ─────────────────────────────────────────────────────────

    let geoIds: GeoIds | null = null;
    if (countyRaw) {
        geoIds = DRY_RUN ? null : await resolveOrCreateGeo(countyRaw, subCountyRaw, wardRaw, flags);
    } else {
        flags.push('County missing – profile location fields will be empty');
    }

    // ── 9. Sponsorship modes ──────────────────────────────────────────────────

    const sponsorshipModes = sponsorship
        .split(/[,/]/)
        .map(s => s.trim().toUpperCase().replace(/\s+/g, '_'))
        .filter(Boolean);

    // ── 10. Drive links ───────────────────────────────────────────────────────

    const links = extractDriveLinks(driveLinks);

    // ── 11. Map optional booleans ─────────────────────────────────────────────

    const isFeesAffecting = /yes|affected|affecting/i.test(feeAffecting);
    const hasBeenSentHome = /sent home|out of school/i.test(feeSituationRaw + feeAffecting);
    const hasMissedExams = /yes|missed/i.test(missedExams);

    // ═══ DRY RUN – stop here ════════════════════════════════════════════════

    if (DRY_RUN) {
        return {
            rowIndex,
            email,
            status: flags.some(f => f.includes('missing')) ? 'PARTIAL' : 'SUCCESS',
            flags,
        };
    }

    // ═══ DATABASE WRITES ═════════════════════════════════════════════════════

    try {
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // ── User ─────────────────────────────────────────────────────────────

        let user = await prisma.user.findFirst({ where: { email } });
        if (!user) {
            // Ensure phone uniqueness
            const existingPhone = await prisma.user.findFirst({ where: { phone } });
            if (existingPhone) {
                phone = generatePhone(rowIndex + 90000); // bump to avoid collision
                flags.push(`Phone collision resolved – using: ${phone}`);
            }
            user = await prisma.user.create({
                data: {
                    email,
                    phone,
                    password: hashedPassword,
                    role: UserRole.STUDENT,
                    consentLogs: {
                        create: { ipAddress: '0.0.0.0', consentVersion: CONSENT_VERSION }
                    }
                }
            });
        } else {
            flags.push('User already exists – skipping user creation');
        }

        // ── StudentProfile ────────────────────────────────────────────────────

        let profile = await prisma.studentProfile.findFirst({ where: { userId: user.id } });

        if (!profile) {
            const profileData: Prisma.StudentProfileCreateInput = {
                user: { connect: { id: user.id } },
                fullName,
                dateOfBirth,
                gender: genderRaw || 'UNKNOWN',
                ageRange: ageRangeRaw || null,
                nationalIdNumber: nationalId || null,
                // Location (required fields – fallback to placeholder if no geo)
                countyId: geoIds?.countyId ?? await getOrCreateFallbackCounty(),
                subCountyId: geoIds?.subCountyId ?? await getOrCreateFallbackSubCounty(),
                wardId: geoIds?.wardId ?? await getOrCreateFallbackWard(),
                currentResidence: residence || null,
                // Institution
                institutionName: institution || 'Unknown Institution',
                institutionType: educationLevel,
                programmeOrCourse: programme || 'Unknown',
                admissionYear: new Date().getFullYear(),
                // Family
                whoLivesWith: mapWhoLivesWith(whoLivesWithRaw),
                guardianName: guardianName || null,
                guardianPhone: guardianPhone || null,
                guardianOccupation: guardianRel || null,
                // Calculated / misc
                isComplete: false,
                phoneNumber: phone,
            };

            profile = await prisma.studentProfile.create({ data: profileData });
        } else {
            flags.push('Profile already exists – skipping profile creation');
        }

        // ── Application ───────────────────────────────────────────────────────

        const appNumber = await nextAppNumber();

        const app = await prisma.application.create({
            data: {
                applicationNumber: appNumber,
                studentProfileId: profile.id,
                status: ApplicationStatus.PENDING,
                outstandingFeesBalance: feeBalance ?? new Prisma.Decimal(0),
                hardshipNarrative,
                currentYearOfStudy: yearOfStudy || '1',
                modeOfSponsorship: sponsorshipModes.length ? sponsorshipModes : ['UNKNOWN'],
                howSupportingEducation: howSupporting ? [howSupporting] : [],
                isFeesAffectingStudies: isFeesAffecting,
                hasBeenSentHome,
                hasMissedExamsOrClasses: hasMissedExams,
                difficultiesFaced: difficulties ? [difficulties] : [],
                goalForAcademicYear: goalRaw || null,
                currentFeeSituation: feeSituationRaw || null,
                referralSource: [referral, referralDetail].filter(Boolean).join(' – ') || null,
                submittedAt: new Date(),
                // Snapshot
                snapshotFullName: fullName,
                snapshotDateOfBirth: dateOfBirth,
                snapshotGender: genderRaw || null,
                snapshotNationalId: nationalId || null,
                snapshotInstitution: institution || null,
                snapshotProgramme: programme || null,
                snapshotCounty: countyRaw || null,
                snapshotSubCounty: subCountyRaw || null,
                snapshotWard: wardRaw || null,
                snapshotEmail: email,
                snapshotPhone: phone,
                snapshotEducationLevel: educationLevel,
            }
        });

        // Status history entry
        await prisma.applicationStatusHistory.create({
            data: {
                applicationId: app.id,
                newStatus: ApplicationStatus.PENDING,
                changedBy: user.id,
                reason: 'Imported from CSV',
                autoGenerated: true,
            }
        });

        // ── ApplicationDocuments (Drive links) ────────────────────────────────

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const storedFilename = `drive_import_${app.id}_${i}.url`;

            await prisma.applicationDocument.upsert({
                where: { storedFilename },
                update: {},
                create: {
                    applicationId: app.id,
                    documentType: ApplicationDocumentType.OTHER_EVIDENCE,
                    originalFilename: `google_drive_document_${i + 1}`,
                    storedFilename,
                    filePath: link,   // Store Drive URL as filePath
                    fileSize: 0,
                    mimeType: 'application/x-google-drive-link',
                }
            });
        }

        if (links.length > 0) flags.push(`Stored ${links.length} Google Drive link(s) as documents`);

        return {
            rowIndex,
            email,
            status: flags.length === 0 ? 'SUCCESS' : 'PARTIAL',
            flags,
        };

    } catch (err: any) {
        return {
            rowIndex,
            email,
            status: 'SKIPPED',
            flags,
            error: err?.message ?? String(err),
        };
    }
}

// ─── Fallback geography (when county is completely missing) ──────────────────

let _fallbackCountyId: string | null = null;
let _fallbackSubCountyId: string | null = null;
let _fallbackWardId: string | null = null;

async function getOrCreateFallbackCounty(): Promise<string> {
    if (_fallbackCountyId) return _fallbackCountyId;
    let c = await prisma.county.findFirst({ where: { code: 'UNKNOWN_IMP' } });
    if (!c) c = await prisma.county.create({ data: { name: 'Unknown (Imported)', code: 'UNKNOWN_IMP' } });
    _fallbackCountyId = c.id;
    return c.id;
}

async function getOrCreateFallbackSubCounty(): Promise<string> {
    if (_fallbackSubCountyId) return _fallbackSubCountyId;
    const countyId = await getOrCreateFallbackCounty();
    let sc = await prisma.subCounty.findFirst({ where: { code: 'UNKNOWN_SC_IMP' } });
    if (!sc) sc = await prisma.subCounty.create({ data: { countyId, name: 'Unknown Sub-county', code: 'UNKNOWN_SC_IMP' } });
    _fallbackSubCountyId = sc.id;
    return sc.id;
}

async function getOrCreateFallbackWard(): Promise<string> {
    if (_fallbackWardId) return _fallbackWardId;
    const subCountyId = await getOrCreateFallbackSubCounty();
    let w = await prisma.ward.findFirst({ where: { code: 'UNKNOWN_WD_IMP' } });
    if (!w) w = await prisma.ward.create({ data: { subCountyId, name: 'Unknown Ward', code: 'UNKNOWN_WD_IMP' } });
    _fallbackWardId = w.id;
    return w.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n========================================');
    console.log(' STF CSV Import Tool');
    console.log('========================================');
    console.log(`  File:    ${CSV_FILE}`);
    console.log(`  Dry run: ${DRY_RUN}`);
    console.log('========================================\n');

    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ File not found: ${CSV_FILE}`);
        process.exit(1);
    }

    const rows = await parseCSV(CSV_FILE);
    console.log(`📄 Parsed ${rows.length} rows from CSV\n`);

    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        console.log(`Processing row ${i + 1}/${rows.length}...`);
        const result = await processRow(row, i + 1);
        results.push(result);

        const icon = result.status === 'SUCCESS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
        console.log(`  ${icon} [${result.status}] ${result.email}`);
        if (result.flags.length) result.flags.forEach(f => console.log(`       ↳ ${f}`));
        if (result.error) console.log(`       ✖ ERROR: ${result.error}`);
    }

    // ── Summary ────────────────────────────────────────────────────────────────

    const success = results.filter(r => r.status === 'SUCCESS').length;
    const partial = results.filter(r => r.status === 'PARTIAL').length;
    const skipped = results.filter(r => r.status === 'SKIPPED').length;

    console.log('\n========================================');
    console.log(' Import Summary');
    console.log('========================================');
    console.log(`  ✅ Success : ${success}`);
    console.log(`  ⚠️  Partial : ${partial}`);
    console.log(`  ❌ Skipped : ${skipped}`);
    console.log(`  📊 Total   : ${results.length}`);
    if (DRY_RUN) console.log('\n  [DRY RUN – no data was written to the database]');
    console.log('========================================\n');

    // Write report to import-report.json
    const reportPath = path.join(path.dirname(CSV_FILE), 'import-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📝 Full report saved to: ${reportPath}\n`);
}

main()
    .catch(err => {
        console.error('\n❌ Fatal error:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());