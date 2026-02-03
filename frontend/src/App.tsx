import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { RoleGuard } from './components/layout/RoleGuard';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Assets } from './pages/Assets';
import { Inventory } from './pages/Inventory';
import { Maintenance } from './pages/Maintenance';
import { Offices } from './pages/Offices';
import { Users } from './pages/Users';
import { Vendors } from './pages/Vendors';
import { Analytics } from './pages/Analytics';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Notifications } from './pages/Notifications';
import { useAuthStore } from './stores/authStore';
import './index.css';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Admin-only routes with RBAC protection */}
          <Route
            path="/offices"
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                <Offices />
              </RoleGuard>
            }
          />
          <Route
            path="/users"
            element={
              <RoleGuard allowedRoles={['SUPER_ADMIN']}>
                <Users />
              </RoleGuard>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

