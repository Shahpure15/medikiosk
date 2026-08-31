import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import PatientIntakeKiosk from './components/PatientIntakeKiosk';
import DocumentOCRUpload from './components/DocumentOCRUpload';
import DoctorDashboard from './components/DoctorDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');

  return (
    <div>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ paddingBottom: '50px' }}>
        {activeTab === 'landing' && (
          <LandingPage onProceedToPrototype={() => setActiveTab('intake')} />
        )}
        {activeTab === 'intake' && <PatientIntakeKiosk />}
        {activeTab === 'ocr' && <DocumentOCRUpload />}
        {activeTab === 'doctor' && <DoctorDashboard />}
      </main>
    </div>
  );
}
