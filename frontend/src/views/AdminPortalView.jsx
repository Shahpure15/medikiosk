import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ShieldCheck, Building, Users, Lock, Calendar, 
  Check, X, Plus, AlertCircle, Sparkles, Building2, Settings, QrCode, LogOut,
  BarChart3, TrendingUp, Clock, Activity, ArrowUpRight
} from 'lucide-react';
import '../styles/admin.css';

export default function AdminPortalView() {
  const { staffUser, staffToken, loginStaff, logoutStaff, selectedHospitalId } = useAuth();

  // Login form if not logged in
  const [email, setEmail] = useState('admin@civildistrict.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active Tab: 'analytics' | 'settings' | 'departments' | 'staff' | 'rooms' | 'rbac' | 'requests' | 'superadmin'
  const [activeTab, setActiveTab] = useState('analytics');

  // Quick 1-Click Login
  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Password@123');
    loginStaff(roleEmail, 'Password@123').catch(err => setAuthError(err.message));
  };

  // Hospital Settings State
  const [hospitalSettings, setHospitalSettings] = useState(null);
  const [presenceRequired, setPresenceRequired] = useState(true);
  const [regMode, setRegMode] = useState('admin_creates');

  // Data states
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [rbacMatrix, setRbacMatrix] = useState(null);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRoleId, setNewStaffRoleId] = useState('');
  const [newStaffDeptId, setNewStaffDeptId] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('Password@123');

  // Room Assignment Form
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [assignRoomNum, setAssignRoomNum] = useState('Room 108');

  // Super Admin Hospital Form
  const [newHospName, setNewHospName] = useState('');
  const [newHospRegMode, setNewHospRegMode] = useState('admin_creates');
  const [newHospPresence, setNewHospPresence] = useState(true);
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newHospPhone, setNewHospPhone] = useState('');

  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (staffToken) {
      loadTabData(activeTab);
    }
  }, [staffToken, activeTab, selectedHospitalId]);

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

  const loadTabData = async (tab) => {
    try {
      if (tab === 'settings') {
        const data = await api.get('/admin/hospital-settings', staffToken);
        setHospitalSettings(data);
        setPresenceRequired(data.physical_presence_required !== false);
        setRegMode(data.registration_mode || 'admin_creates');
      } else if (tab === 'departments') {
        const data = await api.get('/admin/departments', staffToken);
        setDepartments(data);
      } else if (tab === 'staff') {
        const [staffData, rolesData, deptsData] = await Promise.all([
          api.get('/admin/staff', staffToken),
          api.get('/admin/roles', staffToken),
          api.get('/admin/departments', staffToken)
        ]);
        setStaffList(staffData);
        setRoles(rolesData);
        setDepartments(deptsData);
      } else if (tab === 'rooms') {
        const [roomsData, staffData] = await Promise.all([
          api.get('/admin/room-assignments', staffToken),
          api.get('/admin/staff', staffToken)
        ]);
        setRoomAssignments(roomsData);
        setStaffList(staffData);
      } else if (tab === 'rbac') {
        const data = await api.get('/admin/permissions-matrix', staffToken);
        setRbacMatrix(data);
      } else if (tab === 'requests') {
        const data = await api.get('/admin/registration-requests', staffToken);
        setRegistrationRequests(data);
      } else if (tab === 'superadmin') {
        const data = await api.get('/admin/superadmin/hospitals', staffToken);
        setHospitals(data);
      }
    } catch (err) {
      console.log('Error loading admin tab:', err.message);
    }
  };

  // Save Hospital Settings (Physical Presence & Registration Mode)
  const handleSaveHospitalSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/admin/hospital-settings', {
        physical_presence_required: presenceRequired,
        registration_mode: regMode
      }, staffToken);
      setHospitalSettings(res.hospital);
      setNotice('Hospital configuration updated successfully!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      await api.post('/admin/departments', { name: newDeptName }, staffToken);
      setNewDeptName('');
      setNotice('Department added successfully!');
      loadTabData('departments');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', {
        name: newStaffName,
        email: newStaffEmail,
        phone: newStaffPhone,
        role_id: newStaffRoleId,
        department_id: newStaffDeptId || null,
        password: newStaffPassword
      }, staffToken);

      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNotice('Staff user created successfully!');
      loadTabData('staff');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Set Daily Room Assignment
  const handleAssignRoom = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !assignRoomNum) return;
    try {
      await api.post('/admin/room-assignments', {
        doctor_id: selectedDoctorId,
        room_number: assignRoomNum
      }, staffToken);
      setNotice('Doctor room assigned for today!');
      loadTabData('rooms');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Super Admin: Create Hospital
  const handleCreateHospital = async (e) => {
    e.preventDefault();
    if (!newHospName) return;
    try {
      await api.post('/admin/superadmin/hospitals', {
        name: newHospName,
        registration_mode: newHospRegMode,
        physical_presence_required: newHospPresence,
        address: newHospAddress,
        contact_phone: newHospPhone
      }, staffToken);
      setNewHospName('');
      setNewHospAddress('');
      setNewHospPhone('');
      setNotice('New Hospital provisioned on the platform!');
      loadTabData('superadmin');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!staffToken) {
    return (
      <div style={{ maxWidth: '520px', margin: '50px auto', padding: '0 16px' }}>
        <div className="gov-card">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <ShieldCheck size={48} color="var(--gov-primary)" style={{ margin: '0 auto 8px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Admin Portal Login</h2>
            <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
              Hospital Administration & Super Admin Portal
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
                onClick={() => handleQuickLogin('admin@civildistrict.gov.in')}
              >
                <span>Hospital Admin</span>
                <ArrowUpRight size={14} color="var(--gov-accent)" />
              </button>
              <button 
                type="button" 
                className="gov-btn gov-btn-outline gov-btn-sm" 
                style={{ textAlign: 'left', fontSize: '12px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => handleQuickLogin('superadmin@medikiosk.gov.in')}
              >
                <span>Super Admin</span>
                <ArrowUpRight size={14} color="var(--gov-accent)" />
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="gov-input-group">
              <label>Admin Email</label>
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
              {authLoading ? 'Authenticating...' : 'Sign In to Admin Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isSuperAdmin = staffUser?.hospital_id === null;

  return (
    <div className="admin-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gov-primary)' }}>
            Hospital Administration Portal
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
            {staffUser?.hospital_name || 'Central Platform'} • Logged in as: {staffUser?.name}
          </p>
        </div>

        <button className="gov-btn gov-btn-outline gov-btn-sm" onClick={logoutStaff}>
          <LogOut size={14} /> Sign Out Admin
        </button>
      </div>

      {notice && (
        <div style={{ backgroundColor: 'var(--status-green-bg)', color: 'var(--status-green)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '700' }}>
          ✓ {notice}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button 
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} /> OPD Analytics & Footfall
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Hospital Rules & Presence
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building size={16} /> Departments ({departments.length})
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <Users size={16} /> Staff & Roles ({staffList.length})
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          <Calendar size={16} /> Daily Room Assignments
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'rbac' ? 'active' : ''}`}
          onClick={() => setActiveTab('rbac')}
        >
          <Lock size={16} /> Dynamic RBAC Matrix
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <ShieldCheck size={16} /> Self-Register Requests
        </button>

        {isSuperAdmin && (
          <button 
            className={`admin-tab-btn ${activeTab === 'superadmin' ? 'active' : ''}`}
            onClick={() => setActiveTab('superadmin')}
            style={{ color: 'var(--gov-accent)' }}
          >
            <Building2 size={16} /> Super Admin Platform
          </button>
        )}
      </div>

      {/* TAB -1: OPD ANALYTICS & FOOTFALL DASHBOARD */}
      {activeTab === 'analytics' && (
        <div>
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div className="gov-card" style={{ padding: '20px', borderLeft: '4px solid var(--gov-primary)' }}>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Today's OPD Footfall
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gov-primary)', marginTop: '4px' }}>
                142
              </div>
              <div style={{ fontSize: '12px', color: 'var(--status-green)', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={14} /> +18% vs Yesterday
              </div>
            </div>

            <div className="gov-card" style={{ padding: '20px', borderLeft: '4px solid var(--gov-accent)' }}>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Active in Queue
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gov-accent)', marginTop: '4px' }}>
                14
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginTop: '4px' }}>
                4 in active consultation
              </div>
            </div>

            <div className="gov-card" style={{ padding: '20px', borderLeft: '4px solid #16A34A' }}>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Avg Waiting Time
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#16A34A', marginTop: '4px' }}>
                11 min
              </div>
              <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: '700', marginTop: '4px' }}>
                ✓ Below 15 min SLA Target
              </div>
            </div>

            <div className="gov-card" style={{ padding: '20px', borderLeft: '4px solid #7C3AED' }}>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Completed Prescriptions
              </div>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#7C3AED', marginTop: '4px' }}>
                128
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gov-text-muted)', marginTop: '4px' }}>
                100% ABHA Linked
              </div>
            </div>
          </div>

          {/* Department Breakdown & Hourly Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Dept Ratio */}
            <div className="gov-card">
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} /> Department Footfall Distribution
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                  <span>🌿 AYUSH (Ayurveda & Panchakarma)</span>
                  <span>46% (65 Patients)</span>
                </div>
                <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '46%', height: '100%', backgroundColor: '#16A34A', borderRadius: '5px' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                  <span>🩺 General Medicine OPD</span>
                  <span>34% (48 Patients)</span>
                </div>
                <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '34%', height: '100%', backgroundColor: 'var(--gov-primary)', borderRadius: '5px' }}></div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                  <span>🦴 Orthopedics & Joint Care</span>
                  <span>12% (17 Patients)</span>
                </div>
                <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '12%', height: '100%', backgroundColor: 'var(--gov-accent)', borderRadius: '5px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                  <span>👶 Pediatrics & ENT OPD</span>
                  <span>8% (12 Patients)</span>
                </div>
                <div style={{ height: '10px', backgroundColor: '#E2E8F0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '8%', height: '100%', backgroundColor: '#64748B', borderRadius: '5px' }}></div>
                </div>
              </div>
            </div>

            {/* Peak Hours Heatmap */}
            <div className="gov-card">
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Peak Footfall Hours (08:00 - 14:00)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { time: '08:00 - 09:00', count: 18, pct: '35%' },
                  { time: '09:00 - 10:00 (Peak)', count: 42, pct: '85%', peak: true },
                  { time: '10:00 - 11:00 (Peak)', count: 48, pct: '95%', peak: true },
                  { time: '11:00 - 12:00', count: 24, pct: '50%' },
                  { time: '12:00 - 13:00', count: 10, pct: '20%' }
                ].map((slot, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>
                      <span>{slot.time}</span>
                      <span style={{ color: slot.peak ? '#DC2626' : 'var(--gov-text-muted)' }}>{slot.count} arrivals</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: slot.pct, height: '100%', backgroundColor: slot.peak ? '#DC2626' : 'var(--gov-primary)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Doctor Performance Table */}
          <div className="gov-card">
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '16px' }}>
              Doctor Consultation Throughput (Today)
            </h3>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Medical Officer / Doctor</th>
                  <th>Assigned Room</th>
                  <th>Department</th>
                  <th>Patients Seen</th>
                  <th>Avg Consult Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '700' }}>Vaidya Ananya Deshmukh (BAMS, MD)</td>
                  <td>Room 102</td>
                  <td>AYUSH</td>
                  <td>42</td>
                  <td>8.5 mins</td>
                  <td><span className="status-badge active">In Consult</span></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700' }}>Dr. Vikramaditya Verma (MBBS, MD)</td>
                  <td>Room 105</td>
                  <td>General Medicine</td>
                  <td>48</td>
                  <td>6.8 mins</td>
                  <td><span className="status-badge active">In Consult</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 0: HOSPITAL RULES & PHYSICAL PRESENCE TOGGLE */}
      {activeTab === 'settings' && (
        <div className="gov-card" style={{ maxWidth: '800px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} /> Hospital Queue & Presence Configuration
          </h3>

          <form onSubmit={handleSaveHospitalSettings}>
            {/* Physical Presence Toggle */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--gov-border)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <input 
                  type="checkbox" 
                  id="presence-toggle"
                  checked={presenceRequired}
                  onChange={(e) => setPresenceRequired(e.target.checked)}
                  style={{ width: '22px', height: '22px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--gov-primary)' }}
                />
                <div>
                  <label htmlFor="presence-toggle" style={{ fontWeight: '800', fontSize: '16px', color: 'var(--gov-text-main)', cursor: 'pointer' }}>
                    Require Physical Kiosk Presence (QR Code Scan) for Remote Registrations
                  </label>
                  <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                    • <b>Enabled:</b> Patients who start their intake remotely on their mobile phones must scan the Kiosk QR code upon physical arrival at the hospital before they are issued an OPD queue token.<br />
                    • <b>Disabled:</b> Patients can complete intake and directly join the doctor queue from anywhere remotely without kiosk scanning.
                  </p>
                </div>
              </div>
            </div>

            {/* Staff Registration Mode */}
            <div className="gov-input-group">
              <label>Staff Registration Mode</label>
              <select className="gov-input" value={regMode} onChange={e => setRegMode(e.target.value)}>
                <option value="admin_creates">Admin Creates Staff Directly</option>
                <option value="self_register_approval">Self-Registration with Admin Approval</option>
              </select>
            </div>

            <button type="submit" className="gov-btn gov-btn-primary gov-btn-lg" style={{ marginTop: '12px' }}>
              <Check size={18} /> Save Hospital Configuration
            </button>
          </form>
        </div>
      )}

      {/* TAB 1: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-primary)' }}>
              Add New OPD Department
            </h3>
            <form onSubmit={handleCreateDepartment} style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text"
                className="gov-input"
                placeholder="Department Name (e.g. Ophthalmology / Eye OPD)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                required
              />
              <button type="submit" className="gov-btn gov-btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Add Department
              </button>
            </form>
          </div>

          <table className="gov-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: '600' }}>{d.name}</td>
                  <td>
                    <span className="status-badge completed" style={{ fontSize: '11px' }}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="gov-btn gov-btn-outline gov-btn-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: STAFF & ROLES */}
      {activeTab === 'staff' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-primary)' }}>
              Provision New Staff Account
            </h3>
            <form onSubmit={handleCreateStaff}>
              <div className="grid-2">
                <div className="gov-input-group">
                  <label>Full Name</label>
                  <input type="text" className="gov-input" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label>Email Address</label>
                  <input type="email" className="gov-input" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label>Phone Number</label>
                  <input type="tel" className="gov-input" value={newStaffPhone} onChange={e => setNewStaffPhone(e.target.value)} />
                </div>
                <div className="gov-input-group">
                  <label>Assign Dynamic Role</label>
                  <select className="gov-input" value={newStaffRoleId} onChange={e => setNewStaffRoleId(e.target.value)} required>
                    <option value="">Select Role...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="gov-input-group">
                  <label>Department (Optional for Doctors)</label>
                  <select className="gov-input" value={newStaffDeptId} onChange={e => setNewStaffDeptId(e.target.value)}>
                    <option value="">None / General</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="gov-input-group">
                  <label>Initial Password</label>
                  <input type="text" className="gov-input" value={newStaffPassword} onChange={e => setNewStaffPassword(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="gov-btn gov-btn-primary" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Create Staff Account
              </button>
            </form>
          </div>

          <table className="gov-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email / Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '600' }}>{u.name}</td>
                  <td><span className="status-badge waiting" style={{ fontSize: '11px' }}>{u.role_name || 'Staff'}</span></td>
                  <td>{u.department_name || '—'}</td>
                  <td>{u.email}</td>
                  <td><span className="status-badge completed" style={{ fontSize: '11px' }}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: DAILY ROOM ASSIGNMENTS */}
      {activeTab === 'rooms' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-primary)' }}>
              Set Daily Doctor Room Assignment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)', marginBottom: '16px' }}>
              Rooms change day to day based on rotations. The system dynamically pulls today's assignment when calling patients.
            </p>

            <form onSubmit={handleAssignRoom} style={{ display: 'flex', gap: '12px' }}>
              <select className="gov-input" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} required>
                <option value="">Select Doctor...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.department_name || 'OPD'})</option>
                ))}
              </select>

              <input 
                type="text" 
                className="gov-input" 
                placeholder="Room Number (e.g. Room 102)"
                value={assignRoomNum}
                onChange={e => setAssignRoomNum(e.target.value)}
                required
              />

              <button type="submit" className="gov-btn gov-btn-accent" style={{ whiteSpace: 'nowrap' }}>
                Save Assignment
              </button>
            </form>
          </div>

          <table className="gov-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Department</th>
                <th>Assigned Room for Today</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {roomAssignments.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '600' }}>{r.doctor_name}</td>
                  <td>{r.department_name || '—'}</td>
                  <td><span className="status-badge priority">{r.room_number}</span></td>
                  <td>{r.assignment_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: DYNAMIC RBAC PERMISSION MATRIX */}
      {activeTab === 'rbac' && rbacMatrix && (
        <div>
          <div className="gov-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gov-primary)', marginBottom: '6px' }}>
              Dynamic Role × Module × Action Permission Matrix
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gov-text-muted)' }}>
              Roles and permissions are fully dynamic data tables in PostgreSQL. Zero hardcoded role strings in codebase.
            </p>
          </div>

          <table className="gov-table">
            <thead>
              <tr>
                <th>Role</th>
                {rbacMatrix.modules?.map(m => (
                  <th key={m.id}>{m.key.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rbacMatrix.roles?.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{r.name}</td>
                  {rbacMatrix.modules?.map(m => {
                    const perms = rbacMatrix.permissions?.filter(p => p.role_id === r.id && p.module_key === m.key);
                    return (
                      <td key={m.id} style={{ fontSize: '12px' }}>
                        {perms && perms.length > 0 ? (
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {perms.map((p, idx) => (
                              <span key={idx} className="status-badge in_consult" style={{ padding: '2px 5px', fontSize: '10px' }}>
                                {p.action}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: SELF-REGISTER REQUESTS */}
      {activeTab === 'requests' && (
        <div>
          <table className="gov-table">
            <thead>
              <tr>
                <th>Applicant Name</th>
                <th>Requested Role</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {registrationRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gov-text-muted)', padding: '30px' }}>
                    No pending registration requests.
                  </td>
                </tr>
              ) : (
                registrationRequests.map(req => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: '600' }}>{req.name}</td>
                    <td>{req.requested_role_name}</td>
                    <td>{req.email} / {req.phone}</td>
                    <td><span className={`status-badge ${req.status}`}>{req.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="gov-btn gov-btn-primary gov-btn-sm">Approve</button>
                        <button className="gov-btn gov-btn-outline gov-btn-sm" style={{ color: 'var(--status-red)' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: SUPER ADMIN */}
      {activeTab === 'superadmin' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--gov-accent)' }}>
              Provision New Multi-Tenant Hospital
            </h3>
            <form onSubmit={handleCreateHospital}>
              <div className="grid-2">
                <div className="gov-input-group">
                  <label>Hospital / Clinic Name</label>
                  <input type="text" className="gov-input" placeholder="e.g. AIIMS Rishikesh AYUSH Wing" value={newHospName} onChange={e => setNewHospName(e.target.value)} required />
                </div>
                <div className="gov-input-group">
                  <label>Staff Registration Mode</label>
                  <select className="gov-input" value={newHospRegMode} onChange={e => setNewHospRegMode(e.target.value)}>
                    <option value="admin_creates">Admin Creates Staff Directly</option>
                    <option value="self_register_approval">Self-Register with Admin Approval</option>
                  </select>
                </div>
                <div className="gov-input-group">
                  <label>Address</label>
                  <input type="text" className="gov-input" value={newHospAddress} onChange={e => setNewHospAddress(e.target.value)} />
                </div>
                <div className="gov-input-group">
                  <label>Contact Phone</label>
                  <input type="tel" className="gov-input" value={newHospPhone} onChange={e => setNewHospPhone(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="gov-btn gov-btn-accent" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Provision Hospital Tenant
              </button>
            </form>
          </div>

          <table className="gov-table">
            <thead>
              <tr>
                <th>Hospital Name</th>
                <th>Registration Mode</th>
                <th>Address</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {hospitals.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: '700', color: 'var(--gov-primary)' }}>{h.name}</td>
                  <td><code>{h.registration_mode}</code></td>
                  <td>{h.address || '—'}</td>
                  <td>{h.contact_phone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
