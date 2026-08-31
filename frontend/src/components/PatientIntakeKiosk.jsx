import React, { useState } from 'react';
import VoiceTouchInterview from './VoiceTouchInterview';

export default function PatientIntakeKiosk() {
  const [abhaId, setAbhaId] = useState('');
  const [department, setDepartment] = useState('ayush');
  const [step, setStep] = useState('lookup'); // 'lookup' | 'interview' | 'complete'

  const handleStartInterview = (e) => {
    e.preventDefault();
    setStep('interview');
  };

  const handleInterviewComplete = (answers) => {
    console.log('Intake complete:', answers);
    setStep('complete');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
      {step === 'lookup' && (
        <div className="neo-card" style={{ padding: '40px', textAlign: 'center' }}>
          <span className="badge-tag" style={{ background: 'var(--sih-orange)', color: 'white', marginBottom: '15px' }}>
            PATIENT SELF-SERVICE KIOSK
          </span>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.5rem', marginTop: '10px' }}>
            ABHA / Aadhaar Patient Registration
          </h1>
          <p style={{ fontWeight: 600, color: '#555', marginBottom: '30px' }}>
            Enter your ABHA ID or Aadhaar number to begin your OPD voice/touch intake.
          </p>

          <form onSubmit={handleStartInterview} style={{ maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder="e.g. 91-8273-1029-4829 or Mobile"
              value={abhaId}
              onChange={(e) => setAbhaId(e.target.value)}
              style={{
                width: '100%',
                padding: '16px',
                border: '3.5px solid #000',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                marginBottom: '20px'
              }}
              required
            />

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '25px' }}>
              <button
                type="button"
                className={`neo-btn ${department === 'ayush' ? 'btn-green' : 'btn-yellow'}`}
                onClick={() => setDepartment('ayush')}
              >
                🌿 AYUSH / Ayurveda OPD
              </button>

              <button
                type="button"
                className={`neo-btn ${department === 'general' ? 'btn-blue' : 'btn-yellow'}`}
                onClick={() => setDepartment('general')}
              >
                🏥 General Medicine OPD
              </button>
            </div>

            <button type="submit" className="neo-btn btn-orange" style={{ width: '100%', fontSize: '1.2rem' }}>
              ▶️ Start Patient Case-Taking Interview
            </button>
          </form>
        </div>
      )}

      {step === 'interview' && (
        <VoiceTouchInterview
          department={department}
          onComplete={handleInterviewComplete}
        />
      )}

      {step === 'complete' && (
        <div className="neo-card" style={{ padding: '40px', textAlign: 'center', background: '#E6F9E6' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem' }}>
            Intake Completed Successfully!
          </h2>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '10px' }}>
            Your structured case history has been packaged into an EMR payload and queued for Doctor Review.
          </p>
          <button
            onClick={() => setStep('lookup')}
            className="neo-btn btn-orange"
            style={{ marginTop: '25px' }}
          >
            🔄 Start Next Patient Session
          </button>
        </div>
      )}
    </div>
  );
}
