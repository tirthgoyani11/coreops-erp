require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
  const payrollRuns = await prisma.payrollRun.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      runCode: true,
      officeId: true,
      periodStart: true,
      periodEnd: true,
      grossAmount: true,
      processedById: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const run of payrollRuns) {
    const existing = await prisma.transaction.findFirst({
      where: {
        type: 'EXPENSE',
        category: 'PAYROLL',
        referenceId: run.id,
        officeId: run.officeId,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        category: 'PAYROLL',
        amount: Number(run.grossAmount || 0),
        currency: 'INR',
        date: run.periodEnd,
        description: `Payroll run ${run.runCode} (${run.periodStart.toISOString().slice(0, 10)} to ${run.periodEnd.toISOString().slice(0, 10)})`,
        referenceType: 'MANUAL',
        referenceId: run.id,
        officeId: run.officeId,
        recordedById: run.processedById || null,
        status: 'CLEARED',
      },
    });

    created += 1;
  }

  console.log(`Payroll expense backfill complete. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
