import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Staff User State
  const [staffToken, setStaffToken] = useState(() => localStorage.getItem('medikiosk_staff_token'));
  const [staffUser, setStaffUser] = useState(() => {
    const saved = localStorage.getItem('medikiosk_staff_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Patient Session State
  const [patientToken, setPatientToken] = useState(() => localStorage.getItem('medikiosk_patient_token'));
  const [patientSession, setPatientSession] = useState(() => {
    const saved = localStorage.getItem('medikiosk_patient_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [patientData, setPatientData] = useState(() => {
    const saved = localStorage.getItem('medikiosk_patient_data');
    return saved ? JSON.parse(saved) : null;
  });

  // Selected Hospital (Default or Chosen)
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(() => localStorage.getItem('medikiosk_hospital_id') || '');

  // Fetch public hospitals on mount
  useEffect(() => {
    api.get('/hospitals/public')
      .then(list => {
        setHospitals(list);
        if (list.length > 0 && !selectedHospitalId) {
          setSelectedHospitalId(list[0].id);
          localStorage.setItem('medikiosk_hospital_id', list[0].id);
        }
      })
      .catch(err => console.log('Hospitals fetch error:', err.message));
  }, []);

  const selectHospital = (id) => {
    setSelectedHospitalId(id);
    localStorage.setItem('medikiosk_hospital_id', id);
  };

  // Staff Login & Logout
  const loginStaff = async (email, password) => {
    const data = await api.post('/auth/staff/login', { email, password });
    setStaffToken(data.token);
    setStaffUser(data.user);
    localStorage.setItem('medikiosk_staff_token', data.token);
    localStorage.setItem('medikiosk_staff_user', JSON.stringify(data.user));
    if (data.user.hospital_id) {
      selectHospital(data.user.hospital_id);
    }
    return data;
  };

  const logoutStaff = () => {
    setStaffToken(null);
    setStaffUser(null);
    localStorage.removeItem('medikiosk_staff_token');
    localStorage.removeItem('medikiosk_staff_user');
  };

  // Patient OTP Login & Logout
  const verifyPatientOtp = async (phone, otp, isKiosk = false, languagePref = 'en') => {
    const data = await api.post('/auth/patient/verify-otp', {
      hospital_id: selectedHospitalId,
      phone,
      otp,
      is_kiosk: isKiosk,
      language_pref: languagePref
    });

    setPatientToken(data.token);
    setPatientSession(data.session);
    setPatientData(data.patient);

    localStorage.setItem('medikiosk_patient_token', data.token);
    localStorage.setItem('medikiosk_patient_session', JSON.stringify(data.session));
    localStorage.setItem('medikiosk_patient_data', JSON.stringify(data.patient));

    return data;
  };

  const updatePatientSessionVerified = (isVerified) => {
    if (patientSession) {
      const updated = { ...patientSession, is_kiosk_verified: isVerified };
      setPatientSession(updated);
      localStorage.setItem('medikiosk_patient_session', JSON.stringify(updated));
    }
  };

  const logoutPatient = () => {
    setPatientToken(null);
    setPatientSession(null);
    setPatientData(null);
    localStorage.removeItem('medikiosk_patient_token');
    localStorage.removeItem('medikiosk_patient_session');
    localStorage.removeItem('medikiosk_patient_data');
  };

  return (
    <AuthContext.Provider value={{
      hospitals,
      selectedHospitalId,
      selectHospital,
      staffToken,
      staffUser,
      loginStaff,
      logoutStaff,
      patientToken,
      patientSession,
      patientData,
      verifyPatientOtp,
      updatePatientSessionVerified,
      logoutPatient
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
