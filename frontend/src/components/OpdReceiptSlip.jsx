import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, CheckCircle2, Building2 } from 'lucide-react';

export default function OpdReceiptSlip({ token, hospitalName, onClose }) {
  if (!token) return null;

  const printSlip = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="gov-modal-overlay">
      <div className="gov-modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)' }}>
            Official OPD Queue Slip
          </h3>
          <button 
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gov-text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div 
          id="printable-opd-slip"
          style={{
            backgroundColor: '#FAFAFA',
            border: '2px dashed #94A3B8',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'monospace, "Noto Sans", sans-serif',
            color: '#0F172A'
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#475569' }}>
              Ministry of Health & Family Welfare / AYUSH
            </div>
            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--gov-primary)', marginTop: '4px' }}>
              {hospitalName || 'District Civil & AYUSH Hospital'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              National Health Mission • OPD e-Registration
            </div>
          </div>

          {/* Token Big Display */}
          <div style={{ margin: '14px 0', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '700', color: '#1E40AF' }}>
              OPD Token Number
            </div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--gov-primary)', lineHeight: 1.1 }}>
              #{token.token_number}
            </div>
            {token.priority && (
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#DC2626', marginTop: '4px' }}>
                ★ PRIORITY APPOINTMENT ★
              </div>
            )}
          </div>

          {/* Details Table */}
          <div style={{ textAlign: 'left', fontSize: '13px', margin: '12px 0', lineHeight: 1.7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Assigned Room:</span>
              <span style={{ fontWeight: '800', color: 'var(--gov-accent)' }}>{token.room_number || 'OPD Waiting Room'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Department:</span>
              <span style={{ fontWeight: '700' }}>{token.department_name || 'General OPD'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Date & Time:</span>
              <span style={{ fontWeight: '600' }}>{currentDate}, {currentTime}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Status:</span>
              <span style={{ fontWeight: '700', color: '#16A34A' }}>PRESENCE VERIFIED</span>
            </div>
          </div>

          {/* QR & Barcode Simulation */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #CBD5E1', paddingTop: '12px' }}>
            <QRCodeSVG 
              value={`TOKEN:${token.id || token.token_number}:${token.token_date || currentDate}`} 
              size={100}
              level="M"
              style={{ margin: '0 auto' }}
            />
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
              Scan at Doctor Desk / Pharmacy for verification
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button 
            className="gov-btn gov-btn-outline" 
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Close
          </button>
          <button 
            className="gov-btn gov-btn-primary" 
            style={{ flex: 1 }}
            onClick={printSlip}
          >
            <Printer size={16} /> Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}
