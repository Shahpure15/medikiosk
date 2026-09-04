import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import KioskView from './views/KioskView';
import PatientPhoneView from './views/PatientPhoneView';
import DoctorDashboardView from './views/DoctorDashboardView';
import AdminPortalView from './views/AdminPortalView';
import { Stethoscope, ShieldCheck, Tablet, Smartphone, Building2, Sparkles } from 'lucide-react';

// Portal Navigation Bar for standalone navigation
function PortalNav() {
  const location = useLocation();

  const isRouteActive = (paths) => {
    return paths.includes(location.pathname);
  };

  return (
    <footer style={{ backgroundColor: '#072458', color: '#94A3B8', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.12)', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building2 size={18} color="var(--gov-accent)" />
        <span style={{ fontWeight: '700', color: '#FFFFFF' }}>MediKiosk OPD Platform</span>
        <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
          SIH 2026 • PS 047
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Link 
          to="/" 
          style={{ 
            color: isRouteActive(['/', '/kiosk']) ? '#FFFFFF' : '#94A3B8', 
            backgroundColor: isRouteActive(['/', '/kiosk']) ? 'var(--gov-accent)' : 'transparent',
            padding: '6px 12px',
            borderRadius: '6px',
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: isRouteActive(['/', '/kiosk']) ? '800' : '600'
          }}
        >
          <Tablet size={15} /> Kiosk Terminal
        </Link>
        <Link 
          to="/intake" 
          style={{ 
            color: isRouteActive(['/intake', '/patient']) ? '#FFFFFF' : '#94A3B8', 
            backgroundColor: isRouteActive(['/intake', '/patient']) ? 'var(--gov-accent)' : 'transparent',
            padding: '6px 12px',
            borderRadius: '6px',
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: isRouteActive(['/intake', '/patient']) ? '800' : '600'
          }}
        >
          <Smartphone size={15} /> Patient Mobile App
        </Link>
        <Link 
          to="/doctor" 
          style={{ 
            color: isRouteActive(['/doctor']) ? '#FFFFFF' : '#94A3B8', 
            backgroundColor: isRouteActive(['/doctor']) ? 'var(--gov-accent)' : 'transparent',
            padding: '6px 12px',
            borderRadius: '6px',
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: isRouteActive(['/doctor']) ? '800' : '600'
          }}
        >
          <Stethoscope size={15} /> Doctor Portal
        </Link>
        <Link 
          to="/admin" 
          style={{ 
            color: isRouteActive(['/admin', '/superadmin']) ? '#FFFFFF' : '#94A3B8', 
            backgroundColor: isRouteActive(['/admin', '/superadmin']) ? 'var(--gov-accent)' : 'transparent',
            padding: '6px 12px',
            borderRadius: '6px',
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: isRouteActive(['/admin', '/superadmin']) ? '800' : '600'
          }}
        >
          <ShieldCheck size={15} /> Admin Portal
        </Link>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <Routes>
                {/* Kiosk Terminal (Default) */}
                <Route path="/" element={<KioskView />} />
                <Route path="/kiosk" element={<KioskView />} />

                {/* Patient Mobile Companion App (Scannable from Kiosk QR or Direct URL) */}
                <Route path="/intake" element={<PatientPhoneView />} />
                <Route path="/patient" element={<PatientPhoneView />} />

                {/* Dedicated Doctor Clinical Suite */}
                <Route path="/doctor" element={<DoctorDashboardView />} />

                {/* Dedicated Hospital Admin Portal */}
                <Route path="/admin" element={<AdminPortalView />} />
                <Route path="/superadmin" element={<AdminPortalView />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <PortalNav />
          </div>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}
