import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { Briefcase, CalendarDays, Check, Loader2, RefreshCcw, Search, Users, Wallet, X } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { toast } from '../../components/ui/Toaster';
import { useAuthStore } from '../../stores/authStore';

type TabKey = 'employees' | 'leave' | 'attendance' | 'payroll';

type Office = { id: string; name: string; code: string };

type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'TERMINATED';
  dateOfJoining: string;
  basicSalary: number;
  officeId: string;
};

type LeaveRequest = {
  id: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; officeId: string };
};

type Attendance = {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  notes: string | null;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; officeId: string; department: string | null };
};

type PayrollRun = {
  id: string;
  runCode: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'PROCESSED' | 'LOCKED';
  grossAmount: number;
  deductionAmount: number;
  netAmount: number;
  _count?: { payslips: number };
};

type PayrollPreview = {
  officeId: string;
  employeeCount: number;
  totals: { grossAmount: number; deductionAmount: number; netAmount: number };
  previews: Array<{ employeeId: string; employeeCode: string; employeeName: string; grossPay: number; totalDeductions: number; netPay: number }>;
};

type DashboardStats = {
  employees: number;
  pendingLeave: number;
  presentToday: number;
  attendanceRatio: number;
};

type ApiResponse<T> = { success: boolean; data: T; count?: number };

const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'leave', label: 'Leave & Approvals', icon: CalendarDays },
  { key: 'attendance', label: 'Attendance', icon: Check },
  { key: 'payroll', label: 'Payroll', icon: Wallet },
];

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function badgeClass(status: string) {
  const normalized = status.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'PROCESSED', 'LOCKED', 'PRESENT'].includes(normalized)) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  if (['PENDING', 'ON_LEAVE', 'DRAFT', 'HALF_DAY'].includes(normalized)) return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
  if (['REJECTED', 'CANCELLED', 'TERMINATED', 'INACTIVE', 'ABSENT'].includes(normalized)) return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
  return 'bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)]';
}

