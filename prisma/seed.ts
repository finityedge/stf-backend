import { PrismaClient, UserRole, EducationLevel } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // ── Admin Account ──────────────────────────────────────────────────────
    console.log('Seeding admin account...');
    const adminPassword = await bcrypt.hash('Admin@2025', 12);
    await prisma.user.upsert({
        where: { email: 'admin@stf.org' },
        update: {},
        create: {
            email: 'admin@stf.org',
            phone: '+254700000000',
            password: adminPassword,
            role: UserRole.ADMIN,
            consentLogs: {
                create: { ipAddress: '127.0.0.1', consentVersion: '1.0' },
            },
        },
    });
    console.log('✅ Admin seeded: admin@stf.org / Admin@2025');

    // ── Counties ───────────────────────────────────────────────────────────
    console.log('Seeding counties...');
    const countiesData = [
        { name: 'Mombasa',  code: '001' },
        { name: 'Nairobi',  code: '047' },
        { name: 'Kisumu',   code: '040' },
        { name: 'Nakuru',   code: '032' },
        { name: 'Kiambu',   code: '022' },
    ];
    await prisma.county.createMany({ data: countiesData, skipDuplicates: true });
    console.log(`✅ ${countiesData.length} counties seeded`);

    const counties = await prisma.county.findMany({
        where: { code: { in: countiesData.map(c => c.code) } },
    });
    const countyById: Record<string, string> = Object.fromEntries(counties.map(c => [c.code, c.id]));

    // ── Sub-Counties ───────────────────────────────────────────────────────
    console.log('Seeding sub-counties...');
    const subCountiesData = [
        // Mombasa
        { countyCode: '001', name: 'Changamwe',      code: 'SC-001-01' },
        { countyCode: '001', name: 'Jomvu',           code: 'SC-001-02' },
        { countyCode: '001', name: 'Kisauni',         code: 'SC-001-03' },
        // Nairobi
        { countyCode: '047', name: 'Westlands',       code: 'SC-047-01' },
        { countyCode: '047', name: 'Dagoretti North', code: 'SC-047-02' },
        { countyCode: '047', name: 'Langata',         code: 'SC-047-03' },
        // Kisumu
        { countyCode: '040', name: 'Kisumu Central',  code: 'SC-040-01' },
        { countyCode: '040', name: 'Kisumu East',     code: 'SC-040-02' },
        { countyCode: '040', name: 'Kisumu West',     code: 'SC-040-03' },
        // Nakuru
        { countyCode: '032', name: 'Nakuru Town East', code: 'SC-032-01' },
        { countyCode: '032', name: 'Nakuru Town West', code: 'SC-032-02' },
        { countyCode: '032', name: 'Naivasha',         code: 'SC-032-03' },
        // Kiambu
        { countyCode: '022', name: 'Thika Town',      code: 'SC-022-01' },
        { countyCode: '022', name: 'Ruiru',           code: 'SC-022-02' },
        { countyCode: '022', name: 'Githunguri',      code: 'SC-022-03' },
    ];
    await prisma.subCounty.createMany({
        data: subCountiesData.map(sc => ({
            countyId: countyById[sc.countyCode],
            name:     sc.name,
            code:     sc.code,
        })),
        skipDuplicates: true,
    });
    console.log(`✅ ${subCountiesData.length} sub-counties seeded`);

    const subCounties = await prisma.subCounty.findMany({
        where: { code: { in: subCountiesData.map(sc => sc.code) } },
    });
    const subCountyById: Record<string, string> = Object.fromEntries(subCounties.map(sc => [sc.code, sc.id]));

    // ── Wards ──────────────────────────────────────────────────────────────
    console.log('Seeding wards...');
    const wardsData = [
        // Changamwe
        { scCode: 'SC-001-01', name: 'Port Reitz',         code: 'W-001-01-01' },
        { scCode: 'SC-001-01', name: 'Kipevu',             code: 'W-001-01-02' },
        // Jomvu
        { scCode: 'SC-001-02', name: 'Jomvu Kuu',          code: 'W-001-02-01' },
        { scCode: 'SC-001-02', name: 'Miritini',           code: 'W-001-02-02' },
        // Kisauni
        { scCode: 'SC-001-03', name: 'Bamburi',            code: 'W-001-03-01' },
        { scCode: 'SC-001-03', name: 'Junda',              code: 'W-001-03-02' },
        // Westlands
        { scCode: 'SC-047-01', name: 'Kitisuru',           code: 'W-047-01-01' },
        { scCode: 'SC-047-01', name: 'Parklands/Highridge', code: 'W-047-01-02' },
        // Dagoretti North
        { scCode: 'SC-047-02', name: 'Kilimani',           code: 'W-047-02-01' },
        { scCode: 'SC-047-02', name: 'Kawangware',         code: 'W-047-02-02' },
        // Langata
        { scCode: 'SC-047-03', name: 'Karen',              code: 'W-047-03-01' },
        { scCode: 'SC-047-03', name: 'Nairobi West',       code: 'W-047-03-02' },
        // Kisumu Central
        { scCode: 'SC-040-01', name: 'Kondele',            code: 'W-040-01-01' },
        { scCode: 'SC-040-01', name: 'Central Kisumu',     code: 'W-040-01-02' },
        // Kisumu East
        { scCode: 'SC-040-02', name: 'Kajulu',             code: 'W-040-02-01' },
        { scCode: 'SC-040-02', name: 'Kolwa East',         code: 'W-040-02-02' },
        // Kisumu West
        { scCode: 'SC-040-03', name: 'South West Kisumu',  code: 'W-040-03-01' },
        { scCode: 'SC-040-03', name: 'West Kisumu',        code: 'W-040-03-02' },
        // Nakuru Town East
        { scCode: 'SC-032-01', name: 'Biashara',           code: 'W-032-01-01' },
        { scCode: 'SC-032-01', name: 'Kivumbini',          code: 'W-032-01-02' },
        // Nakuru Town West
        { scCode: 'SC-032-02', name: 'Flamingo',           code: 'W-032-02-01' },
        { scCode: 'SC-032-02', name: 'Shabaab',            code: 'W-032-02-02' },
        // Naivasha
        { scCode: 'SC-032-03', name: 'Mai Mahiu',          code: 'W-032-03-01' },
        { scCode: 'SC-032-03', name: 'Naivasha East',      code: 'W-032-03-02' },
        // Thika Town
        { scCode: 'SC-022-01', name: 'Thika Township',     code: 'W-022-01-01' },
        { scCode: 'SC-022-01', name: 'Hospital',           code: 'W-022-01-02' },
        // Ruiru
        { scCode: 'SC-022-02', name: 'Ruiru Township',     code: 'W-022-02-01' },
        { scCode: 'SC-022-02', name: 'Gitothua',           code: 'W-022-02-02' },
        // Githunguri
        { scCode: 'SC-022-03', name: 'Githunguri',         code: 'W-022-03-01' },
        { scCode: 'SC-022-03', name: 'Githiga',            code: 'W-022-03-02' },
    ];
    await prisma.ward.createMany({
        data: wardsData.map(w => ({
            subCountyId: subCountyById[w.scCode],
            name:        w.name,
            code:        w.code,
        })),
        skipDuplicates: true,
    });
    console.log(`✅ ${wardsData.length} wards seeded`);

    // ── Institutions ───────────────────────────────────────────────────────
    console.log('Seeding institutions...');
    const institutionsData = [
        // Universities
        { name: 'University of Nairobi',                                    type: EducationLevel.UNIVERSITY,  county: 'Nairobi',       isVerified: true },
        { name: 'Kenyatta University',                                      type: EducationLevel.UNIVERSITY,  county: 'Kiambu',        isVerified: true },
        { name: 'Jomo Kenyatta University of Agriculture and Technology',   type: EducationLevel.UNIVERSITY,  county: 'Kiambu',        isVerified: true },
        { name: 'Moi University',                                           type: EducationLevel.UNIVERSITY,  county: 'Uasin Gishu',   isVerified: true },
        { name: 'Maseno University',                                        type: EducationLevel.UNIVERSITY,  county: 'Kisumu',        isVerified: true },
        { name: 'Strathmore University',                                    type: EducationLevel.UNIVERSITY,  county: 'Nairobi',       isVerified: true },
        // Colleges
        { name: 'Kenya Medical Training College - Nairobi',                 type: EducationLevel.COLLEGE,     county: 'Nairobi',       isVerified: true },
        { name: 'Kenya Institute of Management',                            type: EducationLevel.COLLEGE,     county: 'Nairobi',       isVerified: true },
        { name: 'Cooperative University of Kenya',                          type: EducationLevel.COLLEGE,     county: 'Kiambu',        isVerified: true },
        // TVETs
        { name: 'Nairobi Technical Training Institute',                     type: EducationLevel.TVET,        county: 'Nairobi',       isVerified: true },
        { name: 'Mombasa Technical Training Institute',                     type: EducationLevel.TVET,        county: 'Mombasa',       isVerified: true },
        { name: 'Kisumu Polytechnic',                                       type: EducationLevel.TVET,        county: 'Kisumu',        isVerified: true },
        { name: 'Nakuru Technical Training Institute',                      type: EducationLevel.TVET,        county: 'Nakuru',        isVerified: true },
        // High Schools
        { name: 'Alliance High School',                                     type: EducationLevel.HIGH_SCHOOL, county: 'Kiambu',        isVerified: true },
        { name: 'Nairobi School',                                           type: EducationLevel.HIGH_SCHOOL, county: 'Nairobi',       isVerified: true },
        { name: 'Kenya High School',                                        type: EducationLevel.HIGH_SCHOOL, county: 'Nairobi',       isVerified: true },
        { name: "Mang'u High School",                                       type: EducationLevel.HIGH_SCHOOL, county: 'Kiambu',        isVerified: true },
        { name: 'Kisumu Boys High School',                                  type: EducationLevel.HIGH_SCHOOL, county: 'Kisumu',        isVerified: true },
    ];
    await prisma.institution.createMany({ data: institutionsData, skipDuplicates: true });
    console.log(`✅ ${institutionsData.length} institutions seeded`);

    console.log('\n🎉 Seed complete.');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
