import { type ComponentType, useEffect, useMemo, useState } from 'react';
import { Briefcase, CalendarDays, Check, Loader2, RefreshCcw, Search, Target, UserCheck, Users, Wallet, X } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { toast } from '../../components/ui/Toaster';
import { useAuthStore } from '../../stores/authStore';

type TabKey = 'employees' | 'leave' | 'attendance' | 'payroll' | 'talent' | 'performance';

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

type RecruitmentPosition = {
  id: string;
  positionCode: string;
  title: string;
  department: string | null;
  employmentType: Employee['employmentType'];
  targetHires: number;
  openingsFilled: number;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
  officeId: string;
  _count?: { applications: number };
};

type CandidateApplication = {
  id: string;
  recruitmentPositionId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  stage: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  score: number | null;
  recruitmentPosition: {
    id: string;
    positionCode: string;
    title: string;
    officeId: string;
  };
};

type PerformanceGoal = {
  id: string;
  employeeId: string;
  title: string;
  targetValue: number | null;
  currentValue: number;
  weight: number;
  status: 'DRAFT' | 'ACTIVE' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; officeId: string };
};

type PerformanceReview = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  rating: number | null;
  summary: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'FINALIZED';
  employee: { id: string; employeeCode: string; firstName: string; lastName: string; officeId: string };
  reviewer: { id: string; name: string; email: string } | null;
};

type Objective = {
  id: string;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string; officeId: string };
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';
  dueDate: string | null;
  keyResults: Array<{ id: string; title: string; currentValue: number; targetValue: number | null; status: 'NOT_STARTED' | 'ON_TRACK' | 'AT_RISK' | 'ACHIEVED' }>;
};

type LearningCourse = {
  id: string;
  officeId: string;
  title: string;
  provider: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  _count?: { enrollments: number };
};

type LearningEnrollment = {
  id: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';
  employee: { id: string; firstName: string; lastName: string; employeeCode: string; officeId: string };
  course: { id: string; title: string; officeId: string };
};

type WorkforcePlan = {
  id: string;
  officeId: string;
  department: string | null;
  plannedHeadcount: number;
  currentHeadcount: number;
  hiringNeeded: number;
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
  targetDate: string | null;
};

type SelfServiceRequest = {
  id: string;
  requestType: 'PROFILE_UPDATE' | 'SHIFT_CHANGE' | 'LEAVE_ADJUSTMENT' | 'TRAINING_REQUEST' | 'OTHER';
  title: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  employee: { id: string; firstName: string; lastName: string; employeeCode: string; officeId: string };
};

type ApiResponse<T> = { success: boolean; data: T; count?: number };

