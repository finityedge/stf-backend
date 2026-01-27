import {
    PrismaClient,
    UserRole,
    EducationLevel,
    ApplicationStatus,
    ProfileDocumentType,
    ApplicationDocumentType,
    Prisma
} from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcrypt';
// import { v4 as uuidv4 } from 'uuid'; // Removed unused import

const prisma = new PrismaClient();

async function main() {
    console.log('Starting enhanced database seed...');

    // ==================== GEOGRAPHIC DATA ====================

    // Narok County (Home County)
    // Removed unused variable assignment
    await prisma.county.upsert({
        where: { name: 'Narok' },
        update: {},
        create: {
            name: 'Narok',
            code: 'NRK',
            subCounties: {
                create: [
                    {
                        name: 'Narok North',
                        code: 'NRK-NN',
                        wards: {
                            create: [
                                { name: 'Narok Town', code: 'NRK-NN-NT' },
                                { name: 'Olokurto', code: 'NRK-NN-OL' },
                                { name: 'Nkareta', code: 'NRK-NN-NK' },
                            ],
                        },
                    },
                    {
                        name: 'Narok South',
                        code: 'NRK-NS',
                        wards: {
                            create: [
                                { name: 'Majimoto/Naroosura', code: 'NRK-NS-MN' },
                                { name: 'Ololulunga', code: 'NRK-NS-OLL' },
                            ],
                        },
                    },
                    {
                        name: 'Narok West',
                        code: 'NRK-NW',
                        wards: {
                            create: [
                                { name: 'Mara', code: 'NRK-NW-MR' },
                                { name: 'Siana', code: 'NRK-NW-SN' },
                            ],
                        },
                    },
                    {
                        name: 'Trans Mara East', // Emurua Dikirr
                        code: 'NRK-TE',
                        wards: {
                            create: [
                                { name: 'Ilkerin', code: 'NRK-TE-IL' },
                                { name: 'Ololmasani', code: 'NRK-TE-OL' },
                            ],
                        },
                    },
                ],
            },
        },
    });

    // Nairobi (already existed, but ensure it's there)
    // Removed unused variable assignment
    await prisma.county.upsert({
        where: { name: 'Nairobi' },
        update: {},
        create: {
            name: 'Nairobi',
            code: 'NRB',
            subCounties: {
                create: [
                    {
                        name: 'Westlands',
                        code: 'NRB-WL',
                        wards: {
                            create: [
                                { name: 'Kitisuru', code: 'NRB-WL-KIT' },
                                { name: 'Parklands', code: 'NRB-WL-PRK' },
                            ],
                        },
                    },
                ],
            },
        },
    });

    console.log('Counties seeded');

    // ==================== USERS & ADMINS ====================

    const adminPassword = await bcrypt.hash('Admin@2025', 12);
    const studentPassword = await bcrypt.hash('Student@123', 12);

    // Default Admin
    await prisma.user.upsert({
        where: { email: 'admin@stf.org' },
        update: {},
        create: {
            email: 'admin@stf.org',
            phone: '+254700000000',
            password: adminPassword,
            role: UserRole.ADMIN,
            consentLogs: {
                create: {
                    ipAddress: '127.0.0.1',
                    consentVersion: '1.0',
                },
            },
        },
    });

    console.log('Admin user seeded');

    // ==================== HELPER FUNCTIONS ====================

    // Helper to get random item from array
    const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Get location data
    const locationData = await prisma.county.findMany({
        include: {
            subCounties: {
                include: { wards: true }
            }
        }
    });

    const getRandomLocation = () => {
        const county = getRandom(locationData);
        const subCounty = getRandom(county.subCounties);
        const ward = getRandom(subCounty.wards);
        return { county, subCounty, ward };
    };

    // ==================== SAMPLE STUDENTS ====================

    const createStudent = async (index: number, educationLevel: EducationLevel, hasApp: boolean, status?: ApplicationStatus) => {
        const email = `student${index}@example.com`;
        const phone = `+2547${String(index).padStart(8, '0')}`;
        const { county, subCounty, ward } = getRandomLocation();

        // Create User
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                phone,
                password: studentPassword,
                role: UserRole.STUDENT,
                consentLogs: {
                    create: {
                        ipAddress: '127.0.0.1',
                        consentVersion: '1.0',
                    },
                },
            },
        });

        // Create Profile
        const dob = new Date();
        dob.setFullYear(dob.getFullYear() - (18 + Math.floor(Math.random() * 5)));

        const profile = await prisma.studentProfile.upsert({
            where: { userId: user.id },
            update: {
                // Ensure profile docs are created even if profile exists
                profileDocuments: {
                    upsert: {
                        where: { storedFilename: `id_${user.id}.jpg` },
                        update: {},
                        create: {
                            documentType: ProfileDocumentType.NATIONAL_ID,
                            originalFilename: 'id.jpg',
                            storedFilename: `id_${user.id}.jpg`,
                            filePath: `/uploads/profile-documents/${user.id}/id_${user.id}.jpg`,
                            fileSize: 1024 * 500,
                            mimeType: 'image/jpeg',
                        }
                    }
                }
            },
            create: {
                userId: user.id,
                fullName: `Test Student ${index}`,
                dateOfBirth: dob,
                gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                ageRange: '18-22',
                nationalIdNumber: String(10000000 + index),
                countyId: county.id,
                subCountyId: subCounty.id,
                wardId: ward.id,
                institutionName: educationLevel === EducationLevel.UNIVERSITY ? 'University of Nairobi' : 'Alliance High School',
                institutionType: educationLevel,
                programmeOrCourse: educationLevel === EducationLevel.UNIVERSITY ? 'Computer Science' : 'Secondary Education',
                admissionYear: 2023,
                isComplete: true,
                profileDocuments: {
                    create: [
                        {
                            documentType: ProfileDocumentType.NATIONAL_ID,
                            originalFilename: 'id.jpg',
                            storedFilename: `id_${user.id}.jpg`,
                            filePath: `/uploads/profile-documents/${user.id}/id_${user.id}.jpg`,
                            fileSize: 1024 * 500,
                            mimeType: 'image/jpeg',
                        }
                    ]
                }
            },
        });

        // Create Application if requested
        if (hasApp && status) {
            const appNumber = `STF-${new Date().getFullYear()}-${String(index).padStart(5, '0')}`;

            const app = await prisma.application.upsert({
                where: { applicationNumber: appNumber },
                update: {},
                create: {
                    applicationNumber: appNumber,
                    studentProfileId: profile.id,
                    status: status,
                    outstandingFeesBalance: new Prisma.Decimal(Math.random() * 50000 + 10000),
                    hardshipNarrative: 'I am in need of financial assistance due to family hardship. My parents are unable to support my education fully.',
                    currentYearOfStudy: '2',
                    modeOfSponsorship: ['SELF', 'PARENT'],
                    submittedAt: status !== ApplicationStatus.DRAFT ? new Date() : null,

                    // Snapshot data (only if submitted)
                    ...(status !== ApplicationStatus.DRAFT ? {
                        snapshotFullName: profile.fullName,
                        snapshotDateOfBirth: profile.dateOfBirth,
                        snapshotGender: profile.gender,
                        snapshotNationalId: profile.nationalIdNumber,
                        snapshotCounty: county.name,
                        snapshotSubCounty: subCounty.name,
                        snapshotWard: ward.name,
                        snapshotInstitution: profile.institutionName,
                        snapshotProgramme: profile.programmeOrCourse,
                        snapshotEducationLevel: profile.institutionType,
                        snapshotEmail: email,
                        snapshotPhone: phone,
                    } : {}),
                }
            });

            // Status History - Check if exists first to avoid duplicates
            // Or only create if app was just created (upsert doesn't tell us easily)
            // But we can check count or upsert a dummy/unique field if possible.
            // Since History doesn't have a unique logical key besides ID, we will skip if any history exists
            const existingHistory = await prisma.applicationStatusHistory.findFirst({
                where: { applicationId: app.id, newStatus: status }
            });

            if (!existingHistory) {
                await prisma.applicationStatusHistory.create({
                    data: {
                        applicationId: app.id,
                        newStatus: status,
                        changedBy: user.id,
                        reason: status === ApplicationStatus.DRAFT ? 'Draft created' : 'Application submitted',
                    }
                });
            }

            // Add documents for submitted apps
            if (status !== ApplicationStatus.DRAFT) {
                await prisma.applicationDocument.upsert({
                    where: { storedFilename: `fees_${app.id}.pdf` },
                    update: {},
                    create: {
                        applicationId: app.id,
                        documentType: ApplicationDocumentType.FEE_STRUCTURE,
                        originalFilename: 'fees.pdf',
                        storedFilename: `fees_${app.id}.pdf`,
                        filePath: `/uploads/application-documents/${app.id}/fees_${app.id}.pdf`,
                        fileSize: 1024 * 1024,
                        mimeType: 'application/pdf',
                    }
                });
            }
        }

        console.log(`Student ${index} created: ${email}`);
    };

    // Create 10 sample students
    // 5 University, 5 College/High School
    // Mix of statuses

    // 1. Submitted (Pending)
    await createStudent(1, EducationLevel.UNIVERSITY, true, ApplicationStatus.PENDING);
    await createStudent(2, EducationLevel.COLLEGE, true, ApplicationStatus.PENDING);

    // 2. Draft
    await createStudent(3, EducationLevel.UNIVERSITY, true, ApplicationStatus.DRAFT);

    // 3. Approved
    await createStudent(4, EducationLevel.UNIVERSITY, true, ApplicationStatus.APPROVED);

    // 4. Rejected
    await createStudent(5, EducationLevel.TVET, true, ApplicationStatus.REJECTED);

    // 5. Disbursed
    await createStudent(6, EducationLevel.UNIVERSITY, true, ApplicationStatus.DISBURSED);

    // 6. Profile Only (No App)
    await createStudent(7, EducationLevel.HIGH_SCHOOL, false);
    await createStudent(8, EducationLevel.HIGH_SCHOOL, false);
    await createStudent(9, EducationLevel.COLLEGE, false);
    await createStudent(10, EducationLevel.TVET, false);

    console.log('Database seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
