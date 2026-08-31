import React, { useState, useEffect } from 'react';
import SummaryCard from './SummaryCard';
import TriageAlertBanner from './TriageAlertBanner';
import { getDoctorSummary } from '../services/api';

export default function DoctorDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getDoctorSummary('SESS-1029');
      setSummary(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Space Grotesk', fontSize: '1.5rem' }}>
        ⚡ Loading 30-Second Doctor Summary...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto', padding: '0 20px' }}>
      <TriageAlertBanner alert={summary.red_flags && summary.red_flags[0]} />
      <SummaryCard summary={summary} />
    </div>
  );
}
