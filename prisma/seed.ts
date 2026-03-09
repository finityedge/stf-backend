import { PrismaClient, UserRole } from '@prisma/client';
// @ts-ignore
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding admin accounts...');

    const adminPassword = await bcrypt.hash('Admin@2025', 12);

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

    console.log('✅ Admin seeded: admin@stf.org / Admin@2025');
    console.log('Seed complete.');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
