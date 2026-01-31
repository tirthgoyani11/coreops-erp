import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Assets } from './pages/Assets';
import { Inventory } from './pages/Inventory';
import { Maintenance } from './pages/Maintenance';
import { useAuthStore } from './stores/authStore';
import './index.css';

import { Dashboard } from './pages/Dashboard';
// ... imports

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
          <Route path="/offices" element={<div className="p-10">Offices (Admin Only)</div>} />
          <Route path="/users" element={<div className="p-10">Users (Admin Only)</div>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
