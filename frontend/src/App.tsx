import { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { RoleGuard } from './components/layout/RoleGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/ui/CommandPalette';
import { GlobalShortcutsModal } from './components/ui/GlobalShortcutsModal';
import { Toaster } from './components/ui/Toaster';
import { useShortcut } from './hooks/useShortcuts';
import { useAuthStore } from './stores/authStore';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-r-transparent animate-spin"></div>
  </div>
);

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const SetupWizard = lazy(() => import('./pages/SetupWizard').then(m => ({ default: m.SetupWizard })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ManagerDashboard = lazy(() => import('./pages/dashboards/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const TechDashboard = lazy(() => import('./pages/dashboards/TechDashboard').then(m => ({ default: m.TechDashboard })));
const ViewerDashboard = lazy(() => import('./pages/dashboards/ViewerDashboard').then(m => ({ default: m.ViewerDashboard })));
const StaffDashboard = lazy(() => import('./pages/dashboards/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const AssetList = lazy(() => import('./pages/AssetList'));
const AssetWizard = lazy(() => import('./pages/AssetWizard').then(m => ({ default: m.AssetWizard })));
const AssetDetail = lazy(() => import('./pages/AssetDetail'));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Maintenance = lazy(() => import('./pages/Maintenance').then(m => ({ default: m.Maintenance })));
const PreventiveMaintenance = lazy(() => import('./pages/PreventiveMaintenance').then(m => ({ default: m.PreventiveMaintenance })));
const MaintenanceAnalytics = lazy(() => import('./pages/MaintenanceAnalytics').then(m => ({ default: m.MaintenanceAnalytics })));
const SLADashboard = lazy(() => import('./pages/SLADashboard').then(m => ({ default: m.SLADashboard })));
const MaintenanceCalendar = lazy(() => import('./pages/MaintenanceCalendar').then(m => ({ default: m.MaintenanceCalendar })));
const MaintenanceGantt = lazy(() => import('./pages/MaintenanceGantt').then(m => ({ default: m.MaintenanceGantt })));
const PredictiveDashboard = lazy(() => import('./pages/PredictiveDashboard').then(m => ({ default: m.PredictiveDashboard })));
const InvoiceScanner = lazy(() => import('./pages/InvoiceScanner').then(m => ({ default: m.InvoiceScanner })));
const TicketDetails = lazy(() => import('./pages/TicketDetails'));
const TicketWizard = lazy(() => import('./pages/TicketWizard').then(m => ({ default: m.TicketWizard })));
const ScanQR = lazy(() => import('./pages/ScanQR').then(m => ({ default: m.ScanQR })));
const MyTickets = lazy(() => import('./pages/MyTickets').then(m => ({ default: m.MyTickets })));
const Offices = lazy(() => import('./pages/Offices').then(m => ({ default: m.Offices })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const UserDetail = lazy(() => import('./pages/UserDetail'));
const InventoryDetail = lazy(() => import('./pages/InventoryDetail').then(m => ({ default: m.InventoryDetail })));
const StockOperations = lazy(() => import('./pages/StockOperations').then(m => ({ default: m.StockOperations })));
const BatchTracker = lazy(() => import('./pages/BatchTracker').then(m => ({ default: m.BatchTracker })));
const InventoryValuation = lazy(() => import('./pages/InventoryValuation').then(m => ({ default: m.InventoryValuation })));
const Stocktake = lazy(() => import('./pages/Stocktake').then(m => ({ default: m.Stocktake })));
const InventoryTransfer = lazy(() => import('./pages/InventoryTransfer').then(m => ({ default: m.InventoryTransfer })));
const InventoryReturns = lazy(() => import('./pages/InventoryReturns').then(m => ({ default: m.InventoryReturns })));
const AssetMap = lazy(() => import('./pages/AssetMap').then(m => ({ default: m.AssetMap })));
const PurchaseRequisitions = lazy(() => import('./pages/procurement/PurchaseRequisitions').then(m => ({ default: m.PurchaseRequisitions })));
const RFQList = lazy(() => import('./pages/procurement/RFQList').then(m => ({ default: m.RFQList })));
const RFQDetail = lazy(() => import('./pages/procurement/RFQDetail').then(m => ({ default: m.RFQDetail })));
const VendorRFQBidPortal = lazy(() => import('./pages/procurement/VendorRFQBidPortal').then(m => ({ default: m.VendorRFQBidPortal })));
const GoodsReceipt = lazy(() => import('./pages/procurement/GoodsReceipt').then(m => ({ default: m.GoodsReceipt })));
const VendorList = lazy(() => import('./pages/procurement/VendorList').then(m => ({ default: m.VendorList })));
const VendorForm = lazy(() => import('./pages/procurement/VendorForm').then(m => ({ default: m.VendorForm })));
const VendorDetail = lazy(() => import('./pages/procurement/VendorDetail').then(m => ({ default: m.VendorDetail })));
const PurchaseOrderList = lazy(() => import('./pages/procurement/PurchaseOrderList').then(m => ({ default: m.PurchaseOrderList })));
const CreatePO = lazy(() => import('./pages/procurement/CreatePO').then(m => ({ default: m.CreatePO })));
const PurchaseOrderDetail = lazy(() => import('./pages/procurement/PurchaseOrderDetail').then(m => ({ default: m.PurchaseOrderDetail })));
const Financial = lazy(() => import('./pages/financial/Financial').then(m => ({ default: m.Financial })));
const GLDashboard = lazy(() => import('./pages/financial/GLDashboard').then(m => ({ default: m.GLDashboard })));
const BalanceSheet = lazy(() => import('./pages/financial/BalanceSheet').then(m => ({ default: m.BalanceSheet })));
const BankReconciliation = lazy(() => import('./pages/financial/BankReconciliation').then(m => ({ default: m.BankReconciliation })));
const YearEndClose = lazy(() => import('./pages/financial/YearEndClose').then(m => ({ default: m.YearEndClose })));
const ExpenseClaims = lazy(() => import('./pages/financial/ExpenseClaims').then(m => ({ default: m.ExpenseClaims })));
const ProfitLoss = lazy(() => import('./pages/financial/ProfitLoss').then(m => ({ default: m.ProfitLoss })));
const CashFlow = lazy(() => import('./pages/financial/CashFlow').then(m => ({ default: m.CashFlow })));
const APAging = lazy(() => import('./pages/financial/APAging').then(m => ({ default: m.APAging })));
const ARAging = lazy(() => import('./pages/financial/ARAging').then(m => ({ default: m.ARAging })));
const WorkingCapital = lazy(() => import('./pages/financial/WorkingCapital').then(m => ({ default: m.WorkingCapital })));
const ExceptionCenter = lazy(() => import('./pages/financial/ExceptionCenter').then(m => ({ default: m.ExceptionCenter })));
const InventoryAnalytics = lazy(() => import('./pages/financial/InventoryAnalytics').then(m => ({ default: m.InventoryAnalytics })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Profile = lazy(() => import('./pages/Profile'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Settings = lazy(() => import('./pages/Settings'));
const Documents = lazy(() => import('./pages/Documents'));
const DocumentUpload = lazy(() => import('./pages/DocumentUpload'));
const DocumentViewer = lazy(() => import('./pages/DocumentViewer'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const AccessDenied = lazy(() => import('./pages/AccessDenied'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder').then(m => ({ default: m.WorkflowBuilder })));

// Phase 1: CRM & Sales
const Customers = lazy(() => import('./pages/sales/Customers').then(m => ({ default: m.Customers })));
const Quotations = lazy(() => import('./pages/sales/Quotations').then(m => ({ default: m.Quotations })));
const SalesOrders = lazy(() => import('./pages/sales/SalesOrders').then(m => ({ default: m.SalesOrders })));

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Global command palette shortcut
  useShortcut(['ctrl', 'k'], () => setIsCommandPaletteOpen(true));
  useShortcut(['cmd', 'k'], () => setIsCommandPaletteOpen(true));

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster />
        <GlobalShortcutsModal />
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Auth Routes (Phase 4) */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/register/:inviteToken" element={<Register />} />
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/vendor/rfq/:id/bid" element={<VendorRFQBidPortal />} />

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
              <Route path="/assets/map" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}><AssetMap /></RoleGuard>} />



              {/* Inventory - All roles can view */}
              <Route path="/inventory" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}><Inventory /></RoleGuard>} />
              <Route path="/inventory/batches" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}><BatchTracker /></RoleGuard>} />
              <Route path="/inventory/valuation" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><InventoryValuation /></RoleGuard>} />
              <Route path="/inventory/stocktake" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}><Stocktake /></RoleGuard>} />
              <Route path="/inventory/transfer" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><InventoryTransfer /></RoleGuard>} />
              <Route path="/inventory/returns" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><InventoryReturns /></RoleGuard>} />
              <Route path="/inventory/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}><InventoryDetail /></RoleGuard>} />
              <Route path="/inventory/operations" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><StockOperations /></RoleGuard>} />

              {/* Maintenance - All roles can view (Tech can create, Managers approve) */}
              <Route path="/maintenance" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><Maintenance /></RoleGuard>} />
              <Route path="/maintenance/new" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><TicketWizard /></RoleGuard>} />
              <Route path="/maintenance/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><TicketDetails /></RoleGuard>} />
              <Route path="/maintenance/preventive" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PreventiveMaintenance /></RoleGuard>} />
              <Route path="/maintenance/analytics" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><MaintenanceAnalytics /></RoleGuard>} />
              <Route path="/maintenance/sla" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><SLADashboard /></RoleGuard>} />
              <Route path="/maintenance/calendar" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><MaintenanceCalendar /></RoleGuard>} />
              <Route path="/maintenance/gantt" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><MaintenanceGantt /></RoleGuard>} />
              <Route path="/maintenance/predictive" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><PredictiveDashboard /></RoleGuard>} />

              {/* AI Tools */}
              <Route path="/invoice-scanner" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><InvoiceScanner /></RoleGuard>} />

              {/* Technician Mode */}
              <Route path="/my-tickets" element={<RoleGuard allowedRoles={['TECHNICIAN']}><MyTickets /></RoleGuard>} />

              {/* QR Scan - Tech primarily */}
              <Route path="/scan" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><ScanQR /></RoleGuard>} />

              {/* Vendors - Managers + Viewer */}
              <Route path="/vendors" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}><VendorList /></RoleGuard>} />
              <Route path="/vendors/new" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><VendorForm /></RoleGuard>} />
              <Route path="/vendors/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}><VendorDetail /></RoleGuard>} />
              <Route path="/vendors/:id/edit" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><VendorForm /></RoleGuard>} />

              {/* Procurement */}
              <Route path="/procurement/requisitions" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PurchaseRequisitions /></RoleGuard>} />
              <Route path="/procurement/rfq" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><RFQList /></RoleGuard>} />
              <Route path="/procurement/rfq/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><RFQDetail /></RoleGuard>} />
              <Route path="/procurement/grn" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><GoodsReceipt /></RoleGuard>} />
              <Route path="/procurement/orders" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PurchaseOrderList /></RoleGuard>} />
              <Route path="/procurement/orders/new" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><CreatePO /></RoleGuard>} />
              <Route path="/procurement/orders/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PurchaseOrderDetail /></RoleGuard>} />

              {/* Procurement Redirects (for safety) */}
              <Route path="/procurement/vendors" element={<VendorList />} />
              <Route path="/procurement/vendors/new" element={<VendorForm />} />
              <Route path="/procurement/vendors/:id" element={<VendorDetail />} />
              {/* Purchase Orders - Managers only */}
              <Route path="/purchase-orders" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PurchaseOrderList /></RoleGuard>} />
              <Route path="/purchase-orders/new" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><CreatePO /></RoleGuard>} />
              <Route path="/purchase-orders/:id" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><PurchaseOrderDetail /></RoleGuard>} />

              {/* Financial - Managers + Viewer */}
              <Route path="/financial" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}><Financial /></RoleGuard>} />

              {/* CRM & Sales */}
              <Route path="/sales/customers" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><Customers /></RoleGuard>} />
              <Route path="/sales/quotations" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><Quotations /></RoleGuard>} />
              <Route path="/sales/orders" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><SalesOrders /></RoleGuard>} />

              {/* Phase 2 — GL, P&L, Cash Flow, Inventory Analytics */}
              <Route path="/gl" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><GLDashboard /></RoleGuard>} />
              <Route path="/balance-sheet" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><BalanceSheet /></RoleGuard>} />
              <Route path="/bank-reconciliation" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}><BankReconciliation /></RoleGuard>} />
              <Route path="/year-end-close" element={<RoleGuard allowedRoles={['SUPER_ADMIN']}><YearEndClose /></RoleGuard>} />
              <Route path="/expense-claims" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN']}><ExpenseClaims /></RoleGuard>} />
              <Route path="/profit-loss" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><ProfitLoss /></RoleGuard>} />
              <Route path="/cash-flow" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><CashFlow /></RoleGuard>} />
              <Route path="/inventory-analytics" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><InventoryAnalytics /></RoleGuard>} />

              <Route path="/finance/ap-aging" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><APAging /></RoleGuard>} />
              <Route path="/finance/ar-aging" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><ARAging /></RoleGuard>} />
              <Route path="/finance/working-capital" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER']}><WorkingCapital /></RoleGuard>} />
              <Route path="/finance/exception-center" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}><ExceptionCenter /></RoleGuard>} />

              {/* Analytics - Not for Technician */}
              <Route
                path="/analytics"
                element={
                  <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                    <Analytics />
                  </RoleGuard>
                }
              />

              <Route
                path="/reports"
                element={
                  <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']}>
                    <Reports />
                  </RoleGuard>
                }
              />

              {/* Notifications - Everyone */}
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notifications/preferences" element={<NotificationPreferences />} />

              {/* Documents */}
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/upload" element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']}>
                  <DocumentUpload />
                </RoleGuard>
              } />
              <Route path="/documents/:id" element={<DocumentViewer />} />

              {/* Profile & Settings */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/password" element={<ChangePassword />} />
              <Route path="/settings" element={
                <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                  <Settings />
                </RoleGuard>
              } />
              <Route path="/settings/workflows" element={
                <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <WorkflowBuilder />
                </RoleGuard>
              } />
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
              <Route
                path="/users/:id"
                element={
                  <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN', 'VIEWER']}>
                    <UserDetail />
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
              <Route
                path="/branches"
                element={
                  <RoleGuard allowedRoles={['SUPER_ADMIN', 'ADMIN', 'MANAGER']}>
                    <Offices />
                  </RoleGuard>
                }
              />

              {/* TODO: Add these routes as pages are created */}
              {/* <Route path="/financial" element={<RoleGuard allowedRoles={['SUPER_ADMIN', 'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'VIEWER']}><Financial /></RoleGuard>} /> */}
            </Route>

            {/* 404 — Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary >
  );
}

export default App;
