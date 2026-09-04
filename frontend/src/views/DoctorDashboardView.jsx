import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../services/api';
import { 
  Stethoscope, Users, UserCheck, Phone, CheckCircle2, 
  AlertCircle, Search, Plus, Trash2, Calendar, FileText, 
  Clock, ShieldAlert, ArrowRight, Activity, Pill, ArrowUpRight
} from 'lucide-react';
import '../styles/doctor.css';

export default function DoctorDashboardView() {
  const { staffUser, staffToken, loginStaff, logoutStaff } = useAuth();
  const { caseReadyEvent } = useWebSocket();

  // Login form if not logged in
  const [email, setEmail] = useState('dr.ananya@civildistrict.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Quick 1-Click Login
  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
    loginStaff(roleEmail, 'Password@123').catch(err => setAuthError(err.message));
  };

  // Queue state
  const [queue, setQueue] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [consultDetail, setConsultDetail] = useState(null);
  const [loadingConsult, setLoadingConsult] = useState(false);

  // Prescription Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [rxItems, setRxItems] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [nextCheckup, setNextCheckup] = useState('');
  const [savingRx, setSavingRx] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  // Fetch queue on mount & whenever caseReadyEvent arrives
  useEffect(() => {
    if (staffToken) {
      loadQueue();
    }
  }, [staffToken, caseReadyEvent]);

  // When selected token changes, fetch full consult card
  useEffect(() => {
    if (selectedToken && staffToken) {
      loadConsultDetail(selectedToken.case_id);
    }
  }, [selectedToken, staffToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      await loginStaff(email, password);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      const list = await api.get('/doctor/queue', staffToken);
      setQueue(list);
      if (list.length > 0 && !selectedToken) {
        setSelectedToken(list[0]);
      }
    } catch (err) {
      console.log('Error loading queue:', err.message);
    }
  };

  const loadConsultDetail = async (caseId) => {
    setLoadingConsult(true);
    try {
      const data = await api.get(`/doctor/cases/${caseId}/consult-card`, staffToken);
      setConsultDetail(data);
      // Reset rx builder items
      setRxItems([
        { medicine_id: '', medicine_name: 'Paracetamol 650mg (Dolo)', dosage: '1 tablet', frequency: '1-0-1', timing: 'after_food', duration_days: 3, notes: 'if fever persists' }
      ]);
    } catch (err) {
      console.log('Error consult detail:', err.message);
    } finally {
      setLoadingConsult(false);
    }
  };

  // Medicine Search with pg_trgm
  const handleMedicineSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const list = await api.get(`/doctor/medicines/search?q=${encodeURIComponent(val)}`, staffToken);
      setSearchResults(list);
    } catch (e) {}
  };

  const addMedicineToRx = (med) => {
    setRxItems(prev => [
      ...prev,
      {
        medicine_id: med.id,
        medicine_name: med.name,
        dosage: med.form === 'tablet' ? '1 tablet' : '10ml',
        frequency: '1-0-1',
        timing: 'after_food',
        duration_days: 5,
        notes: ''
      }
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeRxItem = (idx) => {
    setRxItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Queue Progression Actions
  const handleCall = async () => {
    if (!selectedToken) return;
    try {
      const res = await api.post(`/doctor/queue/${selectedToken.id}/call`, {}, staffToken);
      setSuccessNotice(`Patient #${selectedToken.token_number} called to your room!`);
      loadQueue();
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartConsult = async () => {
    if (!selectedToken) return;
    try {
      await api.post(`/doctor/queue/${selectedToken.id}/start-consult`, {}, staffToken);
      loadQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleNoShow = async () => {
    if (!selectedToken) return;
    if (confirm('Mark this patient as No-Show and advance queue?')) {
      try {
        await api.post(`/doctor/queue/${selectedToken.id}/no-show`, {}, staffToken);
        loadQueue();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSavePrescription = async () => {
    if (!selectedToken || rxItems.length === 0) return;
    setSavingRx(true);
    try {
      // Find actual medicine_ids from search or default paracetamol
      const itemsToSubmit = rxItems.map(item => ({
        medicine_id: item.medicine_id || '00000000-0000-0000-0000-000000000001',
        dosage: item.dosage,
        frequency: item.frequency,
        timing: item.timing,
        duration_days: parseInt(item.duration_days, 10) || 5,
        notes: item.notes
      }));

      await api.post('/doctor/prescriptions', {
        case_id: selectedToken.case_id,
        remarks,
        next_checkup_date: nextCheckup || null,
        items: itemsToSubmit
      }, staffToken);

      setSuccessNotice(`Prescription issued successfully! Case #${selectedToken.token_number} completed.`);
      setConsultDetail(null);
      setSelectedToken(null);
      loadQueue();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingRx(false);
    }
  };

  // If not logged in as staff, show clean login form
  if (!staffToken) {
    return (
      <div style={{ maxWidth: '520px', margin: '50px auto', padding: '0 16px' }}>
        <div className="gov-card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Stethoscope size={48} color="var(--gov-primary)" style={{ margin: '0 auto 8px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Doctor Clinical Login</h2>
            <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
              Medical Officer & Specialist Clinical Suite
            </p>
          </div>

          {authError && (
            <div style={{ backgroundColor: 'var(--status-red-bg)', color: 'var(--status-red)', padding: '10px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
              {authError}
            </div>
          )}

          {/* 1-Click Quick Demo Sign-in */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid var(--gov-border)', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ 1-Click Demo Sign-in:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                type="button" 
                className="gov-btn gov-btn-outline gov-btn-sm" 
                style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleQuickLogin('dr.ananya@civildistrict.gov.in')}
              >
                <div>
                  <div style={{ fontWeight: '700' }}>🌿 AYUSH Vaidya</div>
                  <div style={{ fontSize: '11px', color: 'var(--gov-text-muted)' }}>Room 102</div>
                </div>
                <ArrowUpRight size={14} color="var(--gov-accent)" />
              </button>
              <button 
                type="button" 
                className="gov-btn gov-btn-outline gov-btn-sm" 
                style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleQuickLogin('dr.vikram@civildistrict.gov.in')}
              >
                <div>
                  <div style={{ fontWeight: '700' }}>🩺 GenMed Officer</div>
                  <div style={{ fontSize: '11px', color: 'var(--gov-text-muted)' }}>Room 105</div>
                </div>
                <ArrowUpRight size={14} color="var(--gov-accent)" />
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="gov-input-group">
              <label>Doctor Email</label>
              <input 
                type="email" 
                className="gov-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="gov-input-group">
              <label>Password</label>
              <input 
                type="password" 
                className="gov-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="gov-btn gov-btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={authLoading}>
              {authLoading ? 'Authenticating...' : 'Sign In to Clinical Suite'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-layout">
      {/* 1. LEFT SIDEBAR: LIVE QUEUE */}
      <div className="queue-sidebar">
        <div className="queue-sidebar-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)' }}>
              Live OPD Queue ({queue.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--gov-text-muted)' }}>
              {staffUser?.name} • Room 102
            </span>
          </div>
          <button className="gov-btn gov-btn-outline gov-btn-sm" onClick={loadQueue} title="Refresh Queue">
            Refresh
          </button>
        </div>

        <div className="queue-list">
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gov-text-muted)', padding: '40px 16px', fontSize: '14px' }}>
              <Users size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div>No patients currently waiting in queue.</div>
            </div>
          ) : (
            queue.map(t => (
              <div 
                key={t.id}
                className={`queue-item-card ${selectedToken?.id === t.id ? 'selected' : ''} ${t.priority ? 'priority-card' : ''}`}
                onClick={() => setSelectedToken(t)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: '17px', color: 'var(--gov-primary)' }}>
                    #{t.token_number}
                  </span>
                  <span className={`status-badge ${t.status}`} style={{ fontSize: '11px' }}>
                    {t.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--gov-text-main)' }}>
                  {t.patient_name || 'Patient'} ({t.patient_age || 35}y / {t.patient_gender || 'M'})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginTop: '2px' }}>
                  {t.chief_complaint || 'General Checkup'}
                </div>

                {t.priority && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--status-red)', fontWeight: '700' }}>
                    ★ RSVP Priority Carry-Over
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: CONSULT CARD */}
      <div className="consult-workspace">
        {successNotice && (
          <div style={{ backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', padding: '12px 16px', borderRadius: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{successNotice}</span>
          </div>
        )}

        {selectedToken && consultDetail ? (
          <>
            {/* Patient Action Header */}
            <div className="patient-banner-bar">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--gov-primary)' }}>
                    {consultDetail.case?.patient_name}
                  </h2>
                  <span className="status-badge priority">Token #{selectedToken.token_number}</span>
                  <span className={`status-badge ${selectedToken.status}`}>{selectedToken.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--gov-text-muted)', marginTop: '4px' }}>
                  Age: {consultDetail.case?.patient_age} | Gender: {consultDetail.case?.patient_gender} | Phone: {consultDetail.case?.patient_phone} | ABHA: {consultDetail.case?.patient_abha_id || 'Not Linked'}
                </div>
              </div>

              {/* Consultation Lifecycle Actions */}
              <div className="doctor-actions-row">
                <button 
                  className="gov-btn gov-btn-outline"
                  onClick={handleCall}
                  disabled={selectedToken.status === 'in_consult'}
                  title="Notifies patient waiting room with room number"
                >
                  <Phone size={16} /> 1. Call Patient
                </button>

                <button 
                  className="gov-btn gov-btn-accent"
                  onClick={handleStartConsult}
                  disabled={selectedToken.status === 'in_consult'}
                >
                  <Activity size={16} /> 2. Start Consult
                </button>

                <button 
                  className="gov-btn gov-btn-outline"
                  style={{ color: 'var(--status-red)', borderColor: 'var(--status-red)' }}
                  onClick={handleNoShow}
                >
                  Mark No-Show
                </button>
              </div>
            </div>

            {/* Split Clinical Grid: Transcript & Rx Builder */}
            <div className="clinical-split-grid">
              {/* Left Column: Full Intake Walk & Documents OCR */}
              <div className="transcript-panel">
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} /> Intake Q&A Transcript
                </h3>

                {consultDetail.transcript?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>No intake questions recorded.</p>
                ) : (
                  consultDetail.transcript?.map((resp, i) => (
                    <div key={resp.id || i} className="qa-bubble">
                      <div className="qa-question">Q: {resp.question_id}</div>
                      <div className="qa-answer">{resp.answer_text}</div>
                      {resp.extracted_via_llm && (
                        <span style={{ fontSize: '11px', color: 'var(--gov-accent)', marginLeft: '8px', fontWeight: '600' }}>
                          (Voice Transcribed)
                        </span>
                      )}
                    </div>
                  ))
                )}

                {/* Attached Documents & OCR */}
                {consultDetail.documents?.length > 0 && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--gov-border)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--gov-text-main)' }}>
                      Attached Medical Documents ({consultDetail.documents.length})
                    </h4>
                    {consultDetail.documents.map((doc, idx) => (
                      <div key={idx} style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--gov-border)', fontSize: '12px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{doc.doc_type?.toUpperCase()}</div>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '11px', marginTop: '4px', color: 'var(--gov-text-muted)' }}>
                          {doc.ocr_text}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Prescription Builder */}
              <div className="rx-builder-panel">
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pill size={18} /> Digital Prescription Builder
                </h3>

                {/* pg_trgm Medicine Search Input */}
                <div className="gov-input-group" style={{ position: 'relative' }}>
                  <label>Search Allopathic & AYUSH Medicines (Fuzzy Search)</label>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <input 
                      type="text"
                      className="gov-input"
                      placeholder="Type medicine name (e.g. Paracetamol, Dolo, Ashwagandha, Liv.52)..."
                      value={searchQuery}
                      onChange={(e) => handleMedicineSearch(e.target.value)}
                    />
                    <Search size={18} style={{ position: 'absolute', right: '12px', color: 'var(--gov-text-muted)' }} />
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFFFFF', border: '1px solid var(--gov-border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map((m) => (
                        <div 
                          key={m.id} 
                          style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                          onClick={() => addMedicineToRx(m)}
                        >
                          <div>
                            <b>{m.name}</b> <span style={{ fontSize: '12px', color: 'var(--gov-text-muted)' }}>({m.form} - {m.strength})</span>
                          </div>
                          <Plus size={16} color="var(--gov-primary)" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Prescription Line Items Table */}
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Dosage</th>
                      <th>Frequency (Indian Shorthand)</th>
                      <th>Timing</th>
                      <th>Days</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rxItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{item.medicine_name}</td>
                        <td>
                          <input 
                            type="text" 
                            className="gov-input gov-btn-sm" 
                            value={item.dosage} 
                            onChange={(e) => {
                              const copy = [...rxItems];
                              copy[idx].dosage = e.target.value;
                              setRxItems(copy);
                            }}
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <div className="frequency-presets">
                            {['1-0-1', '1-1-1', '1-0-0', '0-0-1', 'SOS'].map(freq => (
                              <button 
                                key={freq}
                                type="button"
                                className={`freq-btn ${item.frequency === freq ? 'active' : ''}`}
                                onClick={() => {
                                  const copy = [...rxItems];
                                  copy[idx].frequency = freq;
                                  setRxItems(copy);
                                }}
                              >
                                {freq}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <select 
                            className="gov-input gov-btn-sm"
                            value={item.timing}
                            onChange={(e) => {
                              const copy = [...rxItems];
                              copy[idx].timing = e.target.value;
                              setRxItems(copy);
                            }}
                          >
                            <option value="after_food">After Food</option>
                            <option value="before_food">Before Food</option>
                            <option value="with_food">With Food</option>
                            <option value="anytime">Anytime</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number"
                            className="gov-input gov-btn-sm"
                            value={item.duration_days}
                            onChange={(e) => {
                              const copy = [...rxItems];
                              copy[idx].duration_days = e.target.value;
                              setRxItems(copy);
                            }}
                            style={{ width: '55px' }}
                          />
                        </td>
                        <td>
                          <button 
                            type="button" 
                            onClick={() => removeRxItem(idx)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--status-red)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Clinical Remarks & Next Checkup Date */}
                <div className="grid-2" style={{ marginTop: '12px' }}>
                  <div className="gov-input-group">
                    <label>Clinical Advice / Remarks</label>
                    <textarea 
                      className="gov-input"
                      rows={2}
                      placeholder="e.g. Avoid cold items, take steam inhalation twice daily..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                  <div className="gov-input-group">
                    <label>Next Checkup Date (Optional)</label>
                    <input 
                      type="date"
                      className="gov-input"
                      value={nextCheckup}
                      onChange={(e) => setNextCheckup(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  className="gov-btn gov-btn-primary gov-btn-lg"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={handleSavePrescription}
                  disabled={savingRx || rxItems.length === 0}
                >
                  <CheckCircle2 size={20} /> {savingRx ? 'Saving...' : 'Issue Prescription & Complete Visit'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--gov-text-muted)' }}>
            <Activity size={56} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Select a patient from the queue to start consultation</h3>
          </div>
        )}
      </div>
    </div>
  );
}
