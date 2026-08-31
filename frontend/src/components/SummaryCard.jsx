import React, { useState } from 'react';

export default function SummaryCard({ summary }) {
  const [sections, setSections] = useState({
    complaints: 'accepted',
    ayush: 'accepted',
    medicines: 'accepted',
    allergies: 'accepted'
  });

  const toggleSection = (sec) => {
    const states = ['accepted', 'edited', 'rejected'];
    const currentIdx = states.indexOf(sections[sec]);
    const nextState = states[(currentIdx + 1) % states.length];
    setSections({ ...sections, [sec]: nextState });
  };

  const getStateBadge = (st) => {
    if (st === 'accepted') return <span className="badge-tag" style={{ background: '#00FF66' }}>✅ ACCEPTED</span>;
    if (st === 'edited') return <span className="badge-tag" style={{ background: 'var(--neo-yellow)' }}>✏️ EDITED</span>;
    return <span className="badge-tag" style={{ background: '#FF4785', color: 'white' }}>❌ REJECTED</span>;
  };

  return (
    <div className="neo-card" style={{ padding: '30px', background: '#FFFDF6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <span className="badge-tag" style={{ background: 'var(--sih-blue)', color: 'white' }}>
            30-SECOND OVERVIEW CARD
          </span>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginTop: '5px' }}>
            {summary.patient_name}
          </h2>
        </div>

        <button className="neo-btn btn-green" onClick={() => alert("Summary Signed & Pushed to ABDM / Hospital EMR!")}>
          💾 Confirm & Save to EMR
        </button>
      </div>

      {/* Red Flags Section */}
      {summary.red_flags && summary.red_flags.length > 0 && (
        <div style={{
          background: '#FFE8D6',
          border: '3px solid #000',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#D90429', fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.1rem' }}>
            🚨 RED FLAGS DETECTED
          </h4>
          <ul style={{ paddingLeft: '20px', marginTop: '5px', fontWeight: 700 }}>
            {summary.red_flags.map((rf, idx) => (
              <li key={idx}>{rf.warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 1: Complaints */}
      <div style={{ border: '2px solid #000', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem' }}>1. Current Complaints & SOCRATES Probing</h4>
          <button className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => toggleSection('complaints')}>
            Toggle Approval: {getStateBadge(sections.complaints)}
          </button>
        </div>
        <ul style={{ paddingLeft: '20px', fontWeight: 600 }}>
          {summary.current_complaints.map((c, idx) => <li key={idx}>{c}</li>)}
        </ul>
      </div>

      {/* Section 2: AYUSH Constitution */}
      <div style={{ border: '2px solid #000', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem' }}>2. AYUSH Dashavidha Pariksha Profile</h4>
          <button className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => toggleSection('ayush')}>
            Toggle Approval: {getStateBadge(sections.ayush)}
          </button>
        </div>
        <p style={{ fontWeight: 600 }}>
          <strong>Prakriti:</strong> {summary.ayush_profile.prakriti} | <strong>Agni:</strong> {summary.ayush_profile.agni}
        </p>
        <p style={{ fontSize: '0.95rem', color: '#555' }}>
          <strong>Ahara-Vihara:</strong> {summary.ayush_profile.lifestyle}
        </p>
      </div>

      {/* Section 3: Extracted Medicines & OCR */}
      <div style={{ border: '2px solid #000', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem' }}>3. Extracted Medications & OCR Findings</h4>
          <button className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => toggleSection('medicines')}>
            Toggle Approval: {getStateBadge(sections.medicines)}
          </button>
        </div>
        <ul style={{ paddingLeft: '20px', fontWeight: 600 }}>
          {summary.extracted_medicines.map((m, idx) => (
            <li key={idx}>
              {m.name} — <span className="badge-tag" style={{ background: 'var(--neo-yellow)' }}>Confidence: {(m.confidence * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 4: Allergies */}
      <div style={{ border: '2px solid #000', padding: '15px', borderRadius: '8px', background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem' }}>4. Reported Allergies & Conflicts</h4>
          <button className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => toggleSection('allergies')}>
            Toggle Approval: {getStateBadge(sections.allergies)}
          </button>
        </div>
        <p style={{ fontWeight: 700, color: 'var(--sih-orange)' }}>
          {summary.allergies.join(', ')}
        </p>
      </div>
    </div>
  );
}
