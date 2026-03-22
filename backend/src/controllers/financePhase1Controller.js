const prisma = require('../config/prisma');
const { publishEvent } = require('../coreops/eventBus');
const { evaluateEvent } = require('../coreops/automationEngine');

const CLOSE_TASKS = [
  { key: 'lock_ap_period', label: 'Lock AP period' },
  { key: 'lock_ar_period', label: 'Lock AR period' },
  { key: 'post_accruals', label: 'Post accruals' },
  { key: 'run_consolidation', label: 'Run consolidation' },
  { key: 'review_revenue_recognition', label: 'Review revenue recognition' },
  { key: 'controller_approval', label: 'Controller approval' },
];

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function periodCode(month, year) {
  return `${year}-${String(Number(month)).padStart(2, '0')}`;
}

function resolveOfficeIdFromReq(req) {
  const officeId = req.user?.office?.id || req.user?.officeId || null;
  if (!officeId) return null;
  if (typeof officeId === 'object') return officeId.id || null;
  return officeId;
}

async function publishFinancePhase1Event(eventName, payload, req, officeId) {
  const envelope = await publishEvent(eventName, payload, {
    source: 'finance.phase1.controller',
    officeId,
    actorId: req.user?.id || null,
    traceId: req.traceId || req.id || null,
  });

  await evaluateEvent(envelope, {
    source: 'finance.phase1.controller',
    consumer: 'finance.phase1.controller',
    officeId,
    actorId: req.user?.id || null,
  });

  return envelope;
}

async function getNextEntryNumber(tx) {
  const year = new Date().getFullYear();

  for (let i = 0; i < 50; i += 1) {
    const counter = await tx.counter.upsert({
      where: { name: `JE_${year}` },
      update: { sequence: { increment: 1 } },
      create: {
        name: `JE_${year}`,
        prefix: `JE-${year}-`,
        sequence: 1,
      },
    });

    const entryNumber = `${counter.prefix || `JE-${year}-`}${String(counter.sequence).padStart(4, '0')}`;
    const exists = await tx.journalEntry.findUnique({ where: { entryNumber }, select: { id: true } });
    if (!exists) return entryNumber;
  }

  throw new Error('Unable to allocate a unique journal entry number');
}

async function ensureAccountByCode(tx, { code, name, type, normalSide }, officeId) {
  let account = await tx.gLAccount.findFirst({
    where: {
      code,
      OR: [{ officeId: officeId || null }, { officeId: null }],
    },
  });

  if (account) return account;

  account = await tx.gLAccount.create({
    data: {
      code,
      name,
      type,
      normalSide,
      officeId: officeId || null,
      isActive: true,
    },
  });

  return account;
}

async function ensureCostCenter(tx, code, officeId) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return null;

  const found = await tx.costCenter.findUnique({ where: { code: normalized } });
  if (found) return found;

  return tx.costCenter.create({
    data: {
      code: normalized,
      name: normalized,
      officeId: officeId || null,
    },
  });
}

async function ensureProfitCenter(tx, code, officeId) {
  if (!code) return null;
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return null;

  const found = await tx.profitCenter.findUnique({ where: { code: normalized } });
  if (found) return found;

  return tx.profitCenter.create({
    data: {
      code: normalized,
      name: normalized,
      officeId: officeId || null,
    },
  });
}

async function ensureDimensionSet(tx, { profitCenterCode, costCenterCode }, officeId) {
  const pc = String(profitCenterCode || '').trim().toUpperCase();
  const cc = String(costCenterCode || '').trim().toUpperCase();
  if (!pc && !cc) return null;

  const code = `DS-${officeId || 'GLOBAL'}-${pc || 'NA'}-${cc || 'NA'}`;
  const existing = await tx.dimensionSet.findUnique({ where: { code } });
  if (existing) return existing;

  const items = [];
  if (pc) items.push({ key: 'profitCenter', value: pc });
  if (cc) items.push({ key: 'costCenter', value: cc });

  return tx.dimensionSet.create({
    data: {
      code,
      name: `${pc || 'NA'} / ${cc || 'NA'}`,
      officeId: officeId || null,
      items: { create: items },
    },
  });
}

