const prisma = require('../src/config/prisma');

async function main() {
    const users = await prisma.user.findMany({
        take: 3,
        select: { email: true, role: true, name: true }
    });
    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

main();
