import React from 'react';

export default function TriageAlertBanner({ alert }) {
  if (!alert) return null;

  return (
    <div style={{
      background: '#FF4785',
      color: '#FFFFFF',
      border: '3.5px solid #000000',
      boxShadow: '5px 5px 0px #000000',
      borderRadius: '10px',
      padding: '16px 24px',
      margin: '20px auto',
      maxWidth: '1100px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      <div style={{
        fontSize: '2rem',
        background: '#000000',
        padding: '8px',
        borderRadius: '8px',
        border: '2px solid #FFFFFF'
      }}>
        🚨
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem', textTransform: 'uppercase' }}>
          RED-FLAG TRIAGE ALERT: HIGH PRIORITY PATIENT
        </h4>
        <p style={{ fontWeight: 600 }}>
          {alert.message || "Chest Pain / Severe Dyspnea detected in Voice Intake. Patient elevated to Immediate Physician Review Queue."}
        </p>
      </div>
      <span className="badge-tag" style={{ background: '#000000', color: '#00FF66' }}>
        BYPASS ROUTINE QUEUE
      </span>
    </div>
  );
}
