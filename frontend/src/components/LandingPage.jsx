import React, { useState } from 'react';

export default function LandingPage({ onProceedToPrototype }) {
  const [activeModal, setActiveModal] = useState(null); // 'drive' | 'specs' | null

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px', textAlign: 'center' }}>
      {/* Hero Banner Box */}
      <div className="neo-card" style={{ padding: '40px 25px', background: '#FFFDF6', position: 'relative', overflow: 'hidden' }}>
        <span className="badge-tag" style={{ background: 'var(--neo-purple)', color: '#FFFFFF', marginBottom: '15px' }}>
          Smart India Hackathon 2026 • PS 047
        </span>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '3.5rem',
          fontWeight: 900,
          lineHeight: 1.1,
          textTransform: 'uppercase',
          margin: '15px 0'
        }}>
          MEDIKIOSK <br />
          <span style={{ background: 'var(--sih-orange)', color: '#FFF', padding: '2px 12px', border: '3px solid #000', display: 'inline-block', transform: 'rotate(-1deg)' }}>
            AYUSH & OPD
          </span>{' '}
          <span style={{ background: 'var(--sih-green)', color: '#FFF', padding: '2px 12px', border: '3px solid #000', display: 'inline-block', transform: 'rotate(1deg)' }}>
            AI INTAKE
          </span>
        </h1>

        <p style={{ fontSize: '1.2rem', maxWidth: '800px', margin: '20px auto', fontWeight: 600, color: '#222' }}>
          Next-generation OPD patient case-taking & clinical decision-support software. 
          Empowering patients with <strong>Voice + Touch intake in native code-switched Hindi-English</strong>, 
          Google Vision OCR document parsing, SOCRATES & AYUSH Dashavidha Pariksha trees, and a 30-second physician dashboard.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginTop: '25px' }}>
          <button onClick={onProceedToPrototype} className="neo-btn btn-orange" style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
            🚀 Proceed To Prototype
          </button>
          <button onClick={() => setActiveModal('drive')} className="neo-btn btn-blue" style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
            📁 Access Drive & Resources
          </button>
          <button onClick={() => setActiveModal('specs')} className="neo-btn btn-yellow" style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
            ⚡ Technical Specs
          </button>
        </div>
      </div>

      {/* Meta Pills Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '15px',
        margin: '30px 0'
      }}>
        <div className="neo-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#FFF' }}>
          <div style={{ fontSize: '1.8rem', background: 'var(--neo-yellow)', padding: '6px 12px', border: '2px solid #000', borderRadius: '8px' }}>🆔</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Problem Statement</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>PS 047 (AYUSH Kiosk)</div>
          </div>
        </div>

        <div className="neo-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#FFF' }}>
          <div style={{ fontSize: '1.8rem', background: 'var(--neo-yellow)', padding: '6px 12px', border: '2px solid #000', borderRadius: '8px' }}>👥</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Team Name</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>f society</div>
          </div>
        </div>

        <div className="neo-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#FFF' }}>
          <div style={{ fontSize: '1.8rem', background: 'var(--neo-yellow)', padding: '6px 12px', border: '2px solid #000', borderRadius: '8px' }}>🗣️</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Language AI</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>Hindi-English Code Switch</div>
          </div>
        </div>

        <div className="neo-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: '#FFF' }}>
          <div style={{ fontSize: '1.8rem', background: 'var(--neo-yellow)', padding: '6px 12px', border: '2px solid #000', borderRadius: '8px' }}>🏥</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Clinical Scope</div>
            <div style={{ fontWeight: 800, fontSize: '1rem' }}>AYUSH + General OPD</div>
          </div>
        </div>
      </div>

      {/* Safety Guarantee Banner */}
      <div className="neo-card" style={{ padding: '25px', background: '#FFE8D6', display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'left', marginBottom: '40px' }}>
        <div style={{ fontSize: '3rem', background: 'var(--sih-orange)', color: '#FFF', padding: '10px 16px', border: '3px solid #000', borderRadius: '10px' }}>🛡️</div>
        <div>
          <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: '4px' }}>Strict Clinical Safety Boundary</h3>
          <p style={{ fontWeight: 600, color: '#222' }}>
            <strong>No Autonomous AI Diagnosis:</strong> Per PS 047 guidelines, MediKiosk strictly acts as decision support. AI structures patient data, parses OCR, and alerts on red flags — the physician retains 100% diagnostic authority.
          </p>
        </div>
      </div>

      {/* Drive Modal */}
      {activeModal === 'drive' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="neo-card" style={{ padding: '30px', maxWidth: '500px', width: '90%', background: '#FFF', position: 'relative', textAlign: 'left' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--neo-pink)', color: '#FFF', border: '2px solid #000', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontWeight: 900 }}>✕</button>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.6rem', textTransform: 'uppercase', marginBottom: '15px' }}>📁 Project Resources & Drive</h3>
            
            <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="neo-btn btn-yellow" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '10px', textDecoration: 'none' }}>
              <span>📊 SIH 2026 Presentation PPTX</span> ↗
            </a>
            <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="neo-btn btn-green" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '10px', textDecoration: 'none' }}>
              <span>📑 Technical Analysis PDF Report</span> ↗
            </a>
            <a href="https://github.com/Shahpure15/medikiosk" target="_blank" rel="noreferrer" className="neo-btn btn-orange" style={{ width: '100%', justifyContent: 'space-between', textDecoration: 'none' }}>
              <span>💻 GitHub Source Repository</span> ↗
            </a>
          </div>
        </div>
      )}

      {/* Specs Modal */}
      {activeModal === 'specs' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="neo-card" style={{ padding: '30px', maxWidth: '600px', width: '90%', background: '#FFF', position: 'relative', textAlign: 'left' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--neo-pink)', color: '#FFF', border: '2px solid #000', borderRadius: '6px', cursor: 'pointer', padding: '4px 10px', fontWeight: 900 }}>✕</button>
            <h3 style={{ fontFamily: 'Space Grotesk', fontSize: '1.6rem', textTransform: 'uppercase', marginBottom: '15px' }}>⚡ Technical Specs (PS 047)</h3>
            <ul style={{ paddingLeft: '20px', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><strong>Frontend:</strong> React + Vite PWA (Hospital Tablet / Phone Installable)</li>
              <li><strong>Backend:</strong> Python FastAPI (Async STT/OCR routing + JSONB trees)</li>
              <li><strong>Database:</strong> PostgreSQL (ABHA records, dynamic permissions matrix)</li>
              <li><strong>AI Models:</strong> Hosted Whisper ASR API (Code-Switching) + Google Vision OCR</li>
              <li><strong>Auth & Security:</strong> JWT + Live Postgres permission checks</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
