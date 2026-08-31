import React, { useState } from 'react';
import questionTrees from '../data/questionTrees.json';

export default function VoiceTouchInterview({ department, onComplete }) {
  const treeKey = department === 'ayush' ? 'ayush_opd' : 'general_opd';
  const currentTree = questionTrees[treeKey] || questionTrees['general_opd'];
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');

  const currentQ = currentTree.questions[currentStep];

  const handleSelectOption = (opt) => {
    const updated = { ...answers, [currentQ.id]: opt };
    setAnswers(updated);
    if (currentStep < currentTree.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(updated);
    }
  };

  const toggleVoiceRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setAudioTranscript('Listening in Hindi-English... ("Mujhe 3 din se bukhar aur gale me dard hai")');
      setTimeout(() => {
        setIsRecording(false);
        handleSelectOption("Fever with throat pain (Voice Extracted)");
      }, 3000);
    }
  };

  return (
    <div className="neo-card" style={{ padding: '30px', maxWidth: '800px', margin: '20px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <span className="badge-tag" style={{ background: 'var(--sih-orange)', color: 'white' }}>
          {currentTree.name}
        </span>
        <span className="badge-tag" style={{ background: 'var(--neo-yellow)' }}>
          Question {currentStep + 1} of {currentTree.questions.length}
        </span>
      </div>

      <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.5rem', marginBottom: '6px' }}>
        {currentQ.prompt_en}
      </h3>
      <p style={{ fontSize: '1.1rem', color: '#555', fontWeight: 600, marginBottom: '25px' }}>
        {currentQ.prompt_hi}
      </p>

      {/* Voice Assistant Button */}
      <div style={{
        background: '#FFFDF6',
        border: '3.5px solid #000',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center',
        marginBottom: '25px'
      }}>
        <button
          onClick={toggleVoiceRecording}
          className={`neo-btn ${isRecording ? 'pulse-animation' : 'btn-orange'}`}
          style={{ background: isRecording ? '#FF4785' : 'var(--sih-orange)', color: 'white' }}
        >
          {isRecording ? '🛑 Recording Voice Input...' : '🎙️ Speak Answer (Hindi / English Code-Switch)'}
        </button>
        {audioTranscript && (
          <p style={{ marginTop: '12px', fontWeight: 700, color: 'var(--sih-blue)', fontFamily: 'JetBrains Mono, monospace' }}>
            {audioTranscript}
          </p>
        )}
      </div>

      {/* Touch Options Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', color: '#666' }}>
          Or Select using Touchscreen:
        </p>
        {currentQ.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectOption(opt)}
            className="neo-btn btn-yellow"
            style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '14px 20px' }}
          >
            👉 {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
