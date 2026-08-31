import React from 'react';

export default function Navbar({ activeTab = 'landing', setActiveTab = () => {} }) {
  const getBtnClass = (tabName, activeColorClass) => {
    return `neo-btn ${activeTab === tabName ? activeColorClass : 'btn-yellow'}`;
  };

  return (
    <header
      style={{
        background: '#FFFFFF',
        borderBottom: '3.5px solid #000000',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo & Tag Section */}
      <div
        onClick={() => setActiveTab('landing')}
        style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900,
            fontSize: '1.5rem',
            background: 'var(--neo-yellow, #FFE600)',
            padding: '4px 14px',
            border: '3px solid #000000',
            boxShadow: '3px 3px 0px #000000',
            borderRadius: '8px',
            color: '#000000',
          }}
        >
          f_society
        </div>
        <span
          className="badge-tag"
          style={{
            background: 'var(--sih-orange, #FF6600)',
            color: '#FFFFFF',
          }}
        >
          SIH 2026 • PS 047
        </span>
      </div>

      {/* Navigation Buttons */}
      <nav style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className={getBtnClass('landing', 'btn-orange')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          🏠 Pitch & Landing Page
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          className={getBtnClass('intake', 'btn-orange')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          🎙️ Patient Intake Kiosk
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ocr')}
          className={getBtnClass('ocr', 'btn-orange')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          📄 Document OCR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doctor')}
          className={getBtnClass('doctor', 'btn-blue')}
          style={{ padding: '8px 16px', fontSize: '0.9rem' }}
        >
          👨‍⚕️ Doctor Dashboard
        </button>
      </nav>
    </header>
  );
}
