const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

function resolveOfficeId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) return value.id;
  return value;
}

exports.createCampaign = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.name) return next(new AppError('name is required', 400));

  const row = await prisma.campaign.create({
    data: {
      officeId,
      ownerUserId: req.user?.id || null,
      name: req.body.name,
      objective: req.body.objective || null,
      budgetAmount: Number(req.body.budgetAmount || 0),
      leadTarget: Number(req.body.leadTarget || 0),
      revenueTarget: Number(req.body.revenueTarget || 0),
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null,
      status: req.body.status || 'DRAFT',
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getCampaigns = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const status = req.query.status;

  const rows = await prisma.campaign.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(status && { status }),
    },
    include: {
      ownerUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.createTerritory = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.code || !req.body.name) return next(new AppError('code and name are required', 400));

  const row = await prisma.salesTerritory.create({
    data: {
      officeId,
      code: String(req.body.code).trim().toUpperCase(),
      name: req.body.name,
      region: req.body.region || null,
      managerUserId: req.body.managerUserId || null,
      status: req.body.status || 'ACTIVE',
    },
    include: {
      managerUser: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getTerritories = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.salesTerritory.findMany({
    where: {
      ...(officeId && { officeId }),
    },
    include: {
      managerUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.createAccountPlan = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.customerId || !req.body.planName) {
    return next(new AppError('customerId and planName are required', 400));
  }

  const customer = await prisma.customer.findUnique({ where: { id: req.body.customerId } });
  if (!customer) return next(new AppError('Customer not found', 404));

  const row = await prisma.accountPlan.create({
    data: {
      officeId,
      customerId: req.body.customerId,
      ownerUserId: req.user?.id || null,
      planName: req.body.planName,
      strategicGoals: req.body.strategicGoals || null,
      nextQuarterPlan: req.body.nextQuarterPlan || null,
      riskLevel: req.body.riskLevel || null,
      reviewDate: req.body.reviewDate ? new Date(req.body.reviewDate) : null,
      status: req.body.status || 'DRAFT',
    },
    include: {
      customer: { select: { id: true, name: true } },
      ownerUser: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getAccountPlans = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.accountPlan.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(req.query.customerId && { customerId: req.query.customerId }),
      ...(req.query.status && { status: req.query.status }),
    },
    include: {
      customer: { select: { id: true, name: true } },
      ownerUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.createPartnerChannel = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.channelName) return next(new AppError('channelName is required', 400));

  const row = await prisma.partnerChannel.create({
    data: {
      officeId,
      ownerUserId: req.user?.id || null,
      channelName: req.body.channelName,
      partnerType: req.body.partnerType || null,
      contactName: req.body.contactName || null,
      contactEmail: req.body.contactEmail || null,
      commissionRate: Number(req.body.commissionRate || 0),
      status: req.body.status || 'ACTIVE',
      notes: req.body.notes || null,
    },
    include: {
      ownerUser: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getPartnerChannels = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.partnerChannel.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(req.query.status && { status: req.query.status }),
    },
    include: {
      ownerUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.getCrmPhase2Summary = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const [campaigns, territories, accountPlans, partnerChannels] = await Promise.all([
    prisma.campaign.count({ where: { ...(officeId && { officeId }) } }),
    prisma.salesTerritory.count({ where: { ...(officeId && { officeId }), status: 'ACTIVE' } }),
    prisma.accountPlan.count({ where: { ...(officeId && { officeId }) } }),
    prisma.partnerChannel.count({ where: { ...(officeId && { officeId }), status: 'ACTIVE' } }),
  ]);

  res.status(200).json({
    success: true,
    data: { campaigns, territories, accountPlans, partnerChannels },
  });
});
