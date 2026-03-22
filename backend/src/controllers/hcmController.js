const prisma = require('../config/prisma');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { calculatePayslipPreview } = require('../services/payrollEngineService');

function resolveOfficeId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.id) return value.id;
  return value;
}

function buildRunCode() {
  return `PR-${Date.now()}`;
}

function buildEmployeeCode() {
  return `EMP-${Date.now().toString().slice(-8)}`;
}

function normalizeDateOnly(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

exports.createEmployee = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  if (!officeId) return next(new AppError('Office ID is required', 400));

  const payload = {
    employeeCode: req.body.employeeCode || buildEmployeeCode(),
    userId: req.body.userId || null,
    officeId,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email || null,
    phone: req.body.phone || null,
    designation: req.body.designation || null,
    department: req.body.department || null,
    employmentType: req.body.employmentType || 'FULL_TIME',
    status: req.body.status || 'ACTIVE',
    dateOfJoining: req.body.dateOfJoining ? new Date(req.body.dateOfJoining) : new Date(),
    dateOfExit: req.body.dateOfExit ? new Date(req.body.dateOfExit) : null,
    basicSalary: Number(req.body.basicSalary || 0),
  };

  if (!payload.firstName || !payload.lastName) {
    return next(new AppError('First name and last name are required', 400));
  }

  const employee = await prisma.employee.create({ data: payload });
  res.status(201).json({ success: true, data: employee });
});

exports.getEmployees = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const status = req.query.status;
  const search = req.query.search;

  const employees = await prisma.employee.findMany({
    where: {
      ...(officeId && { officeId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
    include: { office: { select: { id: true, name: true, code: true } } },
  });

  res.status(200).json({ success: true, count: employees.length, data: employees });
});

exports.getEmployee = asyncHandler(async (req, res, next) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      office: { select: { id: true, name: true, code: true } },
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 },
      attendances: { orderBy: { date: 'desc' }, take: 31 },
    },
  });

  if (!employee) return next(new AppError('Employee not found', 404));
  res.status(200).json({ success: true, data: employee });
});

exports.createLeaveRequest = asyncHandler(async (req, res, next) => {
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate) {
    return next(new AppError('employeeId, leaveType, startDate and endDate are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return next(new AppError('Invalid leave date range', 400));
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end - start) / msInDay) + 1;

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason: reason || null,
    },
  });

  res.status(201).json({ success: true, data: leaveRequest });
});

exports.getLeaveRequests = asyncHandler(async (req, res) => {
  const { status, employeeId } = req.query;

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      ...(status && { status }),
      ...(employeeId && { employeeId }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      employee: {
        select: { id: true, employeeCode: true, firstName: true, lastName: true, officeId: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(200).json({ success: true, count: leaveRequests.length, data: leaveRequests });
});

exports.decideLeaveRequest = asyncHandler(async (req, res, next) => {
  const { decision, approverNotes } = req.body;
  const allowed = ['APPROVED', 'REJECTED', 'CANCELLED'];

  if (!allowed.includes(decision)) {
    return next(new AppError('decision must be APPROVED, REJECTED, or CANCELLED', 400));
  }

  const existing = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Leave request not found', 404));

  const updated = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: {
      status: decision,
      approvedById: req.user?.id || null,
      approvedAt: new Date(),
      approverNotes: approverNotes || null,
    },
  });

  res.status(200).json({ success: true, data: updated });
});

exports.createAttendance = asyncHandler(async (req, res, next) => {
  const { employeeId, date, status = 'PRESENT', checkIn, checkOut, notes } = req.body;
  if (!employeeId || !date) {
    return next(new AppError('employeeId and date are required', 400));
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return next(new AppError('Employee not found', 404));

  const attendanceDate = normalizeDateOnly(date);
  const inTime = checkIn ? new Date(checkIn) : null;
  const outTime = checkOut ? new Date(checkOut) : null;

  let hoursWorked = null;
  if (inTime && outTime && outTime > inTime) {
    const diffMs = outTime.getTime() - inTime.getTime();
    hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }

  const attendance = await prisma.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId,
        date: attendanceDate,
      },
    },
    update: {
      status,
      checkIn: inTime,
      checkOut: outTime,
      hoursWorked,
      notes: notes || null,
    },
    create: {
      employeeId,
      date: attendanceDate,
      status,
      checkIn: inTime,
      checkOut: outTime,
      hoursWorked,
      notes: notes || null,
    },
  });

  res.status(201).json({ success: true, data: attendance });
});

exports.getAttendance = asyncHandler(async (req, res) => {
  const { employeeId, status, from, to } = req.query;
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const attendances = await prisma.attendance.findMany({
    where: {
      ...(employeeId && { employeeId }),
      ...(status && { status }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: normalizeDateOnly(from) }),
              ...(to && { lte: normalizeDateOnly(to) }),
            },
          }
        : {}),
      ...(officeId
        ? {
            employee: {
              officeId,
            },
          }
        : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          officeId: true,
          department: true,
        },
      },
    },
    take: 200,
  });

  res.status(200).json({ success: true, count: attendances.length, data: attendances });
});

