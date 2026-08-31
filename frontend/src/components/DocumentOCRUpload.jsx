import React, { useState } from 'react';
import { uploadDocumentOCR } from '../services/api';

export default function DocumentOCRUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const data = await uploadDocumentOCR(file);
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="neo-card" style={{ padding: '30px', maxWidth: '800px', margin: '20px auto' }}>
      <span className="badge-tag" style={{ background: 'var(--neo-purple)', color: 'white', marginBottom: '15px' }}>
        Google Vision OCR Engine
      </span>

      <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.8rem', marginTop: '10px', marginBottom: '10px' }}>
        Prescription & Lab Report Upload
      </h2>
      <p style={{ fontWeight: 600, color: '#444', marginBottom: '20px' }}>
        Upload handwritten Indian doctor prescriptions, discharge summaries, or blood lab reports for automated clinical entity extraction.
      </p>

      <div style={{
        border: '3.5px dashed #000',
        padding: '30px',
        borderRadius: '10px',
        background: '#FFFDF6',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <input type="file" onChange={handleFileChange} accept="image/*,.pdf" style={{ marginBottom: '15px' }} />
        {file && <p style={{ fontWeight: 700 }}>Selected: {file.name}</p>}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="neo-btn btn-orange"
        style={{ width: '100%' }}
      >
        {loading ? '⚡ Running Google Vision OCR & NER Extraction...' : '📄 Scan Document & Extract Clinical Entities'}
      </button>

      {result && (
        <div style={{
          marginTop: '25px',
          background: '#E2F1FF',
          border: '3px solid #000',
          padding: '20px',
          borderRadius: '10px'
        }}>
          <h4 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '1.2rem', marginBottom: '10px' }}>
            Extracted Clinical Data (Confidence Flagged):
          </h4>

          <div style={{ marginBottom: '10px' }}>
            <strong>Extracted Medicines:</strong>
            <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
              {result.extracted_entities.medicines.map((m, idx) => (
                <li key={idx}>
                  <strong>{m.name}</strong> ({m.dosage}) — <span className="badge-tag" style={{ background: '#00FF66' }}>Confidence: {(m.confidence * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <strong>Reported Allergies:</strong> {result.extracted_entities.allergies.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
