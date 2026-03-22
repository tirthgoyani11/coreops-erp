/**
 * QR Code Regeneration Script
 * 
 * Re-generates all asset QR codes using the current FRONTEND_URL.
 * Run this after updating the production domain.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://coreops.tirthgoyani.in';

async function main() {
    console.log(`Current Working Directory: ${process.cwd()}`);
    console.log(`DATABASE_URL (masked): ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'undefined'}`);
    console.log(`Starting QR code regeneration...`);
    console.log(`Using FRONTEND_URL: ${FRONTEND_URL}`);

    const assets = await prisma.asset.findMany({
        select: { id: true, guai: true, name: true }
    });

    console.log(`Found ${assets.length} assets to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const asset of assets) {
        try {
            const qrData = `${FRONTEND_URL}/assets/${asset.id}`;
            const qrCode = await QRCode.toDataURL(qrData);

            await prisma.asset.update({
                where: { id: asset.id },
                data: { qrCode }
            });

            successCount++;
            if (successCount % 10 === 0) {
                console.log(`Processed ${successCount}/${assets.length} assets...`);
            }
        } catch (error) {
            console.error(`Failed to regenerate QR for asset ${asset.guai}:`, error.message);
            failCount++;
        }
    }

    console.log(`
Regeneration complete!
----------------------
Total assets: ${assets.length}
Success:      ${successCount}
Failed:       ${failCount}
`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