exports.previewPayrollRun = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  const periodStart = req.body.periodStart ? new Date(req.body.periodStart) : null;
  const periodEnd = req.body.periodEnd ? new Date(req.body.periodEnd) : null;

  if (!officeId || !periodStart || !periodEnd) {
    return next(new AppError('officeId, periodStart and periodEnd are required', 400));
  }

  const employees = await prisma.employee.findMany({
    where: { officeId, status: 'ACTIVE' },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  const workingDays = Number(req.body.workingDays || 30);
  const attendanceByEmployee = req.body.attendanceByEmployee || {};
  const ruleConfig = req.body.ruleConfig || {};

  const previews = employees.map((employee) => {
    const attendanceSummary = attendanceByEmployee[employee.id] || {
      presentDays: workingDays,
      workingDays,
    };

    const calc = calculatePayslipPreview(employee, attendanceSummary, ruleConfig);

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      ...calc,
    };
  });

  const totals = previews.reduce((acc, p) => {
    acc.grossAmount += p.grossPay;
    acc.deductionAmount += p.totalDeductions;
    acc.netAmount += p.netPay;
    return acc;
  }, { grossAmount: 0, deductionAmount: 0, netAmount: 0 });

  res.status(200).json({
    success: true,
    data: {
      officeId,
      periodStart,
      periodEnd,
      employeeCount: previews.length,
      totals,
      previews,
    },
  });
});

exports.createPayrollRun = asyncHandler(async (req, res, next) => {
  const officeId = resolveOfficeId(req.body.officeId || req.user?.officeId);
  const periodStart = req.body.periodStart ? new Date(req.body.periodStart) : null;
  const periodEnd = req.body.periodEnd ? new Date(req.body.periodEnd) : null;

  if (!officeId || !periodStart || !periodEnd) {
    return next(new AppError('officeId, periodStart and periodEnd are required', 400));
  }

  const employees = await prisma.employee.findMany({
    where: { officeId, status: 'ACTIVE' },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  if (!employees.length) {
    return next(new AppError('No active employees found for payroll run', 400));
  }

  const workingDays = Number(req.body.workingDays || 30);
  const attendanceByEmployee = req.body.attendanceByEmployee || {};
  const ruleConfig = req.body.ruleConfig || {};

  const slips = employees.map((employee) => {
    const attendanceSummary = attendanceByEmployee[employee.id] || {
      presentDays: workingDays,
      workingDays,
    };

    const calc = calculatePayslipPreview(employee, attendanceSummary, ruleConfig);

    return {
      employee,
      calc,
    };
  });

  const totals = slips.reduce((acc, item) => {
    acc.grossAmount += item.calc.grossPay;
    acc.deductionAmount += item.calc.totalDeductions;
    acc.netAmount += item.calc.netPay;
    return acc;
  }, { grossAmount: 0, deductionAmount: 0, netAmount: 0 });

  const runCode = req.body.runCode || buildRunCode();

  const payrollRun = await prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: {
        runCode,
        officeId,
        periodStart,
        periodEnd,
        status: 'PROCESSED',
        processedById: req.user?.id || null,
        processedAt: new Date(),
        grossAmount: totals.grossAmount,
        deductionAmount: totals.deductionAmount,
        netAmount: totals.netAmount,
        notes: req.body.notes || null,
      },
    });

    // Post payroll accrual as an expense transaction so finance dashboards include payroll.
    await tx.transaction.create({
      data: {
        type: 'EXPENSE',
        category: 'PAYROLL',
        amount: totals.grossAmount,
        currency: 'INR',
        date: periodEnd,
        description: `Payroll run ${runCode} (${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)})`,
        referenceType: 'MANUAL',
        referenceId: run.id,
        officeId,
        recordedById: req.user?.id || null,
        status: 'CLEARED',
      },
    });

    for (const item of slips) {
      await tx.payslip.create({
        data: {
          payslipNumber: `${runCode}-${item.employee.employeeCode}`,
          payrollRunId: run.id,
          employeeId: item.employee.id,
          earnings: item.calc.earnings,
          deductions: item.calc.deductions,
          grossPay: item.calc.grossPay,
          netPay: item.calc.netPay,
        },
      });
    }

    return run;
  });

  const runWithPayslips = await prisma.payrollRun.findUnique({
    where: { id: payrollRun.id },
    include: {
      payslips: {
        include: {
          employee: {
            select: { id: true, employeeCode: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  res.status(201).json({ success: true, data: runWithPayslips });
});

exports.getPayrollRuns = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);

  const payrollRuns = await prisma.payrollRun.findMany({
    where: {
      ...(officeId && { officeId }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      office: { select: { id: true, name: true, code: true } },
      _count: { select: { payslips: true } },
    },
  });

  res.status(200).json({ success: true, count: payrollRuns.length, data: payrollRuns });
});

exports.lockPayrollRun = asyncHandler(async (req, res, next) => {
  const existing = await prisma.payrollRun.findUnique({ where: { id: req.params.id } });
  if (!existing) return next(new AppError('Payroll run not found', 404));

  const updated = await prisma.payrollRun.update({
    where: { id: req.params.id },
    data: {
      status: 'LOCKED',
      lockedAt: new Date(),
    },
  });

  res.status(200).json({ success: true, data: updated });
});

exports.getHcmDashboardStats = asyncHandler(async (req, res) => {
  const officeId = resolveOfficeId(req.query.officeId || req.user?.officeId);
  const today = normalizeDateOnly(new Date());

  const [employees, pendingLeave, presentToday, payrollRuns] = await Promise.all([
    prisma.employee.count({ where: { ...(officeId && { officeId }), status: 'ACTIVE' } }),
    prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
        ...(officeId ? { employee: { officeId } } : {}),
      },
    }),
    prisma.attendance.count({
      where: {
        date: today,
        status: 'PRESENT',
        ...(officeId ? { employee: { officeId } } : {}),
      },
    }),
    prisma.payrollRun.findMany({
      where: {
        ...(officeId && { officeId }),
      },
      select: {
        id: true,
        runCode: true,
        status: true,
        netAmount: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      employees,
      pendingLeave,
      presentToday,
      attendanceRatio: employees > 0 ? Math.round((presentToday / employees) * 100) : 0,
      recentPayrollRuns: payrollRuns,
    },
  });
});
