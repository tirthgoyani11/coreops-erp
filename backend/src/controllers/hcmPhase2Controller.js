const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');

function resolveOfficeId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) return value.id;
  return value;
}

function buildPositionCode() {
  return `POS-${Date.now().toString().slice(-8)}`;
}

exports.createRecruitmentPosition = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));

  if (!req.body.title) {
    return next(new AppError('title is required', 400));
  }

  const position = await prisma.recruitmentPosition.create({
    data: {
      positionCode: req.body.positionCode || buildPositionCode(),
      officeId,
      title: req.body.title,
      department: req.body.department || null,
      employmentType: req.body.employmentType || 'FULL_TIME',
      targetHires: Number(req.body.targetHires || 1),
      status: req.body.status || 'OPEN',
      createdById: req.user?.id || null,
    },
    include: {
      office: { select: { id: true, name: true, code: true } },
      _count: { select: { applications: true } },
    },
  });

  res.status(201).json({ success: true, data: position });
});

exports.getRecruitmentPositions = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const status = req.query.status;

  const positions = await prisma.recruitmentPosition.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(status && { status }),
    },
    include: {
      office: { select: { id: true, name: true, code: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: positions.length, data: positions });
});

exports.createCandidateApplication = asyncHandler(async (req, res, next) => {
  const recruitmentPositionId = req.params.id;
  if (!recruitmentPositionId) {
    return next(new AppError('recruitmentPositionId is required', 400));
  }

  if (!req.body.fullName) {
    return next(new AppError('fullName is required', 400));
  }

  const position = await prisma.recruitmentPosition.findUnique({ where: { id: recruitmentPositionId } });
  if (!position) return next(new AppError('Recruitment position not found', 404));

  const application = await prisma.candidateApplication.create({
    data: {
      recruitmentPositionId,
      fullName: req.body.fullName,
      email: req.body.email || null,
      phone: req.body.phone || null,
      source: req.body.source || null,
      stage: req.body.stage || 'APPLIED',
      score: req.body.score == null ? null : Number(req.body.score),
      resumeUrl: req.body.resumeUrl || null,
      notes: req.body.notes || null,
    },
    include: {
      recruitmentPosition: {
        select: { id: true, positionCode: true, title: true, officeId: true },
      },
    },
  });

  res.status(201).json({ success: true, data: application });
});

exports.getCandidateApplications = asyncHandler(async (req, res) => {
  const recruitmentPositionId = req.query.recruitmentPositionId;
  const stage = req.query.stage;
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const applications = await prisma.candidateApplication.findMany({
    where: {
      ...(recruitmentPositionId && { recruitmentPositionId }),
      ...(stage && { stage }),
      ...(officeId
        ? {
            recruitmentPosition: {
              officeId,
            },
          }
        : {}),
    },
    include: {
      recruitmentPosition: {
        select: { id: true, positionCode: true, title: true, officeId: true },
      },
    },
    orderBy: [{ appliedAt: 'desc' }, { updatedAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: applications.length, data: applications });
});

exports.updateCandidateStage = asyncHandler(async (req, res, next) => {
  const { stage } = req.body;
  const allowed = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

  if (!allowed.includes(stage)) {
    return next(new AppError('stage must be APPLIED, SCREENING, INTERVIEW, OFFER, HIRED, or REJECTED', 400));
  }

  const existing = await prisma.candidateApplication.findUnique({
    where: { id: req.params.id },
    select: { id: true, stage: true, recruitmentPositionId: true },
  });

  if (!existing) return next(new AppError('Candidate application not found', 404));

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.candidateApplication.update({
      where: { id: req.params.id },
      data: { stage },
      include: {
        recruitmentPosition: {
          select: { id: true, title: true, openingsFilled: true },
        },
      },
    });

    if (existing.stage !== 'HIRED' && stage === 'HIRED') {
      await tx.recruitmentPosition.update({
        where: { id: existing.recruitmentPositionId },
        data: {
          openingsFilled: { increment: 1 },
        },
      });
    }

    if (existing.stage === 'HIRED' && stage !== 'HIRED') {
      await tx.recruitmentPosition.update({
        where: { id: existing.recruitmentPositionId },
        data: {
          openingsFilled: { decrement: 1 },
        },
      });
    }

    return row;
  });

  res.status(200).json({ success: true, data: updated });
});

exports.createPerformanceGoal = asyncHandler(async (req, res, next) => {
  const employeeId = req.body.employeeId;
  if (!employeeId) return next(new AppError('employeeId is required', 400));
  if (!req.body.title) return next(new AppError('title is required', 400));

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return next(new AppError('Employee not found', 404));

  const goal = await prisma.performanceGoal.create({
    data: {
      employeeId,
      createdById: req.user?.id || null,
      title: req.body.title,
      description: req.body.description || null,
      targetValue: req.body.targetValue == null ? null : Number(req.body.targetValue),
      currentValue: req.body.currentValue == null ? 0 : Number(req.body.currentValue),
      weight: req.body.weight == null ? 1 : Number(req.body.weight),
      status: req.body.status || 'ACTIVE',
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
    },
  });

  res.status(201).json({ success: true, data: goal });
});