const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: 'employees', label: 'Employees', icon: Users },
  { key: 'leave', label: 'Leave & Approvals', icon: CalendarDays },
  { key: 'attendance', label: 'Attendance', icon: Check },
  { key: 'payroll', label: 'Payroll', icon: Wallet },
  { key: 'talent', label: 'Talent Acquisition', icon: UserCheck },
  { key: 'performance', label: 'Performance', icon: Target },
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
  const [positions, setPositions] = useState<RecruitmentPosition[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [learningCourses, setLearningCourses] = useState<LearningCourse[]>([]);
  const [learningEnrollments, setLearningEnrollments] = useState<LearningEnrollment[]>([]);
  const [workforcePlans, setWorkforcePlans] = useState<WorkforcePlan[]>([]);
  const [selfServiceRequests, setSelfServiceRequests] = useState<SelfServiceRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ employees: 0, pendingLeave: 0, presentToday: 0, attendanceRatio: 0 });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'ALL' | Employee['status']>('ALL');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | LeaveRequest['status']>('ALL');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'ALL' | Attendance['status']>('ALL');
  const [candidateStageFilter, setCandidateStageFilter] = useState<'ALL' | CandidateApplication['stage']>('ALL');
  const [goalStatusFilter, setGoalStatusFilter] = useState<'ALL' | PerformanceGoal['status']>('ALL');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'ALL' | PerformanceReview['status']>('ALL');

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

  const [positionForm, setPositionForm] = useState({
    title: '',
    department: '',
    employmentType: 'FULL_TIME' as Employee['employmentType'],
    targetHires: '1',
    officeId: '',
  });

  const [applicationForm, setApplicationForm] = useState({
    recruitmentPositionId: '',
    fullName: '',
    email: '',
    phone: '',
    source: 'LinkedIn',
    score: '',
  });

  const [goalForm, setGoalForm] = useState({
    employeeId: '',
    title: '',
    targetValue: '',
    weight: '1',
    dueDate: isoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
  });

  const [reviewForm, setReviewForm] = useState({
    employeeId: '',
    periodStart: isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    periodEnd: isoDate(new Date()),
    rating: '',
    summary: '',
  });

  const [objectiveForm, setObjectiveForm] = useState({
    employeeId: '',
    title: '',
    dueDate: isoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)),
  });

  const [learningCourseForm, setLearningCourseForm] = useState({
    title: '',
    provider: '',
    durationHours: '8',
  });

  const [learningRequestForm, setLearningRequestForm] = useState({
    courseId: '',
    employeeId: '',
  });

  const [workforcePlanForm, setWorkforcePlanForm] = useState({
    department: '',
    plannedHeadcount: '0',
    currentHeadcount: '0',
    hiringNeeded: '0',
    targetDate: isoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1)),
  });

  const [selfServiceForm, setSelfServiceForm] = useState({
    employeeId: '',
    requestType: 'OTHER' as SelfServiceRequest['requestType'],
    title: '',
    details: '',
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

  const scopedPositions = useMemo(() => {
    if (!selectedOfficeId) return positions;
    return positions.filter((item) => item.officeId === selectedOfficeId);
  }, [positions, selectedOfficeId]);

  const filteredApplications = useMemo(() => applications.filter((item) => {
    const matchesStage = candidateStageFilter === 'ALL' || item.stage === candidateStageFilter;
    const matchesOffice = !selectedOfficeId || item.recruitmentPosition.officeId === selectedOfficeId;
    return matchesStage && matchesOffice;
  }), [applications, candidateStageFilter, selectedOfficeId]);

  const filteredGoals = useMemo(() => goals.filter((item) => {
    const matchesStatus = goalStatusFilter === 'ALL' || item.status === goalStatusFilter;
    const matchesOffice = !selectedOfficeId || item.employee.officeId === selectedOfficeId;
    return matchesStatus && matchesOffice;
  }), [goals, goalStatusFilter, selectedOfficeId]);

  const filteredReviews = useMemo(() => reviews.filter((item) => {
    const matchesStatus = reviewStatusFilter === 'ALL' || item.status === reviewStatusFilter;
    const matchesOffice = !selectedOfficeId || item.employee.officeId === selectedOfficeId;
    return matchesStatus && matchesOffice;
  }), [reviews, reviewStatusFilter, selectedOfficeId]);

  const filteredObjectives = useMemo(() => objectives.filter((item) => !selectedOfficeId || item.employee.officeId === selectedOfficeId), [objectives, selectedOfficeId]);

  const filteredLearningEnrollments = useMemo(() => learningEnrollments.filter((item) => !selectedOfficeId || item.employee.officeId === selectedOfficeId), [learningEnrollments, selectedOfficeId]);

  const scopedLearningCourses = useMemo(() => learningCourses.filter((item) => !selectedOfficeId || item.officeId === selectedOfficeId), [learningCourses, selectedOfficeId]);

  const scopedWorkforcePlans = useMemo(() => workforcePlans.filter((item) => !selectedOfficeId || item.officeId === selectedOfficeId), [workforcePlans, selectedOfficeId]);

  const scopedSelfServiceRequests = useMemo(() => selfServiceRequests.filter((item) => !selectedOfficeId || item.employee.officeId === selectedOfficeId), [selfServiceRequests, selectedOfficeId]);

  const fetchBaseData = async () => {
    const [officesRes, employeesRes, leaveRes, attendanceRes, runsRes, statsRes, positionsRes, applicationsRes, goalsRes, reviewsRes, objectivesRes, learningCoursesRes, learningEnrollmentsRes, workforcePlansRes, selfServiceRes] = await Promise.all([
      api.get<ApiResponse<Office[]>>('/offices'),
      api.get<ApiResponse<Employee[]>>('/hcm/employees'),
      api.get<ApiResponse<LeaveRequest[]>>('/hcm/leave-requests'),
      api.get<ApiResponse<Attendance[]>>('/hcm/attendance'),
      api.get<ApiResponse<PayrollRun[]>>('/hcm/payroll-runs'),
      api.get<ApiResponse<DashboardStats>>('/hcm/dashboard-stats'),
      api.get<ApiResponse<RecruitmentPosition[]>>('/hcm/recruitment-positions'),
      api.get<ApiResponse<CandidateApplication[]>>('/hcm/candidate-applications'),
      api.get<ApiResponse<PerformanceGoal[]>>('/hcm/performance-goals'),
      api.get<ApiResponse<PerformanceReview[]>>('/hcm/performance-reviews'),
      api.get<ApiResponse<Objective[]>>('/hcm/objectives'),
      api.get<ApiResponse<LearningCourse[]>>('/hcm/learning-courses'),
      api.get<ApiResponse<LearningEnrollment[]>>('/hcm/learning-enrollments'),
      api.get<ApiResponse<WorkforcePlan[]>>('/hcm/workforce-plans'),
      api.get<ApiResponse<SelfServiceRequest[]>>('/hcm/self-service-requests'),
    ]);

    const loadedOffices = officesRes.data.data || [];
    const loadedEmployees = employeesRes.data.data || [];

    setOffices(loadedOffices);
    setEmployees(loadedEmployees);
    setLeaveRequests(leaveRes.data.data || []);
    setAttendance(attendanceRes.data.data || []);
    setPayrollRuns(runsRes.data.data || []);
    setPositions(positionsRes.data.data || []);
    setApplications(applicationsRes.data.data || []);
    setGoals(goalsRes.data.data || []);
    setReviews(reviewsRes.data.data || []);
    setObjectives(objectivesRes.data.data || []);
    setLearningCourses(learningCoursesRes.data.data || []);
    setLearningEnrollments(learningEnrollmentsRes.data.data || []);
    setWorkforcePlans(workforcePlansRes.data.data || []);
    setSelfServiceRequests(selfServiceRes.data.data || []);
    setStats(statsRes.data.data || { employees: 0, pendingLeave: 0, presentToday: 0, attendanceRatio: 0 });

    const fallbackOfficeId = user?.office?.id || user?.officeId || loadedEmployees[0]?.officeId || loadedOffices[0]?.id || '';
    setSelectedOfficeId((prev) => prev || fallbackOfficeId);
    setEmployeeForm((prev) => ({ ...prev, officeId: prev.officeId || fallbackOfficeId }));
    setLeaveForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setAttendanceForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setPositionForm((prev) => ({ ...prev, officeId: prev.officeId || fallbackOfficeId }));
    setApplicationForm((prev) => ({ ...prev, recruitmentPositionId: prev.recruitmentPositionId || positionsRes.data.data?.[0]?.id || '' }));
    setGoalForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setReviewForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setObjectiveForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
    setLearningRequestForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '', courseId: prev.courseId || learningCoursesRes.data.data?.[0]?.id || '' }));
    setSelfServiceForm((prev) => ({ ...prev, employeeId: prev.employeeId || loadedEmployees[0]?.id || '' }));
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

  const onCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;

    try {
      setIsSubmitting(true);
      await api.post('/hcm/recruitment-positions', {
        title: positionForm.title,
        department: positionForm.department || null,
        employmentType: positionForm.employmentType,
        targetHires: Number(positionForm.targetHires || 1),
        officeId: positionForm.officeId || selectedOfficeId,
      });
      toast.success('Recruitment position created');
      setPositionForm((prev) => ({ ...prev, title: '', department: '', targetHires: '1' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationForm.recruitmentPositionId) return toast.error('Select a position first');

    try {
      setIsSubmitting(true);
      await api.post(`/hcm/recruitment-positions/${applicationForm.recruitmentPositionId}/applications`, {
        fullName: applicationForm.fullName,
        email: applicationForm.email || null,
        phone: applicationForm.phone || null,
        source: applicationForm.source || null,
        score: applicationForm.score ? Number(applicationForm.score) : null,
      });
      toast.success('Candidate application added');
      setApplicationForm((prev) => ({ ...prev, fullName: '', email: '', phone: '', source: 'LinkedIn', score: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateCandidateStage = async (applicationId: string, stage: CandidateApplication['stage']) => {
    if (!canManageEmployees) return;

    try {
      setIsSubmitting(true);
      await api.put(`/hcm/candidate-applications/${applicationId}/stage`, { stage });
      toast.success(`Candidate moved to ${stage}`);
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (!goalForm.employeeId) return toast.error('Select an employee');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/performance-goals', {
        employeeId: goalForm.employeeId,
        title: goalForm.title,
        targetValue: goalForm.targetValue ? Number(goalForm.targetValue) : null,
        weight: Number(goalForm.weight || 1),
        dueDate: goalForm.dueDate || null,
      });
      toast.success('Performance goal created');
      setGoalForm((prev) => ({ ...prev, title: '', targetValue: '', weight: '1' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateGoalProgress = async (goalId: string, currentValue: number, targetValue: number | null) => {
    if (!canManageEmployees) return;
    const nextValue = Number(window.prompt('Update current value', String(currentValue)) || currentValue);
    if (Number.isNaN(nextValue)) return;

    try {
      setIsSubmitting(true);
      await api.put(`/hcm/performance-goals/${goalId}/progress`, {
        currentValue: nextValue,
        targetValue,
      });
      toast.success('Goal progress updated');
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (new Date(reviewForm.periodEnd) < new Date(reviewForm.periodStart)) return toast.error('Review period end date must be on or after start date');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/performance-reviews', {
        employeeId: reviewForm.employeeId,
        periodStart: reviewForm.periodStart,
        periodEnd: reviewForm.periodEnd,
        rating: reviewForm.rating ? Number(reviewForm.rating) : null,
        summary: reviewForm.summary || null,
      });
      toast.success('Performance review created');
      setReviewForm((prev) => ({ ...prev, rating: '', summary: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitReview = async (reviewId: string) => {
    if (!canManageEmployees) return;

    try {
      setIsSubmitting(true);
      await api.put(`/hcm/performance-reviews/${reviewId}/submit`, { status: 'SUBMITTED' });
      toast.success('Review submitted');
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (!objectiveForm.employeeId || !objectiveForm.title.trim()) return toast.error('Employee and objective title are required');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/objectives', {
        employeeId: objectiveForm.employeeId,
        title: objectiveForm.title,
        dueDate: objectiveForm.dueDate || null,
      });
      toast.success('Objective created');
      setObjectiveForm((prev) => ({ ...prev, title: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateKeyResult = async (keyResultId: string, currentValue: number, targetValue: number | null) => {
    if (!canManageEmployees) return;
    const input = window.prompt('Update current value', String(currentValue));
    if (input == null) return;
    const nextValue = Number(input);
    if (Number.isNaN(nextValue)) return toast.error('Current value must be a number');

    try {
      setIsSubmitting(true);
      await api.put(`/hcm/key-results/${keyResultId}`, {
        currentValue: nextValue,
        targetValue,
      });
      toast.success('Key result updated');
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateLearningCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (!learningCourseForm.title.trim()) return toast.error('Course title is required');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/learning-courses', {
        officeId: selectedOfficeId,
        title: learningCourseForm.title,
        provider: learningCourseForm.provider || null,
        durationHours: Number(learningCourseForm.durationHours || 0),
      });
      toast.success('Learning course created');
      setLearningCourseForm((prev) => ({ ...prev, title: '', provider: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRequestLearningEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learningRequestForm.employeeId || !learningRequestForm.courseId) {
      return toast.error('Employee and course are required for enrollment');
    }

    try {
      setIsSubmitting(true);
      await api.post('/hcm/learning-enrollments', {
        employeeId: learningRequestForm.employeeId,
        courseId: learningRequestForm.courseId,
      });
      toast.success('Enrollment request submitted');
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDecideLearningEnrollment = async (id: string, status: LearningEnrollment['status']) => {
    if (!canManageEmployees) return;
    try {
      setIsSubmitting(true);
      await api.put(`/hcm/learning-enrollments/${id}/decision`, { status });
      toast.success(`Enrollment marked as ${status.replace('_', ' ')}`);
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateWorkforcePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageEmployees) return;
    if (!selectedOfficeId) return toast.error('Select an office first');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/workforce-plans', {
        officeId: selectedOfficeId,
        department: workforcePlanForm.department || null,
        plannedHeadcount: Number(workforcePlanForm.plannedHeadcount || 0),
        currentHeadcount: Number(workforcePlanForm.currentHeadcount || 0),
        hiringNeeded: Number(workforcePlanForm.hiringNeeded || 0),
        targetDate: workforcePlanForm.targetDate || null,
      });
      toast.success('Workforce plan created');
      setWorkforcePlanForm((prev) => ({ ...prev, department: '', plannedHeadcount: '0', currentHeadcount: '0', hiringNeeded: '0' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCreateSelfServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfServiceForm.employeeId || !selfServiceForm.title.trim()) return toast.error('Employee and title are required');

    try {
      setIsSubmitting(true);
      await api.post('/hcm/self-service-requests', {
        officeId: selectedOfficeId,
        employeeId: selfServiceForm.employeeId,
        requestType: selfServiceForm.requestType,
        title: selfServiceForm.title,
        details: selfServiceForm.details || null,
      });
      toast.success('Self-service request submitted');
      setSelfServiceForm((prev) => ({ ...prev, title: '', details: '' }));
      await fetchBaseData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDecideSelfService = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!canManageEmployees) return;
    try {
      setIsSubmitting(true);
      await api.put(`/hcm/self-service-requests/${id}/decision`, { status });
      toast.success(`Request ${status.toLowerCase()}`);
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

      {!isLoading && activeTab === 'talent' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Open Position</h2>
              {!canManageEmployees ? <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted-foreground)]">You have read-only access for recruitment setup.</p> : (
                <form onSubmit={onCreatePosition} className="space-y-3">
                  <input value={positionForm.title} onChange={(e) => setPositionForm((p) => ({ ...p, title: e.target.value }))} placeholder="Role title" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                  <input value={positionForm.department} onChange={(e) => setPositionForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={positionForm.employmentType} onChange={(e) => setPositionForm((p) => ({ ...p, employmentType: e.target.value as Employee['employmentType'] }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2"><option value="FULL_TIME">Full Time</option><option value="PART_TIME">Part Time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></select>
                    <input type="number" min="1" value={positionForm.targetHires} onChange={(e) => setPositionForm((p) => ({ ...p, targetHires: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                  </div>
                  <select value={positionForm.officeId} onChange={(e) => setPositionForm((p) => ({ ...p, officeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Office</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select>
                  <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create Position</button>
                </form>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Add Candidate</h2>
              <form onSubmit={onAddCandidate} className="space-y-3">
                <select value={applicationForm.recruitmentPositionId} onChange={(e) => setApplicationForm((p) => ({ ...p, recruitmentPositionId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Position</option>{scopedPositions.map((position) => <option key={position.id} value={position.id}>{position.positionCode} • {position.title}</option>)}</select>
                <input value={applicationForm.fullName} onChange={(e) => setApplicationForm((p) => ({ ...p, fullName: e.target.value }))} placeholder="Candidate full name" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                <input value={applicationForm.email} onChange={(e) => setApplicationForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <input value={applicationForm.phone} onChange={(e) => setApplicationForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={applicationForm.source} onChange={(e) => setApplicationForm((p) => ({ ...p, source: e.target.value }))} placeholder="Source" className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                  <input type="number" min="0" max="10" step="0.1" value={applicationForm.score} onChange={(e) => setApplicationForm((p) => ({ ...p, score: e.target.value }))} placeholder="Score" className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                </div>
                <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 font-medium disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Add Candidate</button>
              </form>
            </div>
          </section>

          <section className="xl:col-span-8 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Recruitment Pipeline</h2>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Position</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Target</th><th className="px-3 py-2 text-right">Filled</th><th className="px-3 py-2 text-right">Applications</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                  <tbody>
                    {scopedPositions.length ? scopedPositions.map((position) => (
                      <tr key={position.id} className="border-t border-[var(--border)]"><td className="px-3 py-2"><div className="font-medium">{position.title}</div><div className="text-xs text-[var(--muted-foreground)]">{position.positionCode} {position.department ? `• ${position.department}` : ''}</div></td><td className="px-3 py-2">{position.employmentType.replace('_', ' ')}</td><td className="px-3 py-2 text-right">{position.targetHires}</td><td className="px-3 py-2 text-right">{position.openingsFilled}</td><td className="px-3 py-2 text-right">{position._count?.applications ?? 0}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(position.status)}`}>{position.status.replace('_', ' ')}</span></td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No recruitment positions found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Candidate Funnel</h2><select value={candidateStageFilter} onChange={(e) => setCandidateStageFilter(e.target.value as 'ALL' | CandidateApplication['stage'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Stages</option><option value="APPLIED">Applied</option><option value="SCREENING">Screening</option><option value="INTERVIEW">Interview</option><option value="OFFER">Offer</option><option value="HIRED">Hired</option><option value="REJECTED">Rejected</option></select></div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Candidate</th><th className="px-3 py-2 text-left">Position</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-left">Stage</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                  <tbody>
                    {filteredApplications.length ? filteredApplications.map((candidate) => (
                      <tr key={candidate.id} className="border-t border-[var(--border)]"><td className="px-3 py-2"><div className="font-medium">{candidate.fullName}</div><div className="text-xs text-[var(--muted-foreground)]">{candidate.email || '-'} {candidate.phone ? `• ${candidate.phone}` : ''}</div></td><td className="px-3 py-2">{candidate.recruitmentPosition.title}</td><td className="px-3 py-2">{candidate.source || '-'}</td><td className="px-3 py-2 text-right">{candidate.score ?? '-'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(candidate.stage)}`}>{candidate.stage}</span></td><td className="px-3 py-2 text-right">{canManageEmployees ? <select value={candidate.stage} onChange={(e) => onUpdateCandidateStage(candidate.id, e.target.value as CandidateApplication['stage'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-2 py-1 text-xs"><option value="APPLIED">Applied</option><option value="SCREENING">Screening</option><option value="INTERVIEW">Interview</option><option value="OFFER">Offer</option><option value="HIRED">Hired</option><option value="REJECTED">Rejected</option></select> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No candidate applications found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && activeTab === 'performance' ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <section className="xl:col-span-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Create Goal</h2>
              {!canManageEmployees ? <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted-foreground)]">You have read-only access for performance setup.</p> : (
                <form onSubmit={onCreateGoal} className="space-y-3">
                  <select value={goalForm.employeeId} onChange={(e) => setGoalForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}</select>
                  <input value={goalForm.title} onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))} placeholder="Goal title" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required />
                  <div className="grid grid-cols-2 gap-3"><input type="number" min="0" step="0.01" value={goalForm.targetValue} onChange={(e) => setGoalForm((p) => ({ ...p, targetValue: e.target.value }))} placeholder="Target value" className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /><input type="number" min="0.1" step="0.1" value={goalForm.weight} onChange={(e) => setGoalForm((p) => ({ ...p, weight: e.target.value }))} placeholder="Weight" className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" /></div>
                  <input type="date" value={goalForm.dueDate} onChange={(e) => setGoalForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                  <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create Goal</button>
                </form>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-lg font-semibold">Create Review</h2>
              <form onSubmit={onCreateReview} className="space-y-3">
                <select value={reviewForm.employeeId} onChange={(e) => setReviewForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required><option value="">Select Employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><input type="date" value={reviewForm.periodStart} onChange={(e) => setReviewForm((p) => ({ ...p, periodStart: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required /><input type="date" value={reviewForm.periodEnd} onChange={(e) => setReviewForm((p) => ({ ...p, periodEnd: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" required /></div>
                <input type="number" min="0" max="5" step="0.1" value={reviewForm.rating} onChange={(e) => setReviewForm((p) => ({ ...p, rating: e.target.value }))} placeholder="Rating (0-5)" className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <textarea value={reviewForm.summary} onChange={(e) => setReviewForm((p) => ({ ...p, summary: e.target.value }))} placeholder="Review summary" className="h-20 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2" />
                <button type="submit" disabled={isSubmitting || !canManageEmployees} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 font-medium disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create Review</button>
              </form>
            </div>
          </section>

          <section className="xl:col-span-8 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Goal Tracker</h2><select value={goalStatusFilter} onChange={(e) => setGoalStatusFilter(e.target.value as 'ALL' | PerformanceGoal['status'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Status</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="AT_RISK">At Risk</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Goal</th><th className="px-3 py-2 text-right">Progress</th><th className="px-3 py-2 text-left">Due Date</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                  <tbody>
                    {filteredGoals.length ? filteredGoals.map((goal) => (
                      <tr key={goal.id} className="border-t border-[var(--border)]"><td className="px-3 py-2">{goal.employee.firstName} {goal.employee.lastName}</td><td className="px-3 py-2"><div className="font-medium">{goal.title}</div><div className="text-xs text-[var(--muted-foreground)]">Weight {goal.weight}</div></td><td className="px-3 py-2 text-right">{goal.currentValue}{goal.targetValue == null ? '' : ` / ${goal.targetValue}`}</td><td className="px-3 py-2">{goal.dueDate ? goal.dueDate.slice(0, 10) : '-'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(goal.status)}`}>{goal.status.replace('_', ' ')}</span></td><td className="px-3 py-2 text-right">{canManageEmployees ? <button onClick={() => onUpdateGoalProgress(goal.id, goal.currentValue, goal.targetValue)} className="rounded-md bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">Update</button> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No performance goals found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Review Cycles</h2><select value={reviewStatusFilter} onChange={(e) => setReviewStatusFilter(e.target.value as 'ALL' | PerformanceReview['status'])} className="rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm"><option value="ALL">All Status</option><option value="DRAFT">Draft</option><option value="SUBMITTED">Submitted</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="FINALIZED">Finalized</option></select></div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Period</th><th className="px-3 py-2 text-right">Rating</th><th className="px-3 py-2 text-left">Reviewer</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                  <tbody>
                    {filteredReviews.length ? filteredReviews.map((review) => (
                      <tr key={review.id} className="border-t border-[var(--border)]"><td className="px-3 py-2">{review.employee.firstName} {review.employee.lastName}</td><td className="px-3 py-2">{review.periodStart.slice(0, 10)} to {review.periodEnd.slice(0, 10)}</td><td className="px-3 py-2 text-right">{review.rating ?? '-'}</td><td className="px-3 py-2">{review.reviewer?.name || '-'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(review.status)}`}>{review.status}</span></td><td className="px-3 py-2 text-right">{canManageEmployees && review.status === 'DRAFT' ? <button onClick={() => onSubmitReview(review.id)} className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Submit</button> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No performance reviews found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Objectives & Key Results</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={onCreateObjective} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Create Objective</h3>
                  <select value={objectiveForm.employeeId} onChange={(e) => setObjectiveForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required>
                    <option value="">Select Employee</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}
                  </select>
                  <input value={objectiveForm.title} onChange={(e) => setObjectiveForm((p) => ({ ...p, title: e.target.value }))} placeholder="Objective title" className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required />
                  <input type="date" value={objectiveForm.dueDate} onChange={(e) => setObjectiveForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                  <button type="submit" disabled={isSubmitting || !canManageEmployees} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save Objective</button>
                </form>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Objective Rollup</h3>
                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {filteredObjectives.length ? filteredObjectives.map((objective) => (
                      <div key={objective.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{objective.title}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{objective.employee.firstName} {objective.employee.lastName} ({objective.employee.employeeCode})</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(objective.status)}`}>{objective.status.replace('_', ' ')}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {objective.keyResults.length ? objective.keyResults.map((kr) => (
                            <div key={kr.id} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs">
                              <div>
                                <p className="font-medium">{kr.title}</p>
                                <p className="text-[var(--muted-foreground)]">{kr.currentValue}{kr.targetValue == null ? '' : ` / ${kr.targetValue}`}</p>
                              </div>
                              {canManageEmployees ? <button onClick={() => onUpdateKeyResult(kr.id, kr.currentValue, kr.targetValue)} className="rounded-md bg-cyan-500/20 px-2 py-1 text-cyan-300">Update</button> : null}
                            </div>
                          )) : <p className="text-xs text-[var(--muted-foreground)]">No key results attached yet.</p>}
                        </div>
                      </div>
                    )) : <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">No objectives available for this office.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Learning & Development</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={onCreateLearningCourse} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Create Course</h3>
                  <input value={learningCourseForm.title} onChange={(e) => setLearningCourseForm((p) => ({ ...p, title: e.target.value }))} placeholder="Course title" className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required />
                  <input value={learningCourseForm.provider} onChange={(e) => setLearningCourseForm((p) => ({ ...p, provider: e.target.value }))} placeholder="Provider" className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                  <input type="number" min="0" step="1" value={learningCourseForm.durationHours} onChange={(e) => setLearningCourseForm((p) => ({ ...p, durationHours: e.target.value }))} placeholder="Duration in hours" className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                  <button type="submit" disabled={isSubmitting || !canManageEmployees} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 font-medium disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create Course</button>
                </form>

                <form onSubmit={onRequestLearningEnrollment} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Request Enrollment</h3>
                  <select value={learningRequestForm.employeeId} onChange={(e) => setLearningRequestForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required>
                    <option value="">Select Employee</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}
                  </select>
                  <select value={learningRequestForm.courseId} onChange={(e) => setLearningRequestForm((p) => ({ ...p, courseId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required>
                    <option value="">Select Course</option>
                    {scopedLearningCourses.map((course) => <option key={course.id} value={course.id}>{course.title} {course.provider ? `• ${course.provider}` : ''}</option>)}
                  </select>
                  <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Request Enrollment</button>
                </form>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Course</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                  <tbody>
                    {filteredLearningEnrollments.length ? filteredLearningEnrollments.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2">{row.employee.firstName} {row.employee.lastName}</td>
                        <td className="px-3 py-2">{row.course.title}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(row.status)}`}>{row.status.replace('_', ' ')}</span></td>
                        <td className="px-3 py-2 text-right">
                          {canManageEmployees && ['REQUESTED', 'APPROVED', 'IN_PROGRESS'].includes(row.status) ? (
                            <div className="inline-flex gap-2">
                              {row.status === 'REQUESTED' ? <button onClick={() => onDecideLearningEnrollment(row.id, 'APPROVED')} className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Approve</button> : null}
                              {row.status === 'REQUESTED' ? <button onClick={() => onDecideLearningEnrollment(row.id, 'REJECTED')} className="rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Reject</button> : null}
                              {row.status === 'APPROVED' ? <button onClick={() => onDecideLearningEnrollment(row.id, 'IN_PROGRESS')} className="rounded-md bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">Start</button> : null}
                              {row.status === 'IN_PROGRESS' ? <button onClick={() => onDecideLearningEnrollment(row.id, 'COMPLETED')} className="rounded-md bg-amber-500/20 px-2 py-1 text-xs text-amber-300">Complete</button> : null}
                            </div>
                          ) : <span className="text-xs text-[var(--muted-foreground)]">-</span>}
                        </td>
                      </tr>
                    )) : <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No learning enrollments found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Workforce Planning</h2>
              <form onSubmit={onCreateWorkforcePlan} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 lg:grid-cols-5">
                <input value={workforcePlanForm.department} onChange={(e) => setWorkforcePlanForm((p) => ({ ...p, department: e.target.value }))} placeholder="Department" className="rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                <input type="number" min="0" value={workforcePlanForm.plannedHeadcount} onChange={(e) => setWorkforcePlanForm((p) => ({ ...p, plannedHeadcount: e.target.value }))} placeholder="Planned" className="rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                <input type="number" min="0" value={workforcePlanForm.currentHeadcount} onChange={(e) => setWorkforcePlanForm((p) => ({ ...p, currentHeadcount: e.target.value }))} placeholder="Current" className="rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                <input type="number" min="0" value={workforcePlanForm.hiringNeeded} onChange={(e) => setWorkforcePlanForm((p) => ({ ...p, hiringNeeded: e.target.value }))} placeholder="Hiring Needed" className="rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                <input type="date" value={workforcePlanForm.targetDate} onChange={(e) => setWorkforcePlanForm((p) => ({ ...p, targetDate: e.target.value }))} className="rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                <button type="submit" disabled={isSubmitting || !canManageEmployees} className="lg:col-span-5 inline-flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2.5 font-semibold text-black disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save Workforce Plan</button>
              </form>

              <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Department</th><th className="px-3 py-2 text-right">Planned</th><th className="px-3 py-2 text-right">Current</th><th className="px-3 py-2 text-right">Hiring Needed</th><th className="px-3 py-2 text-left">Target Date</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                  <tbody>
                    {scopedWorkforcePlans.length ? scopedWorkforcePlans.map((plan) => (
                      <tr key={plan.id} className="border-t border-[var(--border)]"><td className="px-3 py-2">{plan.department || '-'}</td><td className="px-3 py-2 text-right">{plan.plannedHeadcount}</td><td className="px-3 py-2 text-right">{plan.currentHeadcount}</td><td className="px-3 py-2 text-right">{plan.hiringNeeded}</td><td className="px-3 py-2">{plan.targetDate ? plan.targetDate.slice(0, 10) : '-'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(plan.status)}`}>{plan.status.replace('_', ' ')}</span></td></tr>
                    )) : <tr><td colSpan={6} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No workforce plans found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="mb-4 text-lg font-semibold">Self-Service Approvals</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={onCreateSelfServiceRequest} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">New Request</h3>
                  <select value={selfServiceForm.employeeId} onChange={(e) => setSelfServiceForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required>
                    <option value="">Select Employee</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName} ({employee.employeeCode})</option>)}
                  </select>
                  <select value={selfServiceForm.requestType} onChange={(e) => setSelfServiceForm((p) => ({ ...p, requestType: e.target.value as SelfServiceRequest['requestType'] }))} className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2">
                    <option value="PROFILE_UPDATE">Profile Update</option>
                    <option value="SHIFT_CHANGE">Shift Change</option>
                    <option value="LEAVE_ADJUSTMENT">Leave Adjustment</option>
                    <option value="TRAINING_REQUEST">Training Request</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <input value={selfServiceForm.title} onChange={(e) => setSelfServiceForm((p) => ({ ...p, title: e.target.value }))} placeholder="Request title" className="w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" required />
                  <textarea value={selfServiceForm.details} onChange={(e) => setSelfServiceForm((p) => ({ ...p, details: e.target.value }))} placeholder="Details" className="h-20 w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-3 py-2" />
                  <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 font-medium disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Submit Request</button>
                </form>

                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead>
                    <tbody>
                      {scopedSelfServiceRequests.length ? scopedSelfServiceRequests.map((request) => (
                        <tr key={request.id} className="border-t border-[var(--border)]">
                          <td className="px-3 py-2"><div className="font-medium">{request.employee.firstName} {request.employee.lastName}</div><div className="text-xs text-[var(--muted-foreground)]">{request.title}</div></td>
                          <td className="px-3 py-2">{request.requestType.replace('_', ' ')}</td>
                          <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(request.status)}`}>{request.status}</span></td>
                          <td className="px-3 py-2 text-right">{canManageEmployees && request.status === 'PENDING' ? <div className="inline-flex gap-2"><button onClick={() => onDecideSelfService(request.id, 'APPROVED')} className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Approve</button><button onClick={() => onDecideSelfService(request.id, 'REJECTED')} className="rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Reject</button></div> : <span className="text-xs text-[var(--muted-foreground)]">-</span>}</td>
                        </tr>
                      )) : <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--muted-foreground)]">No self-service requests found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
