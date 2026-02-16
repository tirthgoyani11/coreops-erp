import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { RoleGuard } from './components/layout/RoleGuard';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Register } from './pages/Register';
import { SetupWizard } from './pages/SetupWizard';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { ManagerDashboard } from './pages/dashboards/ManagerDashboard';
import { TechDashboard } from './pages/dashboards/TechDashboard';
import { ViewerDashboard } from './pages/dashboards/ViewerDashboard';
import { StaffDashboard } from './pages/dashboards/StaffDashboard';
import AssetList from './pages/AssetList';
import { AssetWizard } from './pages/AssetWizard';
import AssetDetail from './pages/AssetDetail';
import { Inventory } from './pages/Inventory';
import { Maintenance } from './pages/Maintenance';
import TicketDetails from './pages/TicketDetails';
import { ScanQR } from './pages/ScanQR';
import { Offices } from './pages/Offices';
import { Users } from './pages/Users';
import { Vendors } from './pages/Vendors';
import { Analytics } from './pages/Analytics';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Notifications } from './pages/Notifications';
import AuditLogs from './pages/AuditLogs';
import AccessDenied from './pages/AccessDenied';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { useAuthStore } from './stores/authStore';
import './index.css';

/**
 * App Routes with RBAC Protection (Phase 3)
 * 
 * Route protection based on phase_03_rbac_matrix.md:
 * - Dashboard, Assets, Inventory, Maintenance: All roles (with scope filtering)
 * - Vendors: Managers + Viewer (read-only)
 * - Purchase Orders: Managers only
 * - Analytics: Not for Technician
 * - Users: Managers only (with scope limits)
 * - Offices/Organizations: Super Admin only
 * - Audit Logs: All managers + Viewer (read-only)
 * - Settings: Super Admin only
 */

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster />
        <Routes>
          {/* Public Auth Routes (Phase 4) */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/register/:inviteToken" element={<Register />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Protected Routes inside MainLayout */}
          <Route element={<MainLayout />}>
            {/* Dashboard Router - redirects based on role */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Role-Specific Dashboards (Phase 5) */}
            <Route
              path="/dashboard/super-admin"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/branch"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <ManagerDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/tech"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}>
                  <TechDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/viewer"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                  <ViewerDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/dashboard/staff"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <StaffDashboard />
                </RoleGuard>
              }
            />

            {/* Assets - All roles (CRUD scope varies by role) */}
            <Route path="/assets" element={<AssetList />} />
            <Route path="/assets/new" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><AssetWizard /></RoleGuard>} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/assets/:id/edit" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><AssetWizard /></RoleGuard>} />


            {/* Inventory - All roles (CRUD scope varies by role) */}
            <Route path="/inventory" element={<Inventory />} />

            {/* Maintenance - All roles can view (Tech can create, Managers approve) */}
            <Route path="/maintenance" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><Maintenance /></RoleGuard>} />
            <Route path="/maintenance/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><TicketDetails /></RoleGuard>} />

            {/* QR Scan - Tech primarily */}
            <Route path="/scan" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><ScanQR /></RoleGuard>} />

            {/* Vendors - Managers + Viewer (Branch Mgr = view-only for global vendors) */}
            <Route
              path="/vendors"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                  <Vendors />
                </RoleGuard>
              }
            />

            {/* Purchase Orders - Managers only (no Technician/Viewer) */}
            <Route
              path="/purchase-orders"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <PurchaseOrders />
                </RoleGuard>
              }
            />

            {/* Analytics - Not for Technician */}
            <Route
              path="/analytics"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                  <Analytics />
                </RoleGuard>
              }
            />

            {/* Notifications - Everyone */}
            <Route path="/notifications" element={<Notifications />} />

            {/* Audit Logs - Managers + Viewer (read-only) */}
            <Route
              path="/audit-logs"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                  <AuditLogs />
                </RoleGuard>
              }
            />

            {/* Users - Managers only (each can manage within their scope) */}
            <Route
              path="/users"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <Users />
                </RoleGuard>
              }
            />

            {/* Offices/Organizations - Super Admin only */}
            <Route
              path="/offices"
              element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <Offices />
                </RoleGuard>
              }
            />

            {/* TODO: Add these routes as pages are created */}
            {/* <Route path="/profile" element={<Profile />} /> */}
            {/* <Route path="/settings" element={<RoleGuard allowedRoles={['SUPER_ADMIN']}><Settings /></RoleGuard>} /> */}
            {/* <Route path="/financial" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']}><Financial /></RoleGuard>} /> */}
            {/* <Route path="/reports" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']}><Reports /></RoleGuard>} /> */}
            {/* <Route path="/my-tickets" element={<RoleGuard allowedRoles={['TECHNICIAN']}><MyTickets /></RoleGuard>} /> */}
          </Route>

          {/* 404 — Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