exports.getPerformanceGoals = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId;
  const status = req.query.status;
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const goals = await prisma.performanceGoal.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(status && { status }),
      ...(officeId
        ? {
            employee: {
              officeId,
            },
          }
        : {}),
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: goals.length, data: goals });
});

exports.updatePerformanceGoalProgress = asyncHandler(async (req, res, next) => {
  const existing = await prisma.performanceGoal.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Performance goal not found', 404));

  const nextValue = req.body.currentValue == null ? existing.currentValue : Number(req.body.currentValue);
  const targetValue = req.body.targetValue == null ? existing.targetValue : Number(req.body.targetValue);

  const updated = await prisma.performanceGoal.update({
    where: { id: req.params.id },
    data: {
      currentValue: nextValue,
      targetValue,
      status: req.body.status || (targetValue && nextValue >= targetValue ? 'COMPLETED' : existing.status),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : existing.dueDate,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
    },
  });

  res.status(200).json({ success: true, data: updated });
});

exports.createPerformanceReview = asyncHandler(async (req, res, next) => {
  const employeeId = req.body.employeeId;
  if (!employeeId) return next(new AppError('employeeId is required', 400));
  if (!req.body.periodStart || !req.body.periodEnd) {
    return next(new AppError('periodStart and periodEnd are required', 400));
  }

  const periodStart = new Date(req.body.periodStart);
  const periodEnd = new Date(req.body.periodEnd);
  if (periodEnd < periodStart) {
    return next(new AppError('periodEnd must be on or after periodStart', 400));
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return next(new AppError('Employee not found', 404));

  const review = await prisma.performanceReview.create({
    data: {
      employeeId,
      reviewerId: req.body.reviewerId || req.user?.id || null,
      periodStart,
      periodEnd,
      rating: req.body.rating == null ? null : Number(req.body.rating),
      summary: req.body.summary || null,
      status: req.body.status || 'DRAFT',
      submittedAt: req.body.status === 'SUBMITTED' ? new Date() : null,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(201).json({ success: true, data: review });
});

exports.getPerformanceReviews = asyncHandler(async (req, res) => {
  const employeeId = req.query.employeeId;
  const status = req.query.status;
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const reviews = await prisma.performanceReview.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(status && { status }),
      ...(officeId
        ? {
            employee: {
              officeId,
            },
          }
        : {}),
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

exports.submitPerformanceReview = asyncHandler(async (req, res, next) => {
  const existing = await prisma.performanceReview.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Performance review not found', 404));

  const status = req.body.status || 'SUBMITTED';
  const allowed = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'FINALIZED'];
  if (!allowed.includes(status)) {
    return next(new AppError('status must be DRAFT, SUBMITTED, ACKNOWLEDGED, or FINALIZED', 400));
  }

  const updated = await prisma.performanceReview.update({
    where: { id: req.params.id },
    data: {
      status,
      rating: req.body.rating == null ? existing.rating : Number(req.body.rating),
      summary: req.body.summary == null ? existing.summary : req.body.summary,
      submittedAt: status === 'SUBMITTED' && !existing.submittedAt ? new Date() : existing.submittedAt,
      acknowledgedAt: status === 'ACKNOWLEDGED' ? new Date() : existing.acknowledgedAt,
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(200).json({ success: true, data: updated });
});

exports.createObjective = asyncHandler(async (req, res, next) => {
  const employeeId = req.body.employeeId;
  if (!employeeId) return next(new AppError('employeeId is required', 400));
  if (!req.body.title) return next(new AppError('title is required', 400));

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return next(new AppError('Employee not found', 404));

  const row = await prisma.employeeObjective.create({
    data: {
      employeeId,
      createdById: req.user?.id || null,
      title: req.body.title,
      description: req.body.description || null,
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      status: req.body.status || 'ACTIVE',
      keyResults: {
        create: Array.isArray(req.body.keyResults)
          ? req.body.keyResults.map((kr) => ({
              title: kr.title,
              unit: kr.unit || null,
              targetValue: kr.targetValue == null ? null : Number(kr.targetValue),
              currentValue: kr.currentValue == null ? 0 : Number(kr.currentValue),
              status: kr.status || 'NOT_STARTED',
              lastUpdatedById: req.user?.id || null,
            }))
          : [],
      },
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
      keyResults: true,
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getObjectives = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.employeeObjective.findMany({
    where: {
      ...(req.query.employeeId && { employeeId: req.query.employeeId }),
      ...(req.query.status && { status: req.query.status }),
      ...(officeId ? { employee: { officeId } } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
      keyResults: true,
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.updateKeyResult = asyncHandler(async (req, res, next) => {
  const existing = await prisma.objectiveKeyResult.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Key result not found', 404));

  const target = req.body.targetValue == null ? existing.targetValue : Number(req.body.targetValue);
  const current = req.body.currentValue == null ? existing.currentValue : Number(req.body.currentValue);

  const row = await prisma.objectiveKeyResult.update({
    where: { id: req.params.id },
    data: {
      targetValue: target,
      currentValue: current,
      status: req.body.status || (target && current >= target ? 'ACHIEVED' : existing.status),
      lastUpdatedById: req.user?.id || null,
    },
  });

  res.status(200).json({ success: true, data: row });
});

exports.createLearningCourse = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.title) return next(new AppError('title is required', 400));

  const row = await prisma.learningCourse.create({
    data: {
      officeId,
      createdById: req.user?.id || null,
      title: req.body.title,
      provider: req.body.provider || null,
      description: req.body.description || null,
      durationHours: Number(req.body.durationHours || 0),
      status: req.body.status || 'ACTIVE',
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getLearningCourses = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.learningCourse.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(req.query.status && { status: req.query.status }),
    },
    include: {
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.requestLearningEnrollment = asyncHandler(async (req, res, next) => {
  if (!req.body.courseId || !req.body.employeeId) {
    return next(new AppError('courseId and employeeId are required', 400));
  }

  const row = await prisma.learningEnrollment.upsert({
    where: {
      courseId_employeeId: {
        courseId: req.body.courseId,
        employeeId: req.body.employeeId,
      },
    },
    update: {
      status: 'REQUESTED',
      requestedById: req.user?.id || null,
      requestedAt: new Date(),
      notes: req.body.notes || null,
    },
    create: {
      courseId: req.body.courseId,
      employeeId: req.body.employeeId,
      requestedById: req.user?.id || null,
      status: 'REQUESTED',
      notes: req.body.notes || null,
    },
    include: {
      course: { select: { id: true, title: true, officeId: true } },
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getLearningEnrollments = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const rows = await prisma.learningEnrollment.findMany({
    where: {
      ...(req.query.employeeId && { employeeId: req.query.employeeId }),
      ...(req.query.courseId && { courseId: req.query.courseId }),
      ...(req.query.status && { status: req.query.status }),
      ...(officeId ? { employee: { officeId } } : {}),
    },
    include: {
      course: { select: { id: true, title: true, officeId: true } },
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.decideLearningEnrollment = asyncHandler(async (req, res, next) => {
  const allowed = ['APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'];
  if (!allowed.includes(req.body.status)) {
    return next(new AppError('status must be APPROVED, REJECTED, IN_PROGRESS, or COMPLETED', 400));
  }

  const existing = await prisma.learningEnrollment.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Learning enrollment not found', 404));

  const row = await prisma.learningEnrollment.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      approvedById: ['APPROVED', 'REJECTED'].includes(req.body.status) ? (req.user?.id || null) : existing.approvedById,
      approvedAt: ['APPROVED', 'REJECTED'].includes(req.body.status) ? new Date() : existing.approvedAt,
      completionAt: req.body.status === 'COMPLETED' ? new Date() : existing.completionAt,
      score: req.body.score == null ? existing.score : Number(req.body.score),
      notes: req.body.notes == null ? existing.notes : req.body.notes,
    },
  });

  res.status(200).json({ success: true, data: row });
});

exports.createWorkforcePlan = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));

  const row = await prisma.workforcePlan.create({
    data: {
      officeId,
      createdById: req.user?.id || null,
      department: req.body.department || null,
      plannedHeadcount: Number(req.body.plannedHeadcount || 0),
      currentHeadcount: Number(req.body.currentHeadcount || 0),
      hiringNeeded: Number(req.body.hiringNeeded || 0),
      targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
      status: req.body.status || 'DRAFT',
      notes: req.body.notes || null,
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getWorkforcePlans = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const rows = await prisma.workforcePlan.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.department && { department: req.query.department }),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.createSelfServiceRequest = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));
  if (!req.body.employeeId || !req.body.requestType || !req.body.title) {
    return next(new AppError('employeeId, requestType and title are required', 400));
  }

  const row = await prisma.selfServiceRequest.create({
    data: {
      officeId,
      employeeId: req.body.employeeId,
      requestedById: req.user?.id || null,
      requestType: req.body.requestType,
      title: req.body.title,
      details: req.body.details || null,
      status: 'PENDING',
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  res.status(201).json({ success: true, data: row });
});

exports.getSelfServiceRequests = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const rows = await prisma.selfServiceRequest.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(req.query.employeeId && { employeeId: req.query.employeeId }),
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.requestType && { requestType: req.query.requestType }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, officeId: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
  });

  res.status(200).json({ success: true, count: rows.length, data: rows });
});

exports.decideSelfServiceRequest = asyncHandler(async (req, res, next) => {
  const allowed = ['APPROVED', 'REJECTED', 'CANCELLED'];
  if (!allowed.includes(req.body.status)) {
    return next(new AppError('status must be APPROVED, REJECTED, or CANCELLED', 400));
  }

  const existing = await prisma.selfServiceRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Self-service request not found', 404));

  const row = await prisma.selfServiceRequest.update({
    where: { id: req.params.id },
    data: {
      status: req.body.status,
      approvedById: req.user?.id || null,
      approvedAt: new Date(),
    },
  });

  res.status(200).json({ success: true, data: row });
});
