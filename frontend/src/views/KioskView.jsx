import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Tablet, Mic, MicOff, ArrowRight, CheckCircle2, QrCode, 
  User, Phone, FileText, RefreshCw, AlertCircle, HeartPulse, 
  Smartphone, Sparkles, Building2, Volume2, Printer, ShieldCheck
} from 'lucide-react';
import { speakText, startSpeechRecognition } from '../utils/speechHelper';
import OpdReceiptSlip from '../components/OpdReceiptSlip';
import AbhaCardModal from '../components/AbhaCardModal';
import '../styles/kiosk.css';

export default function KioskView() {
  const { hospitals, selectedHospitalId, selectHospital, verifyPatientOtp, patientToken, patientSession, logoutPatient } = useAuth();

  // Kiosk States: 'idle' | 'phone_otp' | 'post_otp_choice' | 'phone_qr_display' | 'kiosk_presence_qr' | 'abha' | 'dept_select' | 'intake' | 'completed'
  const [step, setStep] = useState('idle');
  const [currentLang, setCurrentLang] = useState('en');

  // Form Inputs
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [abhaId, setAbhaId] = useState('');
  const [sessionToken, setSessionToken] = useState(null);

  // Intake State Machine
  const [caseData, setCaseData] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [isTerminal, setIsTerminal] = useState(false);
  const [responses, setResponses] = useState([]);
  const [issuedToken, setIssuedToken] = useState(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');

  // Kiosk Presence QR Verification Code
  const [kioskVerification, setKioskVerification] = useState(null);

  const currentHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  // Translations
  const t = {
    en: {
      welcome: "Welcome to OPD Smart Kiosk",
      sub: "Touch to begin your clinical check-in or verify your session",
      start_btn: "Start New Patient Visit",
      verify_btn: "Verify My Mobile Session (Scan Presence QR)",
      enter_phone: "Enter Mobile Number",
      send_otp: "Send Verification OTP",
      verify_otp: "Verify OTP & Continue",
      choice_title: "How would you like to complete your intake?",
      choice_kiosk: "Continue on this Kiosk Screen",
      choice_kiosk_desc: "Answer symptom questions on this touch terminal",
      choice_phone: "Continue on My Personal Phone",
      choice_phone_desc: "Scan QR with your phone camera or Google Lens",
      scan_phone_title: "Scan to Continue on Your Phone",
      scan_phone_sub: "Point your phone camera or Google Lens at this QR code to open your session securely.",
      abha_title: "Link ABHA / Ayushman Bharat ID",
      abha_sub: "Optional — Helps maintain unified health records",
      abha_skip: "Skip for now",
      abha_save: "Continue to Clinical Intake",
      dept_title: "Select Department (Optional)",
      dept_sub: "Choose a specialty, or let our automated triage route you",
      dept_skip: "Skip & Auto-Route Based on My Symptoms",
      voice_prompt: "Speak your answer or tap an option below",
      voice_record: "Press to Speak Answer (Whisper AI)",
      voice_listening: "Listening in Hindi / English...",
      intake_done: "Intake Successfully Completed!",
      token_issued: "Your Token Number:",
      proceed_msg: "Please take a seat in the waiting lounge. You will be called shortly on the display screen."
    },
    hi: {
      welcome: "ओपीडी स्मार्ट कियोस्क में आपका स्वागत है",
      sub: "पंजीकरण शुरू करने या सत्र सत्यापित करने के लिए स्पर्श करें",
      start_btn: "नया मरीज पंजीकरण शुरू करें",
      verify_btn: "मोबाइल सत्र सत्यापित करें (QR स्कैन)",
      enter_phone: "मोबाइल नंबर दर्ज करें",
      send_otp: "ओटीपी भेजें (SMS)",
      verify_otp: "ओटीपी सत्यापित करें",
      choice_title: "आप अपना विवरण कैसे भरना चाहते हैं?",
      choice_kiosk: "इसी कियोस्क स्क्रीन पर जारी रखें",
      choice_kiosk_desc: "टच स्क्रीन पर सीधे लक्षण प्रश्नों के उत्तर दें",
      choice_phone: "अपने मोबाइल फ़ोन पर जारी रखें",
      choice_phone_desc: "गूगल लेंस या कैमरे से QR स्कैन करें",
      scan_phone_title: "मोबाइल पर जारी रखने के लिए स्कैन करें",
      scan_phone_sub: "अपने फ़ोन कैमरे या गूगल लेंस से इस QR कोड को स्कैन करें।",
      abha_title: "आभा (ABHA) आईडी दर्ज करें",
      abha_sub: "वैकल्पिक — स्वास्थ्य रिकॉर्ड सुरक्षित रखने हेतु",
      abha_skip: "आगे बढ़ें (छोड़ें)",
      abha_save: "लक्षण जांच शुरू करें",
      dept_title: "विभाग का चयन करें (वैकल्पिक)",
      dept_sub: "विशेषज्ञता चुनें या स्वचालित ट्रायज की सहायता लें",
      dept_skip: "छोड़ें और लक्षणों के आधार पर तय करें",
      voice_prompt: "बोलकर उत्तर दें या नीचे से विकल्प चुनें",
      voice_record: "बोलने के लिए दबाएं (व्हिस्पर एआई)",
      voice_listening: "सुन रहे हैं...",
      intake_done: "पंजीकरण सफलतापूर्वक पूरा हुआ!",
      token_issued: "आपका टोकन नंबर:",
      proceed_msg: "कृपया प्रतीक्षालय में बैठें। जल्द ही डिस्प्ले पर आपका नंबर पुकारा जाएगा।"
    }
  }[currentLang] || t['en'];

  // Handle Send Real OTP
  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
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
      if (res.debug_otp) {
        console.log(`[MediKiosk OTP for +91-${phone}]: ${res.debug_otp}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify Real OTP
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit OTP received on your phone');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await verifyPatientOtp(phone, otp, true, currentLang); // isKiosk = true
      setSessionToken(res.session_token);
      setStep('post_otp_choice'); // Give choice: Continue on Kiosk vs Continue on Phone
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start Case Flow on Kiosk
  const startIntakeOnKiosk = async (deptId = null) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/intake/session-case${deptId ? `?department_id=${deptId}` : ''}`, patientToken);
      setCaseData(res.case);
      setCurrentNode(res.current_node);
      setIsTerminal(res.is_terminal);
      setResponses(res.responses || []);
      setStep('intake');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer to Node
  const handleAnswer = async (optionId, isVoice = false) => {
    if (!caseData || !currentNode) return;
    setLoading(true);
    try {
      const res = await api.post('/intake/answer', {
        case_id: caseData.id,
        question_id: currentNode.id,
        answer_text: optionId,
        answer_type: isVoice ? 'voice' : 'touch',
        extracted_via_llm: isVoice
      }, patientToken);

      if (res.is_terminal) {
        setIsTerminal(true);
        setCurrentNode(res.next_node);
        const completeRes = await api.post('/intake/complete', { case_id: caseData.id }, patientToken);
        if (completeRes.status === 'queued') {
          setIssuedToken(completeRes.token);
          setStep('completed');
        }
      } else {
        setCurrentNode(res.next_node);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRecording(false);
      setVoiceNotice('');
    }
  };

  // Modal states
  const [showReceiptSlip, setShowReceiptSlip] = useState(false);
  const [showAbhaModal, setShowAbhaModal] = useState(false);

  // Audio Speech TTS
  const handleSpeakQuestion = () => {
    if (!currentNode?.question) return;
    const textToSpeak = currentNode.question[currentLang] || currentNode.question.en;
    speakText(textToSpeak, currentLang);
  };

  // Real Speech Recognition + Fallback to Constrained Option Mapping
  const handleVoiceInput = () => {
    if (!currentNode || !currentNode.options) return;
    setIsRecording(true);
    setVoiceNotice('Listening to your voice...');

    const recognition = startSpeechRecognition({
      lang: currentLang,
      onResult: async (transcript) => {
        setVoiceTranscript(transcript);
        setVoiceNotice(`Heard: "${transcript}" — processing...`);

        try {
          const mapRes = await api.post('/intake/voice-map', {
            transcript,
            valid_options: currentNode.options,
            language: currentLang
          });

          if (mapRes.matched_option_id) {
            const matchedOpt = currentNode.options.find(o => o.id === mapRes.matched_option_id);
            setVoiceNotice(`Matched: "${matchedOpt?.label?.[currentLang] || matchedOpt?.label?.en}" (${Math.round(mapRes.confidence * 100)}% match)`);
            setTimeout(() => {
              handleAnswer(mapRes.matched_option_id, true);
            }, 600);
          } else {
            setVoiceNotice('Could not find direct match. Please tap an option below.');
            setIsRecording(false);
          }
        } catch (err) {
          setIsRecording(false);
          setVoiceNotice('Error processing voice. Please tap an option.');
        }
      },
      onError: (err) => {
        console.warn('Speech recognition error, falling back to simulated prompt:', err);
        // Fallback simulation
        triggerVoiceSimulation();
      },
      onEnd: () => {
        setIsRecording(false);
      }
    });

    if (!recognition) {
      triggerVoiceSimulation();
    }
  };

  // Fallback Voice simulation for browsers without mic permission
  const triggerVoiceSimulation = async () => {
    if (!currentNode || !currentNode.options) return;
    setIsRecording(true);
    setVoiceNotice('Listening to speech in Hindi / English...');

    setTimeout(async () => {
      const sampleOption = currentNode.options[0];
      const spokenTranscript = `I am feeling ${sampleOption.label.en}`;
      setVoiceTranscript(spokenTranscript);

      try {
        const mapRes = await api.post('/intake/voice-map', {
          transcript: spokenTranscript,
          valid_options: currentNode.options,
          language: currentLang
        });

        if (mapRes.matched_option_id) {
          setVoiceNotice(`Matched: "${sampleOption.label[currentLang] || sampleOption.label.en}" (${Math.round(mapRes.confidence * 100)}% confidence)`);
          setTimeout(() => {
            handleAnswer(mapRes.matched_option_id, true);
          }, 600);
        } else {
          setVoiceNotice(mapRes.message || 'Please tap your choice manually.');
          setIsRecording(false);
        }
      } catch (err) {
        setIsRecording(false);
      }
    }, 1500);
  };

  // Generate Kiosk Presence QR for remote phone users
  const openKioskPresenceQR = async () => {
    setLoading(true);
    try {
      const res = await api.post('/kiosk/verification-code', {
        hospital_id: selectedHospitalId
      });
      setKioskVerification(res);
      setStep('kiosk_presence_qr');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetKiosk = () => {
    logoutPatient();
    setStep('idle');
    setPhone('');
    setOtp('');
    setOtpSent(false);
    setOtpNotice(null);
    setCaseData(null);
    setCurrentNode(null);
    setIssuedToken(null);
    setError(null);
  };

  // Compute scannable Phone Intake URL
  const mobileIntakeUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}/intake?phone=${encodeURIComponent(phone)}&token=${encodeURIComponent(sessionToken || '')}&hospital=${encodeURIComponent(selectedHospitalId)}`
    : '';

  return (
    <div className="kiosk-container">
      {/* Top Kiosk Banner */}
      <div style={{ backgroundColor: 'var(--gov-primary)', color: '#FFF', padding: '16px 24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Building2 size={32} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{currentHospital?.name || 'District Civil & AYUSH Hospital'}</h2>
            <p style={{ fontSize: '12px', opacity: 0.88 }}>OPD Smart Kiosk Terminal #1 • National Health Mission & Ministry of Ayush</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bilingual Switcher */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 4px', borderRadius: '6px' }}>
            <button 
              className={`gov-btn gov-btn-sm ${currentLang === 'en' ? 'gov-btn-accent' : 'gov-btn-outline'}`}
              style={{ color: '#FFF', border: 'none' }}
              onClick={() => setCurrentLang('en')}
            >
              English
            </button>
            <button 
              className={`gov-btn gov-btn-sm ${currentLang === 'hi' ? 'gov-btn-accent' : 'gov-btn-outline'}`}
              style={{ color: '#FFF', border: 'none' }}
              onClick={() => setCurrentLang('hi')}
            >
              हिन्दी
            </button>
          </div>

          {step !== 'idle' && (
            <button className="gov-btn gov-btn-outline gov-btn-sm" style={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.4)' }} onClick={resetKiosk}>
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--status-red-bg)', color: 'var(--status-red)', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. IDLE STATE */}
      {step === 'idle' && (
        <div className="kiosk-idle-hero">
          <HeartPulse size={64} color="var(--gov-accent)" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gov-primary)', marginBottom: '8px' }}>
            {t.welcome}
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--gov-text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            {t.sub}
          </p>

          <div className="kiosk-action-cards">
            <div className="kiosk-card-btn primary" onClick={() => setStep('phone_otp')}>
              <User size={44} />
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>{t.start_btn}</h3>
                <p style={{ opacity: 0.9, fontSize: '14px' }}>Fast symptom intake & instant doctor queue token</p>
              </div>
            </div>

            <div className="kiosk-card-btn" onClick={openKioskPresenceQR}>
              <QrCode size={44} color="var(--gov-accent)" />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gov-text-main)', marginBottom: '6px' }}>
                  {t.verify_btn}
                </h3>
                <p style={{ color: 'var(--gov-text-muted)', fontSize: '14px' }}>
                  Scan presence QR if you started on your phone
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PHONE OTP STEP */}
      {step === 'phone_otp' && (
        <div className="gov-card" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
          <Phone size={48} color="var(--gov-primary)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>{t.enter_phone}</h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            We verify patient identity securely via a 6-digit SMS OTP.
          </p>

          <div className="gov-input-group" style={{ textAlign: 'left' }}>
            <label>Mobile Number (10 Digits)</label>
            <input 
              type="tel"
              className="gov-input touch-target-lg"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={otpSent}
              autoFocus
            />
          </div>

          {!otpSent ? (
            <button 
              className="gov-btn gov-btn-primary gov-btn-lg" 
              style={{ width: '100%', marginTop: '8px' }}
              onClick={handleSendOtp}
              disabled={loading || phone.length < 10}
            >
              {loading ? 'Sending OTP via SMS...' : t.send_otp} <ArrowRight size={20} />
            </button>
          ) : (
            <>
              {otpNotice && (
                <div style={{ backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
                  ✓ {otpNotice}
                </div>
              )}

              <div className="gov-input-group" style={{ textAlign: 'left' }}>
                <label>Enter 6-Digit OTP received on SMS</label>
                <input 
                  type="text"
                  className="gov-input touch-target-lg"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '24px', fontWeight: '800' }}
                  autoFocus
                />
              </div>

              <button 
                className="gov-btn gov-btn-accent gov-btn-lg"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Verifying OTP...' : t.verify_otp} <CheckCircle2 size={20} />
              </button>

              <button 
                className="gov-btn gov-btn-outline" 
                style={{ width: '100%', marginTop: '10px', fontSize: '13px' }}
                onClick={() => { setOtpSent(false); setOtp(''); }}
              >
                Change Mobile Number / Resend OTP
              </button>
            </>
          )}
        </div>
      )}

      {/* 3. POST-OTP CHOICE: CONTINUE ON KIOSK VS CONTINUE ON PHONE (QR) */}
      {step === 'post_otp_choice' && (
        <div className="gov-card" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
          <CheckCircle2 size={52} color="var(--status-green)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--gov-primary)', marginBottom: '8px' }}>
            Mobile Identity Verified (+91-{phone})
          </h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '32px', fontSize: '15px' }}>
            {t.choice_title}
          </p>

          <div className="kiosk-action-cards" style={{ marginTop: 0 }}>
            {/* Option A: Kiosk Screen */}
            <div 
              className="kiosk-card-btn primary" 
              onClick={() => setStep('abha')}
              style={{ padding: '32px 20px' }}
            >
              <Tablet size={44} />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>
                  {t.choice_kiosk}
                </h3>
                <p style={{ fontSize: '13px', opacity: 0.9 }}>
                  {t.choice_kiosk_desc}
                </p>
              </div>
            </div>

            {/* Option B: Scannable Personal Phone QR */}
            <div 
              className="kiosk-card-btn" 
              onClick={() => setStep('phone_qr_display')}
              style={{ padding: '32px 20px', borderColor: 'var(--gov-accent)' }}
            >
              <Smartphone size={44} color="var(--gov-accent)" />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gov-text-main)', marginBottom: '6px' }}>
                  {t.choice_phone}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                  {t.choice_phone_desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. REAL PHONE QR DISPLAY (ANY CAMERA / GOOGLE LENS OPENS URL) */}
      {step === 'phone_qr_display' && (
        <div className="gov-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '36px 24px' }}>
          <Smartphone size={48} color="var(--gov-accent)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gov-primary)', marginBottom: '8px' }}>
            {t.scan_phone_title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--gov-text-muted)', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px' }}>
            {t.scan_phone_sub}
          </p>

          {/* Real High-Res QR Code SVG */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '16px', display: 'inline-block', boxShadow: 'var(--shadow-md)', border: '3px solid var(--gov-primary)', marginBottom: '20px' }}>
            <QRCodeSVG 
              value={mobileIntakeUrl} 
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>

          <div style={{ backgroundColor: 'var(--gov-primary-light)', padding: '12px 16px', borderRadius: '8px', maxWidth: '480px', margin: '0 auto 24px', fontSize: '12px', color: 'var(--gov-primary)', wordBreak: 'break-all' }}>
            <b>Direct URL:</b> {mobileIntakeUrl}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="gov-btn gov-btn-outline" onClick={() => setStep('post_otp_choice')}>
              Back
            </button>
            <button className="gov-btn gov-btn-primary" onClick={resetKiosk}>
              Done / Return to Idle Screen
            </button>
          </div>
        </div>
      )}

      {/* 5. ABHA STEP ON KIOSK */}
      {step === 'abha' && (
        <div className="gov-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <Sparkles size={48} color="var(--gov-accent)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>{t.abha_title}</h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px', fontSize: '14px' }}>{t.abha_sub}</p>

          <div className="gov-input-group" style={{ textAlign: 'left' }}>
            <label>ABHA Address / 14-Digit Number</label>
            <input 
              type="text" 
              className="gov-input touch-target-lg"
              placeholder="e.g. 91-8844-3322-1100 or username@abdm"
              value={abhaId}
              onChange={(e) => setAbhaId(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button 
              className="gov-btn gov-btn-outline gov-btn-lg" 
              style={{ flex: 1 }}
              onClick={() => setStep('dept_select')}
            >
              {t.abha_skip}
            </button>
            <button 
              className="gov-btn gov-btn-primary gov-btn-lg" 
              style={{ flex: 1.2 }}
              onClick={() => setStep('dept_select')}
            >
              {t.abha_save} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 6. DEPARTMENT SELECTION (OPTIONAL) */}
      {step === 'dept_select' && (
        <div className="gov-card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>{t.dept_title}</h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px', fontSize: '14px' }}>{t.dept_sub}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div 
              className="kiosk-opt-btn"
              onClick={() => startIntakeOnKiosk('dept-0002')} // AYUSH
              style={{ padding: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
            >
              <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--gov-primary)' }}>
                🌿 AYUSH (Ayurveda & Panchakarma)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                Prakriti, Dosha balance, Joint stiffness & Classical remedies
              </div>
            </div>

            <div 
              className="kiosk-opt-btn"
              onClick={() => startIntakeOnKiosk('dept-0001')} // General Medicine
              style={{ padding: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}
            >
              <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--gov-primary)' }}>
                🩺 General Medicine OPD
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                Fever, Chest pain, Blood Pressure, Diabetes & Infections
              </div>
            </div>
          </div>

          <button 
            className="gov-btn gov-btn-accent gov-btn-lg"
            style={{ width: '100%' }}
            onClick={() => startIntakeOnKiosk(null)} // Null = Auto-route triage
          >
            {t.dept_skip} <ArrowRight size={20} />
          </button>
        </div>
      )}

      {/* 7. INTAKE DECISION TREE ON KIOSK */}
      {step === 'intake' && currentNode && (
        <div>
          <div className="kiosk-question-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="status-badge waiting">
                Question Node: {currentNode.id}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="gov-btn gov-btn-outline gov-btn-sm"
                  onClick={handleSpeakQuestion}
                  title="Read question aloud (Audio TTS)"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
                >
                  <Volume2 size={14} color="var(--gov-accent)" />
                  <span>Listen</span>
                </button>
                <span style={{ fontSize: '14px', color: 'var(--gov-text-muted)', fontWeight: '600' }}>
                  Question {responses.length + 1}
                </span>
              </div>
            </div>

            <h2 className="kiosk-question-title">
              {currentNode.question?.[currentLang] || currentNode.question?.en}
            </h2>
            {currentNode.help_text && (
              <p className="kiosk-question-sub">
                {currentNode.help_text?.[currentLang] || currentNode.help_text?.en}
              </p>
            )}

            <div className="kiosk-options-grid">
              {currentNode.options?.map((opt) => (
                <button
                  key={opt.id}
                  className="kiosk-opt-btn"
                  onClick={() => handleAnswer(opt.id)}
                  disabled={loading}
                >
                  <span>{opt.label?.[currentLang] || opt.label?.en}</span>
                  <ArrowRight size={22} color="var(--gov-primary)" />
                </button>
              ))}
            </div>

            <div className="kiosk-voice-control">
              <p style={{ fontWeight: '700', marginBottom: '16px', color: 'var(--gov-text-main)' }}>
                {t.voice_prompt}
              </p>
              <button 
                className={`voice-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleVoiceInput}
                disabled={isRecording || loading}
                title="Voice Input (Speech Recognition + AI)"
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '700', color: 'var(--gov-accent)' }}>
                {isRecording ? t.voice_listening : t.voice_record}
              </div>
              {voiceNotice && (
                <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--gov-text-muted)' }}>
                  {voiceNotice}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. COMPLETED STEP */}
      {step === 'completed' && issuedToken && (
        <div className="gov-card" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}>
          <CheckCircle2 size={64} color="var(--status-green)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--gov-primary)', marginBottom: '8px' }}>
            {t.intake_done}
          </h2>
          <p style={{ color: 'var(--gov-text-muted)', marginBottom: '24px' }}>
            {t.proceed_msg}
          </p>

          <div style={{ backgroundColor: 'var(--gov-primary-light)', padding: '24px', borderRadius: '16px', margin: '24px 0', border: '2px solid #B9D5FF' }}>
            <span style={{ fontSize: '13px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--gov-text-muted)' }}>
              {t.token_issued}
            </span>
            <div style={{ fontSize: '64px', fontWeight: '900', color: 'var(--gov-primary)', lineHeight: 1.1 }}>
              #{issuedToken.token_number}
            </div>
            {issuedToken.room_number && (
              <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800', color: 'var(--gov-accent)' }}>
                Assigned: {issuedToken.room_number}
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '14px', color: 'var(--status-green)', fontWeight: '700' }}>
              ✓ Kiosk Presence Verified • Added to Live Doctor Queue
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
            <button 
              className="gov-btn gov-btn-accent gov-btn-lg"
              onClick={() => setShowReceiptSlip(true)}
              style={{ flex: 1 }}
            >
              <Printer size={20} /> Print Official OPD Slip
            </button>
          </div>

          <button className="gov-btn gov-btn-primary gov-btn-lg" onClick={resetKiosk} style={{ width: '100%' }}>
            Finish & Return to Home Screen
          </button>
        </div>
      )}

      {/* OPD Receipt Slip Modal */}
      {showReceiptSlip && (
        <OpdReceiptSlip 
          token={issuedToken}
          hospitalName={currentHospital?.name}
          onClose={() => setShowReceiptSlip(false)}
        />
      )}

      {/* ABHA Card Modal */}
      {showAbhaModal && (
        <AbhaCardModal 
          abhaId={abhaId}
          patientPhone={phone}
          onClose={() => setShowAbhaModal(false)}
        />
      )}

      {/* 9. KIOSK PRESENCE VERIFICATION QR MODAL */}
      {step === 'kiosk_presence_qr' && kioskVerification && (
        <div className="gov-modal-overlay">
          <div className="gov-modal-content" style={{ textAlign: 'center' }}>
            <QrCode size={52} color="var(--gov-primary)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--gov-primary)', marginBottom: '8px' }}>
              Hospital Physical Presence Verification
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--gov-text-muted)', marginBottom: '20px' }}>
              Scan this QR or enter the code on your phone session to confirm physical presence at the hospital.
            </p>

            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', display: 'inline-block', border: '3px solid var(--gov-primary)', marginBottom: '16px' }}>
              <QRCodeSVG 
                value={`PRESENCE:${kioskVerification.code}`} 
                size={180}
                level="M"
              />
              <div style={{ fontSize: '22px', fontWeight: '900', letterSpacing: '3px', color: 'var(--gov-accent)', marginTop: '8px' }}>
                {kioskVerification.code}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginBottom: '20px' }}>
              Valid for 5 minutes • Single-use presence proof
            </p>

            <button className="gov-btn gov-btn-outline" onClick={() => setStep('idle')} style={{ width: '100%' }}>
              Close QR Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
