import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Globe2, ShieldCheck, UserCheck, Stethoscope, Tablet, Smartphone, LogOut } from 'lucide-react';

export default function GovHeader({ activeView, onViewChange, currentLang, onLangChange }) {
  const { hospitals, selectedHospitalId, selectHospital, staffUser, logoutStaff, patientData, logoutPatient } = useAuth();

  const currentHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  return (
    <header className="gov-header">
      <div className="gov-emblem-badge">
        <div className="gov-emblem-icon">
          <Building2 size={22} />
        </div>
        <div className="gov-title-group">
          <h1>{currentHospital?.name || 'District Civil & AYUSH Hospital'}</h1>
          <p>National Health Mission & Ministry of Ayush • OPD Smart Intake Portal</p>
        </div>
      </div>

      <div className="gov-header-actions">
        {/* Hospital Switcher for demo */}
        {hospitals.length > 1 && (
          <select 
            className="gov-input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)' }}
            value={selectedHospitalId}
            onChange={(e) => selectHospital(e.target.value)}
          >
            {hospitals.map(h => (
              <option key={h.id} value={h.id} style={{ color: '#000' }}>{h.name}</option>
            ))}
          </select>
        )}

        {/* Bilingual Selector (English / Hindi) */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 4px', borderRadius: '6px' }}>
          <button 
            className={`gov-btn gov-btn-sm ${currentLang === 'en' ? 'gov-btn-accent' : 'gov-btn-outline'}`}
            style={{ color: currentLang === 'en' ? '#FFF' : '#FFF', border: 'none', padding: '4px 8px' }}
            onClick={() => onLangChange && onLangChange('en')}
          >
            English
          </button>
          <button 
            className={`gov-btn gov-btn-sm ${currentLang === 'hi' ? 'gov-btn-accent' : 'gov-btn-outline'}`}
            style={{ color: currentLang === 'hi' ? '#FFF' : '#FFF', border: 'none', padding: '4px 8px' }}
            onClick={() => onLangChange && onLangChange('hi')}
          >
            हिन्दी
          </button>
        </div>

        {/* View Switcher Tabs (Proving 4 Separate Dedicated Bundles) */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#072458', padding: '3px', borderRadius: '8px' }}>
          <button 
            className={`role-pill-btn ${activeView === 'kiosk' ? 'active' : ''}`}
            style={{ color: activeView === 'kiosk' ? '#0B3D91' : '#CBD5E1', padding: '6px 10px', fontSize: '13px' }}
            onClick={() => onViewChange('kiosk')}
            title="Kiosk Bundle"
          >
            <Tablet size={16} /> Kiosk
          </button>
          <button 
            className={`role-pill-btn ${activeView === 'phone' ? 'active' : ''}`}
            style={{ color: activeView === 'phone' ? '#0B3D91' : '#CBD5E1', padding: '6px 10px', fontSize: '13px' }}
            onClick={() => onViewChange('phone')}
            title="Patient Phone PWA"
          >
            <Smartphone size={16} /> Patient Phone
          </button>
          <button 
            className={`role-pill-btn ${activeView === 'doctor' ? 'active' : ''}`}
            style={{ color: activeView === 'doctor' ? '#0B3D91' : '#CBD5E1', padding: '6px 10px', fontSize: '13px' }}
            onClick={() => onViewChange('doctor')}
            title="Doctor Consultation Suite"
          >
            <Stethoscope size={16} /> Doctor
          </button>
          <button 
            className={`role-pill-btn ${activeView === 'admin' ? 'active' : ''}`}
            style={{ color: activeView === 'admin' ? '#0B3D91' : '#CBD5E1', padding: '6px 10px', fontSize: '13px' }}
            onClick={() => onViewChange('admin')}
            title="Hospital & Super Admin"
          >
            <ShieldCheck size={16} /> Admin
          </button>
        </div>

        {staffUser && (
          <button 
            className="gov-btn gov-btn-sm gov-btn-outline" 
            style={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.4)' }}
            onClick={logoutStaff}
            title="Logout Staff"
          >
            <LogOut size={14} /> {staffUser.name.split(' ')[0]}
          </button>
        )}
      </div>
    </header>
  );
}
