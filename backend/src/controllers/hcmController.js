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
