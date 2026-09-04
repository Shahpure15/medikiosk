import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { api } from '../services/api';
import { 
  Smartphone, Phone, QrCode, CheckCircle2, AlertCircle, Clock, 
  Upload, FileText, ArrowRight, Bell, Sparkles, LogOut, History, ShieldAlert,
  Building2, RefreshCw, Volume2, Mic, MicOff, Printer, ShieldCheck
} from 'lucide-react';
import { speakText, startSpeechRecognition } from '../utils/speechHelper';
import OpdReceiptSlip from '../components/OpdReceiptSlip';
import AbhaCardModal from '../components/AbhaCardModal';
import '../styles/patient-phone.css';

export default function PatientPhoneView() {
  const { 
    hospitals, selectedHospitalId, selectHospital, patientToken, patientSession, patientData, 
    verifyPatientOtp, updatePatientSessionVerified, logoutPatient 
  } = useAuth();
  const { yourTurnEvent, subscribeToCase } = useWebSocket();

  // Screen: 'login' | 'intake' | 'presence_gate' | 'waiting' | 'history'
  const [screen, setScreen] = useState(patientToken ? 'waiting' : 'login');
  const [currentLang, setCurrentLang] = useState('en');

  // Phone Login State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Case & Intake
  const [caseData, setCaseData] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [isTerminal, setIsTerminal] = useState(false);
  const [activeToken, setActiveToken] = useState(null);

  // Kiosk Code Scan Input
  const [scanCode, setScanCode] = useState('');

  // History state
  const [historyCases, setHistoryCases] = useState([]);

  // Modals & Voice
  const [showReceiptSlip, setShowReceiptSlip] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  // Audio Speech TTS
  const handleSpeakQuestion = () => {
    if (!currentNode?.question) return;
    const textToSpeak = currentNode.question[currentLang] || currentNode.question.en;
    speakText(textToSpeak, currentLang);
  };

  // Real Speech Recognition
  const handleVoiceInput = () => {
    if (!currentNode || !currentNode.options) return;
    setIsRecording(true);
    setVoiceNotice('Listening to your voice...');

    const recognition = startSpeechRecognition({
      lang: currentLang,
      onResult: async (transcript) => {
        setVoiceNotice(`Heard: "${transcript}" — processing...`);

        try {
          const mapRes = await api.post('/intake/voice-map', {
            transcript,
            valid_options: currentNode.options,
            language: currentLang
          });

          if (mapRes.matched_option_id) {
            const matchedOpt = currentNode.options.find(o => o.id === mapRes.matched_option_id);
            setVoiceNotice(`Matched: "${matchedOpt?.label?.[currentLang] || matchedOpt?.label?.en}"`);
            setTimeout(() => {
              handleAnswer(mapRes.matched_option_id);
            }, 600);
          } else {
            setVoiceNotice('No match found. Please tap an option.');
            setIsRecording(false);
          }
        } catch (err) {
          setIsRecording(false);
          setVoiceNotice('Error processing voice.');
        }
      },
      onError: () => {
        setIsRecording(false);
        setVoiceNotice('Microphone error or permission denied.');
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });

    if (!recognition) {
      setIsRecording(false);
    }
  };

  // Document Upload
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Check URL query parameters (when scanned from Kiosk QR code)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qPhone = params.get('phone');
    const qToken = params.get('token');
    const qHosp = params.get('hospital');

    if (qHosp) selectHospital(qHosp);
    if (qPhone) setPhone(qPhone);

    if (qToken) {
      // Auto-load session from URL token
      loadSessionCase();
    } else if (patientToken && patientSession) {
      loadSessionCase();
    }
  }, [patientToken]);

  // Subscribe to WebSocket case room
  useEffect(() => {
    if (caseData?.id) {
      subscribeToCase(caseData.id);
    }
  }, [caseData?.id]);

  const loadSessionCase = async () => {
    try {
      const res = await api.get('/intake/session-case', patientToken);
      setCaseData(res.case);
      setCurrentNode(res.current_node);
      setIsTerminal(res.is_terminal);

      if (res.case?.status === 'ready_for_doctor' || res.case?.status === 'in_consult') {
        setScreen('waiting');
      } else if (res.is_terminal) {
        // Attempt completion
        const completeRes = await api.post('/intake/complete', { case_id: res.case.id }, patientToken);
        if (completeRes.status === 'presence_verification_required') {
          setScreen('presence_gate');
        } else {
          setActiveToken(completeRes.token);
          setScreen('waiting');
        }
      } else {
        setScreen('intake');
      }
    } catch (err) {
      console.log('No active session case');
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/patient/send-otp', {
        hospital_id: selectedHospitalId,
        phone
      });
      setOtpSent(true);
      setOtpNotice(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP received on SMS');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyPatientOtp(phone, otp, false, currentLang);
      setScreen('intake');
      loadSessionCase();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (optionId) => {
    if (!caseData || !currentNode) return;
    setLoading(true);
    try {
      const res = await api.post('/intake/answer', {
        case_id: caseData.id,
        question_id: currentNode.id,
        answer_text: optionId,
        answer_type: 'touch'
      }, patientToken);

      if (res.is_terminal) {
        setIsTerminal(true);
        setCurrentNode(res.next_node);

        const completeRes = await api.post('/intake/complete', { case_id: caseData.id }, patientToken);
        if (completeRes.status === 'presence_verification_required') {
          setScreen('presence_gate');
        } else if (completeRes.status === 'queued') {
          setActiveToken(completeRes.token);
          setScreen('waiting');
        }
      } else {
        setCurrentNode(res.next_node);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKioskPresence = async () => {
    if (!scanCode || scanCode.length < 3) {
      setError('Please enter the verification code displayed on the Kiosk');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/kiosk/verify-presence', { code: scanCode }, patientToken);
      updatePatientSessionVerified(true);
      if (res.queue_result?.token) {
        setActiveToken(res.queue_result.token);
      }
      setScreen('waiting');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !caseData) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('case_id', caseData.id);
    formData.append('doc_type', 'report');

    try {
      const res = await api.upload('/intake/upload-doc', formData, patientToken);
      setUploadedDocs(prev => [...prev, res.document]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/intake/patient-history', patientToken);
      setHistoryCases(res);
      setScreen('history');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="phone-pwa-container">
      {/* Mobile Top Bar */}
      <div className="phone-pwa-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={22} />
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px' }}>MediKiosk Mobile Companion</div>
            <div style={{ fontSize: '11px', opacity: 0.88 }}>Digital OPD Patient Portal</div>
          </div>
        </div>

        {patientToken && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="gov-btn gov-btn-sm" 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFF' }}
              onClick={loadHistory}
            >
              <History size={14} /> History
            </button>
            <button 
              className="gov-btn gov-btn-sm" 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFF' }}
              onClick={logoutPatient}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="phone-content">
        {error && (
          <div style={{ backgroundColor: 'var(--status-red-bg)', color: 'var(--status-red)', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {screen === 'login' && (
          <div>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <Phone size={44} color="var(--gov-primary)" style={{ margin: '0 auto 8px' }} />
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Patient Mobile Access</h2>
              <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                Enter your mobile number to start or resume your OPD visit.
              </p>
            </div>

            <div className="gov-input-group">
              <label>Mobile Number</label>
              <input 
                type="tel" 
                className="gov-input touch-target-lg"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                disabled={otpSent}
              />
            </div>

            {!otpSent ? (
              <button 
                className="gov-btn gov-btn-primary gov-btn-lg" 
                style={{ width: '100%', marginTop: '8px' }}
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
              >
                {loading ? 'Sending OTP via SMS...' : 'Send Verification OTP'}
              </button>
            ) : (
              <>
                {otpNotice && (
                  <div style={{ backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
                    ✓ {otpNotice}
                  </div>
                )}

                <div className="gov-input-group">
                  <label>Enter 6-Digit OTP from SMS</label>
                  <input 
                    type="text" 
                    className="gov-input touch-target-lg"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '24px', fontWeight: '800' }}
                  />
                </div>

                <button 
                  className="gov-btn gov-btn-accent gov-btn-lg" 
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Enter Portal'}
                </button>
              </>
            )}
          </div>
        )}

        {/* 2. INTAKE SCREEN */}
        {screen === 'intake' && currentNode && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="status-badge waiting" style={{ fontSize: '12px' }}>
                Question: {currentNode.id}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  onClick={handleSpeakQuestion}
                  title="Read question aloud (Audio TTS)"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '12px' }}
                >
                  <Volume2 size={13} color="var(--gov-accent)" />
                  <span>Listen</span>
                </button>
                <span style={{ fontSize: '12px', color: 'var(--gov-text-muted)', fontWeight: '600' }}>
                  Intake
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--gov-text-main)' }}>
              {currentNode.question?.[currentLang] || currentNode.question?.en}
            </h3>
            {currentNode.help_text && (
              <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', marginBottom: '18px' }}>
                {currentNode.help_text?.[currentLang] || currentNode.help_text?.en}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {currentNode.options?.map((opt) => (
                <button
                  key={opt.id}
                  className="gov-btn gov-btn-outline"
                  style={{ justifyContent: 'space-between', padding: '16px', textAlign: 'left', borderRadius: '12px', fontSize: '15px', fontWeight: '600' }}
                  onClick={() => handleAnswer(opt.id)}
                  disabled={loading}
                >
                  <span>{opt.label?.[currentLang] || opt.label?.en}</span>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>

            {/* Voice Input Button */}
            <div style={{ textAlign: 'center', marginBottom: '20px', padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '12px' }}>
              <button 
                className={`gov-btn ${isRecording ? 'gov-btn-accent' : 'gov-btn-primary'}`}
                style={{ borderRadius: '50px', padding: '10px 20px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleVoiceInput}
                disabled={isRecording || loading}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isRecording ? 'Listening in Hindi / English...' : 'Speak Answer (Voice Input)'}</span>
              </button>
              {voiceNotice && (
                <div style={{ fontSize: '12px', color: 'var(--gov-accent)', marginTop: '6px', fontWeight: '600' }}>
                  {voiceNotice}
                </div>
              )}
            </div>

            {/* Document Upload & OCR */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px dashed var(--gov-border-strong)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '700', fontSize: '13px', color: 'var(--gov-primary)' }}>
                <FileText size={18} />
                <span>Upload Past Prescriptions / Lab Reports</span>
              </div>
              <input type="file" onChange={handleFileUpload} style={{ fontSize: '12px', width: '100%' }} />
              {uploading && <div style={{ fontSize: '12px', color: 'var(--gov-accent)', marginTop: '6px', fontWeight: '600' }}>Extracting OCR text from document...</div>}
              {uploadedDocs.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--status-green)', marginTop: '6px', fontWeight: '600' }}>
                  ✓ {uploadedDocs.length} medical document(s) attached with clinical OCR
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. KIOSK PRESENCE VERIFICATION GATE */}
        {screen === 'presence_gate' && (
          <div className="presence-gate-card">
            <ShieldAlert size={48} color="#C2410C" style={{ margin: '0 auto 12px' }} />
            <h3>Hospital Physical Presence Required</h3>
            <p style={{ fontSize: '13px', color: '#7C2D12', marginBottom: '16px' }}>
              This hospital requires physical presence confirmation before entering the live OPD queue. Please scan the QR code on any hospital kiosk or type the 4-character code below.
            </p>

            <div className="gov-input-group" style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px' }}>Enter 4-Character Kiosk Code</label>
              <input 
                type="text" 
                className="gov-input touch-target-lg"
                placeholder="e.g. K-9842"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontSize: '20px', fontWeight: '900', letterSpacing: '2px' }}
              />
            </div>

            <button 
              className="gov-btn gov-btn-accent gov-btn-lg" 
              style={{ width: '100%', marginTop: '8px' }}
              onClick={handleVerifyKioskPresence}
              disabled={loading || scanCode.length < 3}
            >
              <CheckCircle2 size={18} /> Confirm Presence & Enter OPD Queue
            </button>
          </div>
        )}

        {/* 4. WAITING ROOM & LIVE WEBSOCKET CALL NOTIFICATION */}
        {screen === 'waiting' && (
          <div>
            {yourTurnEvent && (
              <div className="call-alert-box active-call">
                <Bell size={36} color="var(--status-green)" style={{ margin: '0 auto 6px' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--status-green)' }}>
                  IT IS YOUR TURN!
                </h3>
                <p style={{ fontSize: '16px', fontWeight: '800', margin: '6px 0', color: '#14532D' }}>
                  {yourTurnEvent.message}
                </p>
                <div style={{ fontSize: '14px', color: '#166534', fontWeight: '700' }}>
                  Please proceed to {yourTurnEvent.room_number}
                </div>
              </div>
            )}

            <div className="waiting-room-hero">
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                Live Digital Queue Pass
              </span>
              <div className="waiting-token-circle">
                <span className="token-num">#{activeToken?.token_number || '1'}</span>
                <span className="token-label">Token</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>
                {caseData?.department_name || 'OPD Consultation'}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.88, marginTop: '4px' }}>
                Status: {caseData?.status === 'in_consult' ? 'In Consultation with Doctor' : 'Waiting in Queue'}
              </div>
            </div>

            {/* Quick Action Bar for Token Slip & ABHA Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0' }}>
              <button 
                className="gov-btn gov-btn-outline" 
                style={{ fontSize: '13px', padding: '10px' }}
                onClick={() => setShowReceiptSlip(true)}
              >
                <Printer size={15} /> Print OPD Slip
              </button>
              <button 
                className="gov-btn gov-btn-outline" 
                style={{ fontSize: '13px', padding: '10px' }}
                onClick={() => setShowAbhaModal(true)}
              >
                <ShieldCheck size={15} color="var(--gov-accent)" /> My ABHA Card
              </button>
            </div>

            <div className="gov-card" style={{ padding: '20px', textAlign: 'center' }}>
              <Clock size={28} color="var(--gov-primary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: '800', fontSize: '15px' }}>Live Waiting Room Active</div>
              <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', marginTop: '4px' }}>
                Keep this page open. Your phone will immediately alert you with the doctor's room number when called.
              </p>
            </div>
          </div>
        )}

        {/* 5. HISTORY SCREEN */}
        {screen === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Past Visits & Prescriptions</h3>
              <button className="gov-btn gov-btn-outline gov-btn-sm" onClick={() => setScreen('waiting')}>
                Back
              </button>
            </div>

            {historyCases.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'var(--gov-text-muted)', textAlign: 'center', margin: '40px 0' }}>
                No completed past visits found for this phone number.
              </p>
            ) : (
              historyCases.map((c) => (
                <div key={c.id} className="rx-history-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--gov-primary)' }}>
                      {c.department_name || 'OPD Visit'}
                    </span>
                    <span className={`status-badge ${c.status}`} style={{ fontSize: '11px' }}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                    Complaint: {c.chief_complaint || 'General Checkup'}
                  </div>
                  {c.prescription_id && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--gov-border)', fontSize: '13px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--status-green)' }}>
                        ✓ Doctor Prescription Issued by {c.doctor_name || 'Medical Officer'}
                      </div>
                      {c.remarks && <div style={{ marginTop: '4px' }}>Advice: {c.remarks}</div>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* OPD Receipt Slip Modal */}
        {showReceiptSlip && (
          <OpdReceiptSlip 
            token={activeToken || { token_number: 1, room_number: 'Room 102 (AYUSH OPD)', department_name: caseData?.department_name }}
            hospitalName={hospitals.find(h => h.id === selectedHospitalId)?.name}
            onClose={() => setShowReceiptSlip(false)}
          />
        )}

        {/* ABHA Card Modal */}
        {showAbhaModal && (
          <AbhaCardModal 
            abhaId={patientData?.abha_id}
            patientPhone={phone}
            patientName={patientData?.name}
            onClose={() => setShowAbhaModal(false)}
          />
        )}
      </div>
    </div>
  );
}