export function HCMWorkspace() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('employees');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workingDays, setWorkingDays] = useState(30);
  const [periodStart, setPeriodStart] = useState(isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(isoDate(new Date()));
  const [selectedOfficeId, setSelectedOfficeId] = useState('');

  const [offices, setOffices] = useState<Office[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreview | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ employees: 0, pendingLeave: 0, presentToday: 0, attendanceRatio: 0 });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'ALL' | Employee['status']>('ALL');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | LeaveRequest['status']>('ALL');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'ALL' | Attendance['status']>('ALL');

  const canManageEmployees = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');
  const canSubmitLeave = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'].includes(user?.role || '');
  const canApproveLeave = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');
  const canRunPayroll = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || '');

  const [employeeForm, setEmployeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    employmentType: 'FULL_TIME' as Employee['employmentType'],
    basicSalary: '',
    officeId: '',
    dateOfJoining: isoDate(new Date()),
  });

  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'CASUAL' as LeaveRequest['leaveType'],
    startDate: isoDate(new Date()),
    endDate: isoDate(new Date()),
    reason: '',
  });

  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    date: isoDate(new Date()),
    status: 'PRESENT' as Attendance['status'],
    checkIn: '',
    checkOut: '',
    notes: '',
  });

  const scopedEmployees = useMemo(() => {
    if (!selectedOfficeId) return employees;
    return employees.filter((e) => e.officeId === selectedOfficeId);
  }, [employees, selectedOfficeId]);

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return scopedEmployees.filter((employee) => {
      const matchesStatus = employeeStatusFilter === 'ALL' || employee.status === employeeStatusFilter;
      const matchesSearch = !query || `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query) || employee.employeeCode.toLowerCase().includes(query) || (employee.email || '').toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [scopedEmployees, employeeStatusFilter, employeeSearch]);

  const filteredLeave = useMemo(() => leaveRequests.filter((item) => (leaveStatusFilter === 'ALL' || item.status === leaveStatusFilter) && (!selectedOfficeId || item.employee.officeId === selectedOfficeId)), [leaveRequests, leaveStatusFilter, selectedOfficeId]);

  const filteredAttendance = useMemo(() => attendance.filter((item) => (attendanceStatusFilter === 'ALL' || item.status === attendanceStatusFilter) && (!selectedOfficeId || item.employee.officeId === selectedOfficeId)), [attendance, attendanceStatusFilter, selectedOfficeId]);

  const fetchBaseData = async () => {
    const [officesRes, employeesRes, leaveRes, attendanceRes, runsRes, statsRes] = await Promise.all([
      api.get<ApiResponse<Office[]>>('/offices'),
      api.get<ApiResponse<Employee[]>>('/hcm/employees'),
      api.get<ApiResponse<LeaveRequest[]>>('/hcm/leave-requests'),
      api.get<ApiResponse<Attendance[]>>('/hcm/attendance'),
      api.get<ApiResponse<PayrollRun[]>>('/hcm/payroll-runs'),
      api.get<ApiResponse<DashboardStats>>('/hcm/dashboard-stats'),
    ]);

    const loadedOffices = officesRes.data.data || [];
    const loadedEmployees = employeesRes.data.data || [];

    setOffices(loadedOffices);
    setEmployees(loadedEmployees);
    setLeaveRequests(leaveRes.data.data || []);
    setAttendance(attendanceRes.data.data || []);
    setPayrollRuns(runsRes.data.data || []);
    setStats(statsRes.data.data || { employees: 0, pendingLeave: 0, presentToday: 0, attendanceRatio: 0 });

    const fallbackOfficeId = user?.office?.id || user?.officeId || loadedEmployees[0]?.officeId || loadedOffices[0]?.id || '';
    setSelectedOfficeId((prev) => prev || fallbackOfficeId);
    setEmployeeForm((prev) => ({ ...prev, officeId: prev.officeId || fallbackOfficeId }));
    setLeaveForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setAttendanceForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        await fetchBaseData();
      } catch (error) {
        if (mounted) toast.error(getErrorMessage(error));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (Number(employeeForm.basicSalary || 0) <= 0) return toast.error('Basic salary must be greater than 0');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/employees', { ...employeeForm, basicSalary: Number(employeeForm.basicSalary) });
      toast.success('Employee created');
      setEmployeeForm((prev) => ({ ...prev, firstName: '', lastName: '', email: '', phone: '', designation: '', department: '', basicSalary: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitLeave) return;
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) return toast.error('Leave end date must be on or after start date');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/leave-requests', leaveForm);
      toast.success('Leave request submitted');
      setLeaveForm((prev) => ({ ...prev, reason: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDecideLeave = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (!canApproveLeave) return;
    try {
      setIsSubmitting(true);
      await api.put(`/hcm/leave-requests/${id}/decision`, { decision });
      toast.success(`Leave request ${decision.toLowerCase()}`);
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.employeeId) return toast.error('Select employee for attendance');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/attendance', {
        employeeId: attendanceForm.employeeId,
        date: attendanceForm.date,
        status: attendanceForm.status,
        checkIn: attendanceForm.checkIn ? `${attendanceForm.date}T${attendanceForm.checkIn}:00` : null,
        checkOut: attendanceForm.checkOut ? `${attendanceForm.date}T${attendanceForm.checkOut}:00` : null,
        notes: attendanceForm.notes || null,
      });
      toast.success('Attendance saved');
      setAttendanceForm((prev) => ({ ...prev, checkIn: '', checkOut: '', notes: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPreviewPayroll = async () => {
    if (!selectedOfficeId) return toast.error('Select an office first');
    if (new Date(periodEnd) < new Date(periodStart)) return toast.error('Payroll period end date must be on or after start date');

    try {
      setIsSubmitting(true);
      const response = await api.post<ApiResponse<PayrollPreview>>('/hcm/payroll-runs/preview', {
        officeId: selectedOfficeId,
        periodStart,
        periodEnd,
        workingDays,
      });
      setPayrollPreview(response.data.data);
      toast.success('Payroll preview generated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRunPayroll = async () => {
    if (!canRunPayroll) return;
    if (!selectedOfficeId) return toast.error('Select an office first');
    if (new Date(periodEnd) < new Date(periodStart)) return toast.error('Payroll period end date must be on or after start date');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/payroll-runs', { officeId: selectedOfficeId, periodStart, periodEnd, workingDays });
      toast.success('Payroll run created');
      await fetchBaseData();
      await onPreviewPayroll();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLockPayroll = async (runId: string) => {
    if (!canRunPayroll) return;
    try {
      setIsSubmitting(true);
      await api.put(`/hcm/payroll-runs/${runId}/lock`, {});
      toast.success('Payroll run locked');
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-cyan-500/10 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Enterprise HCM</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">Human Capital Command Center</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">Workforce lifecycle, attendance ops, leave governance, and payroll controls in one ERP-grade workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"><p className="text-xs text-[var(--muted-foreground)]">Active Employees</p><p className="text-xl font-semibold">{stats.employees}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"><p className="text-xs text-[var(--muted-foreground)]">Pending Leaves</p><p className="text-xl font-semibold">{stats.pendingLeave}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"><p className="text-xs text-[var(--muted-foreground)]">Present Today</p><p className="text-xl font-semibold">{stats.presentToday}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"><p className="text-xs text-[var(--muted-foreground)]">Attendance Ratio</p><p className="text-xl font-semibold">{stats.attendanceRatio}%</p></div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={fetchBaseData} className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm hover:text-[var(--foreground)]"><RefreshCcw className="h-4 w-4" />Refresh Data</button>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${isActive ? 'bg-[var(--primary)] text-black font-semibold' : 'text-[var(--muted-foreground)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'}`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16"><Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" /></div> : null}

      {!isLoading && activeTab === 'employees' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Briefcase className="h-5 w-5 text-cyan-400" />Onboard Employee</h2>
            {!canManageEmployees ? <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted-foreground)]">You have read-only access for employee data.</p> : (
              <form onSubmit={onCreateEmployee} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="First Name" value={employeeForm.firstName} onChange={(e) => setEmployeeForm((p) => ({ ...p, firstName: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                  <input placeholder="Last Name" value={employeeForm.lastName} onChange={(e) => setEmployeeForm((p) => ({ ...p, lastName: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                </div>
                <input placeholder="Work Email" value={employeeForm.email} onChange={(e) => setEmployeeForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <input placeholder="Phone" value={employeeForm.phone} onChange={(e) => setEmployeeForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Designation" value={employeeForm.designation} onChange={(e) => setEmployeeForm((p) => ({ ...p, designation: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                  <input placeholder="Department" value={employeeForm.department} onChange={(e) => setEmployeeForm((p) => ({ ...p, department: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={employeeForm.employmentType} onChange={(e) => setEmployeeForm((p) => ({ ...p, employmentType: e.target.value as Employee['employmentType'] }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2"><option value="FULL_TIME">Full Time</option><option value="PART_TIME">Part Time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></select>
                  <input type="number" min="0" step="0.01" placeholder="Basic Salary" value={employeeForm.basicSalary} onChange={(e) => setEmployeeForm((p) => ({ ...p, basicSalary: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={employeeForm.officeId} onChange={(e) => setEmployeeForm((p) => ({ ...p, officeId: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required>
                    <option value="">Select Office</option>
                    {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                  </select>
                  <input type="date" value={employeeForm.dateOfJoining} onChange={(e) => setEmployeeForm((p) => ({ ...p, dateOfJoining: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                </div>
                <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save Employee</button>
              </form>
            )}
          </section>

          <section className="xl:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Employee Directory</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative"><Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input placeholder="Search employee" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="rounded-md border border-[var(--input)] bg-[var(--background)] py-2 pl-8 pr-3 text-sm" /></div>
                <select value={employeeStatusFilter} onChange={(e) => setEmployeeStatusFilter(e.target.value as 'ALL' | Employee['status'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="ON_LEAVE">On Leave</option><option value="INACTIVE">Inactive</option><option value="TERMINATED">Terminated</option></select>
                <select value={selectedOfficeId} onChange={(e) => setSelectedOfficeId(e.target.value)} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="">All Offices</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Department</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Basic Salary</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody>
                  {filteredEmployees.length ? filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-t border-[var(--border)]"><td className="px-3 py-2"><div className="font-medium">{employee.firstName} {employee.lastName}</div><div className="text-xs text-[var(--muted-foreground)]">{employee.employeeCode} {employee.email ? `• ${employee.email}` : ''}</div></td><td className="px-3 py-2">{employee.department || '-'}</td><td className="px-3 py-2">{employee.employmentType.replace('_', ' ')}</td><td className="px-3 py-2 text-right">{currency(employee.basicSalary)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(employee.status)}`}>{employee.status.replace('_', ' ')}</span></td></tr>
                  )) : <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No employees found for selected filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeTab === 'leave' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-4 text-lg font-semibold">Create Leave Request</h2>
            {!canSubmitLeave ? <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted-foreground)]">You have read-only access for leave requests.</p> : (
              <form onSubmit={onCreateLeaveRequest} className="space-y-3">
                <select value={leaveForm.employeeId} onChange={(e) => setLeaveForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}</select>
                <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value as LeaveRequest['leaveType'] }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2"><option value="CASUAL">Casual Leave</option><option value="SICK">Sick Leave</option><option value="EARNED">Earned Leave</option><option value="MATERNITY">Maternity Leave</option><option value="PATERNITY">Paternity Leave</option><option value="UNPAID">Unpaid Leave</option></select>
                <div className="grid grid-cols-2 gap-3"><input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required /><input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required /></div>
                <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason" className="h-24 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Submit Leave</button>
              </form>
            )}
          </section>

          <section className="xl:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Leave Workflow Queue</h2><select value={leaveStatusFilter} onChange={(e) => setLeaveStatusFilter(e.target.value as 'ALL' | LeaveRequest['status'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></select></div>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Leave Type</th><th className="px-3 py-2 text-left">Dates</th><th className="px-3 py-2 text-right">Days</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
                <tbody>
                  {filteredLeave.length ? filteredLeave.map((request) => (
                    <tr key={request.id} className="border-t border-[var(--border)]"><td className="px-3 py-2">{request.employee.firstName} {request.employee.lastName}</td><td className="px-3 py-2">{request.leaveType}</td><td className="px-3 py-2">{request.startDate.slice(0, 10)} to {request.endDate.slice(0, 10)}</td><td className="px-3 py-2 text-right">{request.totalDays}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(request.status)}`}>{request.status}</span></td><td className="px-3 py-2 text-right">{canApproveLeave && request.status === 'PENDING' ? <div className="inline-flex gap-2"><button onClick={() => onDecideLeave(request.id, 'APPROVED')} className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300"><Check className="mr-1 inline h-3 w-3" />Approve</button><button onClick={() => onDecideLeave(request.id, 'REJECTED')} className="rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-300"><X className="mr-1 inline h-3 w-3" />Reject</button></div> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td></tr>
                  )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No leave requests found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeTab === 'attendance' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="mb-4 text-lg font-semibold">Attendance Register</h2>
            <form onSubmit={onSaveAttendance} className="space-y-3">
              <select value={attendanceForm.employeeId} onChange={(e) => setAttendanceForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}</select>
              <input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
              <select value={attendanceForm.status} onChange={(e) => setAttendanceForm((p) => ({ ...p, status: e.target.value as Attendance['status'] }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2"><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="HALF_DAY">Half Day</option><option value="LEAVE">Leave</option><option value="HOLIDAY">Holiday</option></select>
              <div className="grid grid-cols-2 gap-3"><input type="time" value={attendanceForm.checkIn} onChange={(e) => setAttendanceForm((p) => ({ ...p, checkIn: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /><input type="time" value={attendanceForm.checkOut} onChange={(e) => setAttendanceForm((p) => ({ ...p, checkOut: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /></div>
              <textarea value={attendanceForm.notes} onChange={(e) => setAttendanceForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="h-20 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save Attendance</button>
            </form>
          </section>

          <section className="xl:col-span-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Recent Attendance</h2><select value={attendanceStatusFilter} onChange={(e) => setAttendanceStatusFilter(e.target.value as 'ALL' | Attendance['status'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Status</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="HALF_DAY">Half Day</option><option value="LEAVE">Leave</option><option value="HOLIDAY">Holiday</option></select></div>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                <tbody>
                  {filteredAttendance.length ? filteredAttendance.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]"><td className="px-3 py-2">{item.employee.firstName} {item.employee.lastName}</td><td className="px-3 py-2">{item.date.slice(0, 10)}</td><td className="px-3 py-2">{item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} to {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td><td className="px-3 py-2 text-right">{item.hoursWorked ?? '-'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(item.status)}`}>{item.status}</span></td></tr>
                  )) : <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No attendance records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeTab === 'payroll' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <h2 className="text-lg font-semibold">Payroll Controls</h2>
            <div className="space-y-2"><label className="text-sm text-[var(--muted-foreground)]">Office</label><select value={selectedOfficeId} onChange={(e) => setSelectedOfficeId(e.target.value)} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2"><option value="">Select Office</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label className="text-sm text-[var(--muted-foreground)]">Period Start</label><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /></div><div className="space-y-2"><label className="text-sm text-[var(--muted-foreground)]">Period End</label><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /></div></div>
            <div className="space-y-2"><label className="text-sm text-[var(--muted-foreground)]">Working Days</label><input type="number" min="1" max="31" value={workingDays} onChange={(e) => setWorkingDays(Math.min(31, Math.max(1, Number(e.target.value || 30))))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /></div>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onPreviewPayroll} disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Preview</button><button type="button" onClick={onRunPayroll} disabled={isSubmitting || !canRunPayroll} className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Run Payroll</button></div>
          </section>

          <section className="xl:col-span-8 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Payroll Preview</h2>
              {payrollPreview ? (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-3"><div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"><p className="text-xs text-[var(--muted-foreground)]">Employees</p><p className="text-lg font-semibold">{payrollPreview.employeeCount}</p></div><div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"><p className="text-xs text-[var(--muted-foreground)]">Gross</p><p className="text-lg font-semibold">{currency(payrollPreview.totals.grossAmount)}</p></div><div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"><p className="text-xs text-[var(--muted-foreground)]">Net</p><p className="text-lg font-semibold">{currency(payrollPreview.totals.netAmount)}</p></div></div>
                  <div className="overflow-hidden rounded-xl border border-[var(--border)]"><table className="w-full text-sm"><thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net</th></tr></thead><tbody>{payrollPreview.previews.map((row) => <tr key={row.employeeId} className="border-t border-[var(--border)]"><td className="px-3 py-2">{row.employeeName} <span className="text-xs text-[var(--muted-foreground)]">({row.employeeCode})</span></td><td className="px-3 py-2 text-right">{currency(row.grossPay)}</td><td className="px-3 py-2 text-right">{currency(row.totalDeductions)}</td><td className="px-3 py-2 text-right font-medium">{currency(row.netPay)}</td></tr>)}</tbody></table></div>
                </>
              ) : <div className="rounded-lg border border-dashed border-[var(--border)] px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">Generate preview to see per-employee payroll output.</div>}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Payroll Run History</h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Run Code</th><th className="px-3 py-2 text-left">Period</th><th className="px-3 py-2 text-right">Payslips</th><th className="px-3 py-2 text-right">Net Amount</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                  <tbody>
                    {payrollRuns.length ? payrollRuns.map((run) => (
                      <tr key={run.id} className="border-t border-[var(--border)]"><td className="px-3 py-2 font-medium">{run.runCode}</td><td className="px-3 py-2">{run.periodStart.slice(0, 10)} to {run.periodEnd.slice(0, 10)}</td><td className="px-3 py-2 text-right">{run._count?.payslips ?? '-'}</td><td className="px-3 py-2 text-right">{currency(run.netAmount)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(run.status)}`}>{run.status}</span></td><td className="px-3 py-2 text-right">{canRunPayroll && run.status === 'PROCESSED' ? <button onClick={() => onLockPayroll(run.id)} className="rounded-md bg-amber-500/20 px-2 py-1 text-xs text-amber-300">Lock</button> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No payroll runs available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
