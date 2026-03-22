import { Link } from 'react-router-dom';

export function HCMWorkspace() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phase 2</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Human Capital Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Payroll engine and HCM lifecycle have been scaffolded. Use these APIs to onboard employees,
          submit leave requests, and run preview or processed payroll cycles.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">Employees</p>
          <p className="mt-2 text-sm text-slate-700">Manage employee master data and office mapping.</p>
          <p className="mt-3 text-xs text-slate-500">API: GET/POST /api/hcm/employees</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">Leave</p>
          <p className="mt-2 text-sm text-slate-700">Track leave requests with approval metadata.</p>
          <p className="mt-3 text-xs text-slate-500">API: GET/POST /api/hcm/leave-requests</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">Payroll</p>
          <p className="mt-2 text-sm text-slate-700">Preview payroll and create locked payroll runs.</p>
          <p className="mt-3 text-xs text-slate-500">API: POST /api/hcm/payroll-runs/preview, /api/hcm/payroll-runs</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Next: add dedicated employee directory, attendance grid, and payroll run history tables in this workspace.
        <div className="mt-3">
          <Link to="/reports" className="font-medium text-sky-700 hover:text-sky-800">
            Open reports for finance/hcm reconciliation
          </Link>
        </div>
      </div>
    </div>
  );
}
