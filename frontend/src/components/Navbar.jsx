import React from 'react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '3.5px solid #000000',
      padding: '15px 30px',
      display: 'flex',
      justify-content: 'space-between',
      align-items: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          fontFamily: 'Space Grotesk',
          fontWeight: 900,
          fontSize: '1.5rem',
          background: 'var(--neo-yellow)',
          padding: '4px 14px',
          border: '3px solid #000',
          boxShadow: '3px 3px 0px #000',
          borderRadius: '8px'
        }}>
          f_society
        </div>
        <span className="badge-tag" style={{ background: 'var(--sih-orange)', color: 'white' }}>
          SIH 2026 • PS 047
        </span>
      </div>

      <nav style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('intake')}
          className={`neo-btn ${activeTab === 'intake' ? 'btn-orange' : 'btn-yellow'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          🎙️ Patient Intake Kiosk
        </button>

        <button
          onClick={() => setActiveTab('ocr')}
          className={`neo-btn ${activeTab === 'ocr' ? 'btn-orange' : 'btn-yellow'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          📄 Document OCR
        </button>

        <button
          onClick={() => setActiveTab('doctor')}
          className={`neo-btn ${activeTab === 'doctor' ? 'btn-blue' : 'btn-yellow'}`}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          👨‍⚕️ Doctor Dashboard (30-Sec)
        </button>
      </nav>
    </header>
  );
}
