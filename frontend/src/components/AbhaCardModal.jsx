import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, X, Download, Building2, CheckCircle2 } from 'lucide-react';

export default function AbhaCardModal({ abhaId, patientName, patientPhone, onClose }) {
  const displayAbhaNumber = abhaId || '91-8844-3322-1100';
  const displayAbhaAddress = `${patientPhone || 'user'}@abdm`;

  return (
    <div className="gov-modal-overlay">
      <div className="gov-modal-content" style={{ maxWidth: '460px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} color="var(--gov-accent)" />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gov-primary)' }}>
              Ayushman Bharat Digital Health Card
            </h3>
          </div>
          <button 
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gov-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Official ABHA Card Layout */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #0B3D91 0%, #1E3A8A 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(11, 61, 145, 0.3)',
            overflow: 'hidden'
          }}
        >
          {/* Top National Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                National Health Authority (NHA)
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>
                ABHA • आयुष्मान भारत
              </div>
            </div>
            <div style={{ backgroundColor: '#E65100', color: '#FFF', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
              ACTIVE
            </div>
          </div>

          {/* Card Body */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0' }}>
            <div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>Patient Name / लाभार्थी का नाम</div>
              <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>
                {patientName || 'Verified Citizen'}
              </div>

              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '10px' }}>ABHA Number / आभा संख्या</div>
              <div style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '1.5px', color: '#FDBA74' }}>
                {displayAbhaNumber}
              </div>

              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '8px' }}>ABHA Address / आभा पता</div>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>
                {displayAbhaAddress}
              </div>
            </div>

            {/* QR Code */}
            <div style={{ backgroundColor: '#FFFFFF', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeSVG 
                value={`ABHA:${displayAbhaNumber}:${displayAbhaAddress}`}
                size={80}
                level="M"
              />
            </div>
          </div>

          {/* Card Footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.85 }}>
            <span>Ayushman Bharat Digital Mission (ABDM)</span>
            <span>Ministry of Health & Family Welfare</span>
          </div>
        </div>

        {/* Details & Actions */}
        <div style={{ marginTop: '16px', backgroundColor: 'var(--gov-primary-light)', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', color: 'var(--gov-primary)' }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', color: 'var(--status-green)' }} />
          This ABHA ID is linked to your hospital clinical encounters, prescriptions, and lab reports across visits.
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="gov-btn gov-btn-outline" style={{ flex: 1 }} onClick={onClose}>
            Close
          </button>
          <button className="gov-btn gov-btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
            <Download size={16} /> Print / Save Card
          </button>
        </div>
      </div>
    </div>
  );
}
