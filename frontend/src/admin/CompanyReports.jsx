import React, { useState } from 'react';
import { FileSpreadsheet, Download, Filter, Loader2, Info } from 'lucide-react';

const CompanyReports = () => {
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [downloading, setDownloading] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const downloadUrl = `${apiBaseUrl}/api/admin/export-csv?quarter=${selectedQuarter}`;
      
      // Fetching report dataset as blob file stream securely bro
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("Export transmission failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Explicit DOM execution anchor to trigger silent download
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `atomberg_performance_report_${selectedQuarter}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      
      // Cleanup DOM nodes completely bro
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV Engine Download breakdown:", err);
      alert("Failed to export performance report file data. Verify database pooling channels.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: '0 0 0.3rem 0', color: '#111827', fontSize: '1.8rem', fontWeight: '800' }}>Company Reporting Hub</h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Extract macro performance metrics, goal metrics, and operational verification snapshots.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        
        {/* LEFT CARD: EXPORT CONTROLLER ENGINE */}
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#111827', fontWeight: '800', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileSpreadsheet color="var(--atomberg-yellow)" size={24} /> Export Raw KPI Ledger
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: '1.6', marginBottom: '2rem' }}>
              Select the operational evaluation cycle below to compile all objective titles, employee data fields, lock validation properties, targets, and manager assessments into a consolidated standard ledger.
            </p>

            {/* Quarter Filter Selection UI Container */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontWeight: '700', fontSize: '0.9rem' }}>
                <Filter size={16} color="#6B7280" /> Select Performance Cycle:
              </div>
              <select 
                value={selectedQuarter} 
                onChange={(e) => setSelectedQuarter(e.target.value)}
                style={{ border: '1px solid #D1D5DB', background: '#FFFFFF', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '700', color: '#111827', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Q1">Q1 Performance Cycle</option>
                <option value="Q2">Q2 Performance Cycle</option>
                <option value="Q3">Q3 Performance Cycle</option>
                <option value="Q4">Q4 Performance Cycle</option>
              </select>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button 
            onClick={handleDownloadCSV}
            disabled={downloading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', background: 'var(--atomberg-yellow)', color: '#000000', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: '800', fontSize: '1rem', cursor: downloading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)', opacity: downloading ? 0.7 : 1 }}
          >
            {downloading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={20} />}
            {downloading ? 'Compiling Dataset Rows...' : `Download ${selectedQuarter} Report (CSV)`}
          </button>
        </div>

        {/* RIGHT CARD: EXPORT FIELD MANIFEST AUDIT CHECKLIST */}
        <div style={{ background: '#F9FAFB', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '2rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#374151', fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="#1D4ED8" /> Export Columns Schema Audit
          </h4>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: '1.5', marginBottom: '1.2rem' }}>
            The downloadable Microsoft Excel/CSV file will assemble the matching live parameters across tables:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Employee Baseline Info (ID, Name, Registered Work Email)',
              'Organizational Reporting Manager Assignment Links',
              'Goal Metric Attributes (Thrust Area, KPI Title, Target Parameters)',
              'Operational Unit of Measurement (UOM) & Assigned Weights',
              'Employee Progress Records (Actual Achievements, Status)',
              'Manager Verification Signatures (Approval Locks & Reviews)'
            ].map((column, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: '#4B5563', lineHeight: '1.4' }}>
                <span style={{ color: '#059669', fontWeight: '900' }}>✓</span>
                <span>{column}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default CompanyReports;