function validateBalanced(lines) {
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced journal lines: debits ${totalDebit.toFixed(2)} credits ${totalCredit.toFixed(2)}`);
  }
  return totalDebit;
}

async function createPostedJournal(tx, payload) {
  const {
    officeId,
    userId,
    description,
    referenceType,
    reference,
    sourceReferenceType,
    sourceReferenceId,
    fiscalPeriodId,
    consolidationRunId,
    periodCloseRunId,
    dimensionSetId,
    costCenterId,
    profitCenterId,
    tenantId,
    legalEntityId,
    lines,
  } = payload;

  const totalAmount = validateBalanced(lines);
  const entryNumber = await getNextEntryNumber(tx);

  const entry = await tx.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(),
      description,
      referenceType,
      reference,
      sourceReferenceType: sourceReferenceType || null,
      sourceReferenceId: sourceReferenceId || null,
      status: 'POSTED',
      totalAmount,
      officeId: officeId || null,
      tenantId: tenantId || null,
      legalEntityId: legalEntityId || null,
      fiscalPeriodId: fiscalPeriodId || null,
      consolidationRunId: consolidationRunId || null,
      periodCloseRunId: periodCloseRunId || null,
      dimensionSetId: dimensionSetId || null,
      costCenterId: costCenterId || null,
      profitCenterId: profitCenterId || null,
      createdById: userId || null,
      lines: {
        create: lines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          description: line.description || null,
          dimensionSetId: dimensionSetId || null,
          costCenterId: costCenterId || null,
          profitCenterId: profitCenterId || null,
        })),
      },
    },
    include: { lines: true },
  });

  for (const line of lines) {
    const delta = Number(line.debit || 0) - Number(line.credit || 0);
    await tx.gLAccount.update({
      where: { id: line.accountId },
      data: { balance: { increment: delta } },
    });
  }

  return entry;
}

async function ensureFiscalPeriod(tx, { month, year, office }) {
  const code = periodCode(month, year);
  const existing = await tx.fiscalPeriod.findFirst({ where: { code } });
  if (existing) return existing;

  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  return tx.fiscalPeriod.create({
    data: {
      code,
      periodName: code,
      startDate,
      endDate,
      status: 'OPEN',
    },
  });
}

async function ensureCloseRun(tx, { month, year, officeId, ownerUserId }) {
  const office = officeId ? await tx.office.findUnique({ where: { id: officeId } }) : null;
  const fiscalPeriod = await ensureFiscalPeriod(tx, { month, year, office });

  let run = await tx.periodCloseRun.findFirst({
    where: {
      fiscalPeriodId: fiscalPeriod.id,
      officeId: officeId || null,
    },
    include: { tasks: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!run) {
    run = await tx.periodCloseRun.create({
      data: {
        runNumber: `PCR-${fiscalPeriod.code}-${Date.now().toString().slice(-6)}`,
        fiscalPeriodId: fiscalPeriod.id,
        officeId: officeId || null,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        tasks: {
          create: CLOSE_TASKS.map((task) => ({
            taskCode: task.key,
            taskName: task.label,
            status: 'PENDING',
            ownerUserId: ownerUserId || null,
          })),
        },
      },
      include: { tasks: true },
    });
  }

  return { run, fiscalPeriod };
}

async function listIntercompanyOpenReferences(tx) {
  const entries = await tx.journalEntry.findMany({
    where: { sourceReferenceType: 'INTERCOMPANY' },
    select: { sourceReferenceId: true },
  });

  const allRefs = Array.from(new Set(entries.map((e) => e.sourceReferenceId).filter(Boolean)));

  const eliminations = await tx.eliminationEntry.findMany({
    where: { description: { startsWith: 'IC:' } },
    select: { description: true },
  });

  const eliminatedRefs = new Set(
    eliminations
      .map((e) => String(e.description || '').replace('IC:', '').trim())
      .filter(Boolean)
  );

  return allRefs.filter((ref) => !eliminatedRefs.has(ref));
}

exports.createIntercompanyEntry = async (req, res) => {
  try {
    const { fromOfficeId, toOfficeId, amount, currency, description, effectiveDate, profitCenter, costCenter } = req.body;

    const normalizedAmount = Number(amount || 0);
    if (!fromOfficeId || !toOfficeId || fromOfficeId === toOfficeId) {
      return res.status(400).json({ success: false, message: 'fromOfficeId and toOfficeId are required and must be different.' });
    }
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number.' });
    }

    const intercompanyId = uid('ic');

    const result = await prisma.$transaction(async (tx) => {
      const [fromOffice, toOffice] = await Promise.all([
        tx.office.findUnique({ where: { id: fromOfficeId } }),
        tx.office.findUnique({ where: { id: toOfficeId } }),
      ]);

      if (!fromOffice || !toOffice) {
        throw new Error('Invalid office mapping for intercompany posting.');
      }

      const effective = effectiveDate ? new Date(effectiveDate) : new Date();
      const month = effective.getUTCMonth() + 1;
      const year = effective.getUTCFullYear();
      const fiscalPeriod = await ensureFiscalPeriod(tx, { month, year, office: fromOffice });

      const costCenterEntity = await ensureCostCenter(tx, costCenter, fromOfficeId);
      const profitCenterEntity = await ensureProfitCenter(tx, profitCenter, fromOfficeId);
      const dimensionSet = await ensureDimensionSet(tx, {
        profitCenterCode: profitCenterEntity?.code,
        costCenterCode: costCenterEntity?.code,
      }, fromOfficeId);

      const dueFromSource = await ensureAccountByCode(tx, { code: '1310', name: 'Due From Affiliates', type: 'ASSET', normalSide: 'DEBIT' }, fromOfficeId);
      const cashSource = await ensureAccountByCode(tx, { code: '1100', name: 'Cash and Bank', type: 'ASSET', normalSide: 'DEBIT' }, fromOfficeId);
      const cashTarget = await ensureAccountByCode(tx, { code: '1100', name: 'Cash and Bank', type: 'ASSET', normalSide: 'DEBIT' }, toOfficeId);
      const dueToTarget = await ensureAccountByCode(tx, { code: '2310', name: 'Due To Affiliates', type: 'LIABILITY', normalSide: 'CREDIT' }, toOfficeId);

      const baseDescription = description || `Intercompany transfer ${intercompanyId}`;

      const sourceEntry = await createPostedJournal(tx, {
        officeId: fromOfficeId,
        userId: req.user.id,
        description: `${baseDescription} (source office)`,
        referenceType: 'INTERCOMPANY',
        reference: intercompanyId,
        sourceReferenceType: 'INTERCOMPANY',
        sourceReferenceId: intercompanyId,
        fiscalPeriodId: fiscalPeriod.id,
        dimensionSetId: dimensionSet?.id || null,
        costCenterId: costCenterEntity?.id || null,
        profitCenterId: profitCenterEntity?.id || null,
        tenantId: fromOffice.tenantId || null,
        legalEntityId: fromOffice.legalEntityId || null,
        lines: [
          { accountId: dueFromSource.id, debit: normalizedAmount, credit: 0, description: 'Intercompany receivable' },
          { accountId: cashSource.id, debit: 0, credit: normalizedAmount, description: 'Cash transfer to affiliate' },
        ],
      });

      const targetEntry = await createPostedJournal(tx, {
        officeId: toOfficeId,
        userId: req.user.id,
        description: `${baseDescription} (target office)`,
        referenceType: 'INTERCOMPANY',
        reference: intercompanyId,
        sourceReferenceType: 'INTERCOMPANY',
        sourceReferenceId: intercompanyId,
        fiscalPeriodId: fiscalPeriod.id,
        dimensionSetId: dimensionSet?.id || null,
        costCenterId: costCenterEntity?.id || null,
        profitCenterId: profitCenterEntity?.id || null,
        tenantId: toOffice.tenantId || null,
        legalEntityId: toOffice.legalEntityId || null,
        lines: [
          { accountId: cashTarget.id, debit: normalizedAmount, credit: 0, description: 'Cash received from affiliate' },
          { accountId: dueToTarget.id, debit: 0, credit: normalizedAmount, description: 'Intercompany payable' },
        ],
      });

      return {
        id: intercompanyId,
        fromOfficeId,
        toOfficeId,
        amount: normalizedAmount,
        currency: String(currency || 'INR').toUpperCase(),
        effectiveDate: effective.toISOString(),
        sourceEntryId: sourceEntry.id,
        targetEntryId: targetEntry.id,
        fiscalPeriodId: fiscalPeriod.id,
        status: 'OPEN',
      };
    });

    await publishFinancePhase1Event('finance.intercompany.created', {
      intercompanyId: result.id,
      fromOfficeId: result.fromOfficeId,
      toOfficeId: result.toOfficeId,
      amount: result.amount,
      currency: result.currency,
    }, req, fromOfficeId);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getIntercompanyEntries = async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({
      where: { sourceReferenceType: 'INTERCOMPANY' },
      include: { office: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const byRef = new Map();
    for (const entry of entries) {
      const ref = entry.sourceReferenceId || entry.reference;
      if (!ref) continue;
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push(entry);
    }

    const eliminations = await prisma.eliminationEntry.findMany({
      where: { description: { startsWith: 'IC:' } },
      select: { description: true },
    });
    const eliminatedRefs = new Set(eliminations.map((e) => String(e.description || '').replace('IC:', '').trim()));

    const data = Array.from(byRef.entries()).map(([ref, group]) => {
      const source = group.find((e) => (e.description || '').includes('(source office)')) || group[0];
      const target = group.find((e) => (e.description || '').includes('(target office)')) || group[1] || group[0];
      return {
        id: ref,
        fromOfficeId: source?.officeId || null,
        toOfficeId: target?.officeId || null,
        amount: Number(source?.totalAmount || target?.totalAmount || 0),
        currency: 'INR',
        sourceEntryId: source?.id || null,
        targetEntryId: target?.id || null,
        status: eliminatedRefs.has(ref) ? 'ELIMINATED' : 'OPEN',
        createdAt: source?.createdAt || target?.createdAt || null,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.runConsolidation = async (req, res) => {
  try {
    const { month, year, eliminationOfficeId } = req.body;
    const now = new Date();
    const resolvedMonth = Number(month || now.getMonth() + 1);
    const resolvedYear = Number(year || now.getFullYear());

    const consolidationOfficeId = eliminationOfficeId || resolveOfficeIdFromReq(req);
    if (!consolidationOfficeId) {
      return res.status(400).json({ success: false, message: 'No office available for elimination entries.' });
    }

    const runId = uid('cons');

    const result = await prisma.$transaction(async (tx) => {
      const office = await tx.office.findUnique({ where: { id: consolidationOfficeId } });
      if (!office) throw new Error('Invalid consolidation office.');

      const fiscalPeriod = await ensureFiscalPeriod(tx, {
        month: resolvedMonth,
        year: resolvedYear,
        office,
      });

      const run = await tx.consolidationRun.create({
        data: {
          runNumber: `CONS-${fiscalPeriod.code}-${Date.now().toString().slice(-6)}`,
          fiscalPeriodId: fiscalPeriod.id,
          officeId: consolidationOfficeId,
          status: 'RUNNING',
          startedAt: new Date(),
          notes: `Consolidation run ${runId}`,
        },
      });

      const openRefs = await listIntercompanyOpenReferences(tx);

      const dueTo = await ensureAccountByCode(tx, { code: '2310', name: 'Due To Affiliates', type: 'LIABILITY', normalSide: 'CREDIT' }, consolidationOfficeId);
      const dueFrom = await ensureAccountByCode(tx, { code: '1310', name: 'Due From Affiliates', type: 'ASSET', normalSide: 'DEBIT' }, consolidationOfficeId);

      const eliminated = [];

      for (const ref of openRefs) {
        const source = await tx.journalEntry.findFirst({
          where: {
            sourceReferenceType: 'INTERCOMPANY',
            sourceReferenceId: ref,
            description: { contains: '(source office)' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!source || Number(source.totalAmount || 0) <= 0) continue;

        const amount = Number(source.totalAmount || 0);

        const eliminationJournal = await createPostedJournal(tx, {
          officeId: consolidationOfficeId,
          userId: req.user.id,
          description: `Intercompany elimination ${ref}`,
          referenceType: 'CONSOLIDATION_ELIMINATION',
          reference: run.runNumber,
          sourceReferenceType: 'CONSOLIDATION',
          sourceReferenceId: run.id,
          fiscalPeriodId: fiscalPeriod.id,
          consolidationRunId: run.id,
          tenantId: office.tenantId || null,
          legalEntityId: office.legalEntityId || null,
          lines: [
            { accountId: dueTo.id, debit: amount, credit: 0, description: 'Eliminate intercompany payable' },
            { accountId: dueFrom.id, debit: 0, credit: amount, description: 'Eliminate intercompany receivable' },
          ],
        });

        const eliminationEntry = await tx.eliminationEntry.create({
          data: {
            consolidationRunId: run.id,
            journalEntryId: eliminationJournal.id,
            sourceLegalEntityId: source.legalEntityId || null,
            targetLegalEntityId: office.legalEntityId || null,
            description: `IC:${ref}`,
            amount,
            currency: 'INR',
          },
        });

        eliminated.push({ ref, amount, eliminationEntryId: eliminationEntry.id, eliminationJournalId: eliminationJournal.id });
      }

      const completedRun = await tx.consolidationRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          notes: `Eliminated ${eliminated.length} intercompany references`,
        },
      });

      return {
        runId: completedRun.id,
        runNumber: completedRun.runNumber,
        month: resolvedMonth,
        year: resolvedYear,
        eliminatedCount: eliminated.length,
        totalEliminatedAmount: Number(eliminated.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
        eliminated,
      };
    });

    await publishFinancePhase1Event('finance.consolidation.completed', {
      runId: result.runId,
      month: result.month,
      year: result.year,
      eliminatedCount: result.eliminatedCount,
    }, req, consolidationOfficeId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createRevenueRecognitionSchedule = async (req, res) => {
  try {
    const {
      officeId,
      contractRef,
      customerRef,
      totalAmount,
      startDate,
      periods,
      frequency,
      deferredAccountCode,
      revenueAccountCode,
      performanceObligationCode,
      performanceObligationName,
    } = req.body;

    const resolvedOfficeId = officeId || resolveOfficeIdFromReq(req);
    const total = Number(totalAmount || 0);
    const periodsCount = Math.max(1, Number(periods || 1));

    if (!resolvedOfficeId) {
      return res.status(400).json({ success: false, message: 'officeId is required.' });
    }
    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({ success: false, message: 'totalAmount must be a positive number.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const office = await tx.office.findUnique({ where: { id: resolvedOfficeId } });
      if (!office) throw new Error('Invalid office for revenue contract.');

      const contractNumber = contractRef || `RC-${Date.now().toString().slice(-8)}`;
      const customer = customerRef
        ? await tx.customer.findFirst({ where: { OR: [{ id: customerRef }, { name: customerRef }] } })
        : null;

      const contract = await tx.revenueContract.create({
        data: {
          contractNumber,
          customerId: customer?.id || null,
          officeId: resolvedOfficeId,
          legalEntityId: office.legalEntityId || null,
          contractTitle: `Revenue Contract ${contractNumber}`,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: null,
          totalValue: total,
          currency: office.baseCurrency || 'INR',
          status: 'ACTIVE',
        },
      });

      const obligation = await tx.performanceObligation.create({
        data: {
          revenueContractId: contract.id,
          code: performanceObligationCode || 'PO-1',
          name: performanceObligationName || 'Primary Performance Obligation',
          allocationPercent: 100,
          allocatedAmount: total,
        },
      });

      const scheduleNumber = `RRS-${Date.now().toString().slice(-8)}`;
      const scheduleStart = startDate ? new Date(startDate) : new Date();
      const mode = String(frequency || 'MONTHLY').toUpperCase();
      const firstMonth = scheduleStart.getUTCMonth() + 1;
      const firstYear = scheduleStart.getUTCFullYear();
      const fiscalPeriod = await ensureFiscalPeriod(tx, { month: firstMonth, year: firstYear, office });

      const schedule = await tx.revenueSchedule.create({
        data: {
          scheduleNumber,
          revenueContractId: contract.id,
          performanceObligationId: obligation.id,
          fiscalPeriodId: fiscalPeriod.id,
          startDate: scheduleStart,
          endDate: null,
          totalAmount: total,
          recognizedAmount: 0,
          status: 'PLANNED',
        },
      });

      const baseAmount = Number((total / periodsCount).toFixed(2));
      let allocated = 0;
      const lines = [];

      for (let i = 0; i < periodsCount; i += 1) {
        const recognitionDate = new Date(scheduleStart);
        if (mode === 'MONTHLY') recognitionDate.setMonth(scheduleStart.getMonth() + i);
        else if (mode === 'QUARTERLY') recognitionDate.setMonth(scheduleStart.getMonth() + (i * 3));
        else if (mode === 'WEEKLY') recognitionDate.setDate(scheduleStart.getDate() + (i * 7));

        let amount = baseAmount;
        if (i === periodsCount - 1) amount = Number((total - allocated).toFixed(2));
        allocated += amount;

        lines.push({
          revenueScheduleId: schedule.id,
          milestoneCode: `M${i + 1}`,
          recognitionDate,
          amount,
          status: 'PLANNED',
        });
      }

      await tx.revenueScheduleLine.createMany({ data: lines });

      return {
        contractId: contract.id,
        contractNumber: contract.contractNumber,
        scheduleId: schedule.id,
        scheduleNumber: schedule.scheduleNumber,
        officeId: resolvedOfficeId,
        totalAmount: total,
        periods: periodsCount,
        frequency: mode,
        deferredAccountCode: String(deferredAccountCode || '2350'),
        revenueAccountCode: String(revenueAccountCode || '4150'),
      };
    });

    await publishFinancePhase1Event('finance.revenue_recognition.schedule_created', {
      scheduleId: result.scheduleId,
      contractNumber: result.contractNumber,
      officeId: result.officeId,
      totalAmount: result.totalAmount,
      periods: result.periods,
    }, req, result.officeId);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRevenueRecognitionSchedules = async (req, res) => {
  try {
    const officeId = req.query.officeId || resolveOfficeIdFromReq(req) || null;

    const schedules = await prisma.revenueSchedule.findMany({
      where: officeId ? { revenueContract: { officeId } } : {},
      include: {
        revenueContract: {
          select: {
            contractNumber: true,
            officeId: true,
            customer: { select: { id: true, name: true } },
          },
        },
        lines: { orderBy: { recognitionDate: 'asc' } },
        recognitionEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const data = schedules.map((s) => {
      const recognizedByMilestone = new Set(
        s.recognitionEntries
          .map((r) => {
            const notes = String(r.notes || '');
            const match = notes.match(/milestone:(\w+)/i);
            return match ? match[1] : null;
          })
          .filter(Boolean)
      );

      return {
        id: s.id,
        scheduleNumber: s.scheduleNumber,
        officeId: s.revenueContract?.officeId || null,
        contractRef: s.revenueContract?.contractNumber || null,
        customerRef: s.revenueContract?.customer?.name || null,
        totalAmount: Number(s.totalAmount || 0),
        recognizedAmount: Number(s.recognizedAmount || 0),
        status: s.status,
        milestones: s.lines.map((line, idx) => ({
          index: idx + 1,
          milestoneCode: line.milestoneCode,
          dueDate: line.recognitionDate,
          amount: Number(line.amount || 0),
          status: recognizedByMilestone.has(line.milestoneCode || '') ? 'RECOGNIZED' : 'PENDING',
        })),
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recognizeRevenueMilestone = async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const milestoneIndex = Number(req.body.milestoneIndex || 0);

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.revenueSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          revenueContract: true,
          performanceObligation: true,
          lines: { orderBy: { recognitionDate: 'asc' } },
          recognitionEntries: true,
        },
      });

      if (!schedule) throw new Error('Revenue recognition schedule not found.');

      const pendingLines = schedule.lines.filter((line) => {
        const existing = schedule.recognitionEntries.find((entry) => String(entry.notes || '').includes(`milestone:${line.milestoneCode}`));
        return !existing;
      });

      if (!pendingLines.length) {
        return { replayed: true, schedule };
      }

      const line = milestoneIndex > 0 ? schedule.lines[milestoneIndex - 1] : pendingLines[0];
      if (!line) throw new Error('No pending milestone found for recognition.');

      const already = schedule.recognitionEntries.find((entry) => String(entry.notes || '').includes(`milestone:${line.milestoneCode}`));
      if (already) {
        return { replayed: true, schedule };
      }

      const amount = Number(line.amount || 0);
      if (amount <= 0) throw new Error('Milestone amount must be positive.');

      const officeId = schedule.revenueContract?.officeId || null;
      const office = officeId ? await tx.office.findUnique({ where: { id: officeId } }) : null;

      const deferredAccount = await ensureAccountByCode(
        tx,
        { code: '2350', name: 'Deferred Revenue', type: 'LIABILITY', normalSide: 'CREDIT' },
        officeId
      );
      const revenueAccount = await ensureAccountByCode(
        tx,
        { code: '4150', name: 'Recognized Revenue', type: 'REVENUE', normalSide: 'CREDIT' },
        officeId
      );

      const journal = await createPostedJournal(tx, {
        officeId,
        userId: req.user.id,
        description: `Revenue recognition ${schedule.scheduleNumber} milestone ${line.milestoneCode}`,
        referenceType: 'REVENUE_RECOGNITION',
        reference: schedule.scheduleNumber,
        sourceReferenceType: 'REVENUE_RECOGNITION',
        sourceReferenceId: schedule.id,
        fiscalPeriodId: schedule.fiscalPeriodId || null,
        tenantId: office?.tenantId || null,
        legalEntityId: office?.legalEntityId || null,
        lines: [
          { accountId: deferredAccount.id, debit: amount, credit: 0, description: 'Release deferred revenue' },
          { accountId: revenueAccount.id, debit: 0, credit: amount, description: 'Recognized revenue' },
        ],
      });

      await tx.revenueRecognitionEntry.create({
        data: {
          revenueScheduleId: schedule.id,
          journalEntryId: journal.id,
          amount,
          currency: schedule.revenueContract?.currency || 'INR',
          notes: `milestone:${line.milestoneCode}`,
        },
      });

      const totalRecognized = Number(schedule.recognizedAmount || 0) + amount;
      const nextStatus = totalRecognized + 0.01 >= Number(schedule.totalAmount || 0) ? 'COMPLETED' : 'RECOGNIZING';

      const updatedSchedule = await tx.revenueSchedule.update({
        where: { id: schedule.id },
        data: {
          recognizedAmount: totalRecognized,
          status: nextStatus,
        },
      });

      return {
        replayed: false,
        schedule: updatedSchedule,
        milestone: { code: line.milestoneCode, amount },
        officeId,
      };
    });

    if (!result.replayed) {
      await publishFinancePhase1Event('finance.revenue_recognition.milestone_recognized', {
        scheduleId,
        officeId: result.officeId,
        milestoneCode: result.milestone.code,
        amount: result.milestone.amount,
      }, req, result.officeId);
    }

    res.status(200).json({ success: true, data: result.schedule, replayed: result.replayed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCloseCockpit = async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month || now.getMonth() + 1);
    const year = Number(req.query.year || now.getFullYear());
    const officeId = req.query.officeId || resolveOfficeIdFromReq(req);

    const payload = await prisma.$transaction(async (tx) => {
      const { run, fiscalPeriod } = await ensureCloseRun(tx, {
        month,
        year,
        officeId,
        ownerUserId: req.user?.id || null,
      });

      const tasks = run.tasks.map((task) => ({
        id: task.id,
        key: task.taskCode,
        label: task.taskName,
        status: task.status,
        approvedBy: task.ownerUserId,
        approvedAt: task.completedAt,
        notes: task.notes,
      }));

      const isReadyToClose = tasks.every((task) => task.status === 'COMPLETED');

      return {
        period: { month, year, fiscalPeriodId: fiscalPeriod.id, fiscalPeriodCode: fiscalPeriod.code },
        runId: run.id,
        runNumber: run.runNumber,
        status: run.status,
        tasks,
        isReadyToClose,
        lastUpdatedAt: run.updatedAt,
      };
    });

    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveCloseCockpitTask = async (req, res) => {
  try {
    const taskKey = String(req.params.taskKey || '').trim();
    if (!CLOSE_TASKS.find((task) => task.key === taskKey)) {
      return res.status(400).json({ success: false, message: `Invalid taskKey. Allowed: ${CLOSE_TASKS.map((t) => t.key).join(', ')}` });
    }

    const now = new Date();
    const month = Number(req.body.month || now.getMonth() + 1);
    const year = Number(req.body.year || now.getFullYear());
    const officeId = resolveOfficeIdFromReq(req);

    const updated = await prisma.$transaction(async (tx) => {
      const { run } = await ensureCloseRun(tx, {
        month,
        year,
        officeId,
        ownerUserId: req.user?.id || null,
      });

      const task = run.tasks.find((t) => t.taskCode === taskKey);
      if (!task) throw new Error('Close cockpit task not found.');

      await tx.periodCloseTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          ownerUserId: req.user.id,
          completedAt: new Date(),
          notes: req.body.notes || 'Approved',
        },
      });

      const allTasks = await tx.periodCloseTask.findMany({ where: { periodCloseRunId: run.id } });
      const allCompleted = allTasks.every((t) => t.status === 'COMPLETED');

      const runStatus = allCompleted ? 'COMPLETED' : 'IN_PROGRESS';
      const runUpdate = await tx.periodCloseRun.update({
        where: { id: run.id },
        data: {
          status: runStatus,
          completedAt: allCompleted ? new Date() : null,
        },
      });

      return { runId: runUpdate.id, runStatus, taskKey, taskStatus: 'COMPLETED' };
    });

    await publishFinancePhase1Event('finance.close_cockpit.task_updated', {
      month,
      year,
      taskKey: updated.taskKey,
      status: updated.taskStatus,
      closeStatus: updated.runStatus,
    }, req, officeId);

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.finalizePeriodClose = async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.body.month || now.getMonth() + 1);
    const year = Number(req.body.year || now.getFullYear());
    const officeId = resolveOfficeIdFromReq(req);

    const finalized = await prisma.$transaction(async (tx) => {
      const { run, fiscalPeriod } = await ensureCloseRun(tx, {
        month,
        year,
        officeId,
        ownerUserId: req.user?.id || null,
      });

      const tasks = await tx.periodCloseTask.findMany({ where: { periodCloseRunId: run.id } });
      const allCompleted = tasks.every((task) => task.status === 'COMPLETED');

      if (!allCompleted) {
        throw new Error('Cannot finalize. All close cockpit tasks must be completed.');
      }

      const updatedRun = await tx.periodCloseRun.update({
        where: { id: run.id },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
          completedAt: run.completedAt || new Date(),
          notes: `Finalized by ${req.user.id}`,
        },
      });

      await tx.fiscalPeriod.update({
        where: { id: fiscalPeriod.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      return {
        runId: updatedRun.id,
        runNumber: updatedRun.runNumber,
        status: updatedRun.status,
        fiscalPeriodId: fiscalPeriod.id,
        fiscalPeriodCode: fiscalPeriod.code,
        closedAt: updatedRun.finalizedAt,
        closedBy: req.user.id,
      };
    });

    await publishFinancePhase1Event('finance.period.close_finalized', {
      month,
      year,
      runId: finalized.runId,
      fiscalPeriodId: finalized.fiscalPeriodId,
      closedBy: finalized.closedBy,
    }, req, officeId);

    res.status(200).json({ success: true, data: finalized });
  } catch (error) {
    const message = error?.message || 'Failed to finalize close.';
    const code = message.includes('Cannot finalize') ? 400 : 500;
    res.status(code).json({ success: false, message });
  }
};
