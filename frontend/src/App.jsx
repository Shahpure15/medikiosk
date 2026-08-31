import React, { useState } from 'react';
import Navbar from './components/Navbar';
import PatientIntakeKiosk from './components/PatientIntakeKiosk';
import DocumentOCRUpload from './components/DocumentOCRUpload';
import DoctorDashboard from './components/DoctorDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('intake');

  return (
    <div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ paddingBottom: '50px' }}>
        {activeTab === 'intake' && <PatientIntakeKiosk />}
        {activeTab === 'ocr' && <DocumentOCRUpload />}
        {activeTab === 'doctor' && <DoctorDashboard />}
      </main>
    </div>
  );
}
